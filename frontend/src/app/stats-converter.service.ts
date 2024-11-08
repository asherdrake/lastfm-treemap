import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ChartStats, Scrobble, Artist, Album, ArtistCombo, AlbumCombo, Track, TopAlbum } from './items';
import { takeWhile, skip, mergeMap, scan, from, interval, of, forkJoin, Subject, catchError, tap, filter, Observable, map, combineLatest, take, shareReplay } from 'rxjs';
import { ScrobbleGetterService } from './scrobblegetter.service';
import { ScrobbleStorageService } from './scrobble-storage.service';
import { FiltersService, FilterState } from './filters.service';
import ColorThief from 'color-thief-ts';
import { CombineService } from './combine.service';

interface ArtistImages {
  [key: string]: [string, string]
}

interface AlbumImages {
  artists: {
    [key: string]: {
      [key: string]: string
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class StatsConverterService {
  filteredChartStats: Observable<ChartStats>;
  private _finishedChartStats: Observable<ChartStats>;
  private _finishedTopAlbums: Observable<TopAlbum[]>;
  private isActive = false;
  startDate: number = 0;
  endDate: number = 0;
  artistImageStorage: ArtistImages = {};
  albumImageStorage: AlbumImages = { artists: {} };
  missingArtists = new Set<string>();
  currentlyRetrieving = new Set<string>();
  imageProcessing;
  private resetTimer = new Subject<void>();
  imageProcessingComplete = new Subject<void>();
  artistCombinations: ArtistCombo[] = [];
  albumCombinations: AlbumCombo[] = [];
  //completed: Observable<ScrobbleState>;
  filterState: FilterState = {
    startDate: 0,
    endDate: Date.now(),
    minScrobbles: 0,
    numNodes: 0,
    showNames: false,
    showScrobbleCount: false,
    view: "Artists"
  };
  artistTotal: number = 0;
  loadingStatus: string = '';

  constructor(
    private router: Router,
    private storage: ScrobbleStorageService,
    private scrobbleGetterService: ScrobbleGetterService,
    private filters: FiltersService,
    private combineService: CombineService) {
    this.imageProcessing = this.storage.trackPageChunk.pipe(
      map(scrobbles => this.storeArtistImage(scrobbles)),
    ).subscribe();

    this.storage.artistImageStorage.subscribe({
      next: (artistImages) => {
        if (artistImages) {
          this.artistImageStorage = artistImages as ArtistImages;
          //console.log('artistImageStorage updated:', this.artistImageStorage);
        } else {
          console.warn('Received undefined artistImageStorage');
          //console.log('curr artistImageStorage:', this.artistImageStorage);
        }
      },
      error: (err) => {
        console.error('Error in artistImageStorage subscription:', err);
      }
    });

    this.storage.albumImageStorage.subscribe({
      next: (albumImages) => {
        if (albumImages) {
          this.albumImageStorage = albumImages as AlbumImages
          //console.log("albumImageStorage updated:", this.albumImageStorage);
        } else {
          console.warn('Received undefined albumImageStorage');
          //console.log("curr albumImageStorage:", this.albumImageStorage);
        }
      }
    })

    this.storage.artistCombos.subscribe({
      next: (combos) => {
        if (combos) {
          this.artistCombinations = combos;
          //console.log("artistCombinations updated:", this.artistCombinations);
        } else {
          console.warn('Received undefined artistCombinations');
          //console.log("curr artistCombinations:", this.artistCombinations);
        }
      }
    })

    this.storage.albumCombos.subscribe({
      next: (combos) => {
        if (combos) {
          this.albumCombinations = combos;
          //console.log("albumCombinations updated:", this.albumCombinations);
        } else {
          console.warn('Received undefined albumCombinations');
          //console.log("curr albumCombinations:", this.albumCombinations);
        }
      }
    })

    this.storage.state$.pipe(filter(state => state.state === "FINISHED"))
      .subscribe({ next: () => this.loadingStatus = 'FINISHED' });

    let emitCount = 0;
    // const chunk 
    const chartStats = this.storage.chunk.pipe(
      skip(1),
      tap(() => {
        console.log("chartStats (statsconvertersservice) emitCount:  " + emitCount);
        emitCount++;
      }),
      scan((acc, scrobbles) => {
        const updatedChartStats = this.updateChartStats(scrobbles, acc);
        const chartStatsWithImages = this.addArtistImagesRetry(updatedChartStats, this.filterState);
        return chartStatsWithImages;
      }, { artists: {} } as ChartStats),
      mergeMap(chartStats =>
        this.addAlbumColors(chartStats).pipe(
          map(updatedChartStats => updatedChartStats)
        )
      ),
      shareReplay(1)
    );

    this.filteredChartStats = combineLatest([
      chartStats,
      this.filters.state$
    ]).pipe(
      takeWhile(() => {
        console.log("loadingStatus: " + this.loadingStatus);
        console.log("loadingStatus != 'FINISHED': " + (this.loadingStatus != 'FINISHED'));
        return this.loadingStatus != 'FINISHED'
      }),
      tap(() => console.log("filteredChartStats (statsconvertersservice)")),
      tap(([_, filterState]) => this.filterState = filterState),
      map(([stats, _]) => this.filterByDate(stats, this.filterState)),
      map(stats => this.filterChartStats(stats, this.filterState)),
      map(stats => this.getTopItemsByScrobbles(stats, this.filterState)),
    );

    this._finishedChartStats = combineLatest([
      chartStats,
      this.filters.state$,
      this.storage.state$
    ]).pipe(
      filter(([_, __, state]) => state.state === 'FINISHED'),
      tap(() => console.log("finishedChartStats (statsconvertersservice)")),
      tap(([chartStats, filterState]) => {
        this.filterState = filterState;
        this.artistTotal = Object.keys(chartStats.artists).length;
        console.log("minScrobbles:" + this.filterState.minScrobbles);
        console.log("numNodes:" + this.filterState.numNodes);
        console.log("view:" + this.filterState.view);
      }),
      map(([chartStats, _, __]) => this.addArtistImagesRetry(chartStats, this.filterState)),
      map(stats => this.filterByDate(stats, this.filterState)),
      map(stats => this.filterChartStats(stats, this.filterState)),
      map(stats => this.getTopItemsByScrobbles(stats, this.filterState)),
    ) as Observable<ChartStats>;

    this._finishedTopAlbums = combineLatest([
      this.scrobbleGetterService.topAlbumSubject,
      this.filters.state$
    ]).pipe(
      tap(([_, filterState]) => {
        this.filterState = filterState;
      }),
      mergeMap(([topAlbums, _]) =>
        this.addTopAlbumColors(topAlbums).pipe(
          map(coloredTopAlbums => coloredTopAlbums)
        )
      ),
    )
  };

  start() {
    this.isActive = true;
  }

  stop() {
    this.isActive = false;
  }

  get finishedChartStats(): Observable<ChartStats | null> {
    return this.isActive ? this._finishedChartStats : of(null);
  }

  get finishedTopAlbums(): Observable<TopAlbum[] | null> {
    return this.isActive ? this._finishedTopAlbums : of(null);
  }

  updateChartStats(scrobbles: Scrobble[], chartStats: ChartStats): ChartStats {
    console.log("updateChartStats: " + Object.keys(chartStats.artists).length);
    this.convertScrobbles(scrobbles, chartStats);
    return chartStats;
  }

  filterByDate(chartStats: ChartStats, filterState: FilterState): ChartStats {
    const filteredChartStats: ChartStats = { artists: {} };
    //  console.log("filter dates: " + filterState.startDate + "    " + filterState.endDate)
    for (const artistKey in chartStats.artists) {
      const artist = chartStats.artists[artistKey];
      const filteredArtist: Artist = {
        ...artist,
        scrobbles: artist.scrobbles.filter(scrobble => scrobble >= filterState.startDate && scrobble <= filterState.endDate),
        albums: {}
      };

      for (const albumKey in artist.albums) {
        const album = artist.albums[albumKey];
        const filteredAlbum: Album = {
          ...album,
          scrobbles: album.scrobbles.filter(scrobble => scrobble >= filterState.startDate && scrobble <= filterState.endDate),
          tracks: {}
        };

        for (const trackKey in album.tracks) {
          const track = album.tracks[trackKey];
          const filteredTrack: Track = {
            ...track,
            scrobbles: track.scrobbles.filter(scrobble => scrobble >= filterState.startDate && scrobble <= filterState.endDate)
          };

          if (filteredTrack.scrobbles.length != 0) {
            filteredAlbum.tracks[trackKey] = filteredTrack;
          }
        }

        if (filteredAlbum.scrobbles.length != 0) {
          filteredArtist.albums[albumKey] = filteredAlbum;
        }
      }

      if (filteredArtist.scrobbles.length != 0) {
        filteredChartStats.artists[artistKey] = filteredArtist;
      }
    }

    //console.log("filterByDate: ")
    for (const artistKey in filteredChartStats.artists) {
      const artist = filteredChartStats.artists[artistKey];
      for (const albumKey in artist.albums) {
        const album = artist.albums[albumKey];
        for (const trackKey in album.tracks) {
          const track = album.tracks[trackKey];
          //console.log(track.name + ": " + track.scrobbles.length);
        }
      }
    }
    return filteredChartStats;
  }

  filterChartStats(chartStats: ChartStats, filterState: FilterState): ChartStats {
    const filteredArtists = Object.keys(chartStats.artists).reduce((acc, artistName) => {
      const artist = chartStats.artists[artistName];

      // Apply artist filter if in artist view
      if (filterState.view === 'Artists' && artist.scrobbles.length >= filterState.minScrobbles) {
        acc[artistName] = artist;
      }

      // Apply album filter if in album view
      if (filterState.view === 'Albums') {
        const filteredAlbums = Object.keys(artist.albums).reduce((albumAcc, albumKey) => {
          const album = artist.albums[albumKey];
          if (album.scrobbles.length >= filterState.minScrobbles) {
            albumAcc[albumKey] = album;
          }
          return albumAcc;
        }, {} as { [key: string]: Album });

        if (Object.keys(filteredAlbums).length > 0) {
          acc[artistName] = {
            ...artist,
            albums: filteredAlbums
          };
        }
      }

      // Apply track filter if in track view
      if (filterState.view === 'Tracks') {
        const filteredAlbums = Object.keys(artist.albums).reduce((albumAcc, albumKey) => {
          const album = artist.albums[albumKey];
          const filteredTracks = Object.keys(album.tracks).reduce((trackAcc, trackKey) => {
            const track = album.tracks[trackKey];
            if (track.scrobbles.length >= filterState.minScrobbles) {
              trackAcc[trackKey] = track;
            }
            return trackAcc;
          }, {} as { [key: string]: Track });

          if (Object.keys(filteredTracks).length > 0) {
            albumAcc[albumKey] = {
              ...album,
              tracks: filteredTracks
            };
          }
          return albumAcc;
        }, {} as { [key: string]: Album });

        if (Object.keys(filteredAlbums).length > 0) {
          acc[artistName] = {
            ...artist,
            albums: filteredAlbums
          };
        }
      }

      return acc;
    }, {} as { [key: string]: Artist });

    return {
      ...chartStats,
      artists: filteredArtists
    };
  }

  getTopItemsByScrobbles(chartStats: ChartStats, filterState: FilterState): ChartStats {
    const numNodes = filterState.numNodes;
    //console.log("numNodes1: " + numNodes);
    if (numNodes == 0) {
      //console.log("numNodes0: " + numNodes);
      return chartStats;
    }
    //console.log("numNodes2: " + numNodes);

    if (filterState.view === 'Artists') {
      const artistsArray = Object.values(chartStats.artists);
      const sortedArtists = artistsArray.sort((a, b) => b.scrobbles.length - a.scrobbles.length);
      const topArtists = sortedArtists.slice(0, numNodes);

      const newChartStats: ChartStats = {
        artists: {}
      };

      topArtists.forEach(artist => {
        newChartStats.artists[artist.name] = artist;
      });


      return newChartStats;

    } else if (filterState.view === 'Albums') {
      const albumsArray = Object.values(chartStats.artists).flatMap(artist => Object.values(artist.albums));
      const sortedAlbums = albumsArray.sort((a, b) => b.scrobbles.length - a.scrobbles.length);
      const topAlbums = sortedAlbums.slice(0, numNodes);

      const newChartStats: ChartStats = {
        artists: {}
      };

      topAlbums.forEach(album => {
        const artist = chartStats.artists[album.artistName];
        if (!newChartStats.artists[album.artistName]) {
          newChartStats.artists[album.artistName] = { ...artist, albums: {} };
        }
        newChartStats.artists[album.artistName].albums[album.name] = album;
      });

      return newChartStats;

    } else if (filterState.view === 'Tracks') {
      const tracksArray: { track: Track, albumName: string, artistName: string }[] = Object.values(chartStats.artists).flatMap(artist =>
        Object.values(artist.albums).flatMap(album =>
          Object.values(album.tracks).map(track => ({ track, albumName: album.name, artistName: artist.name }))
        )
      );
      const sortedTracks = tracksArray.sort((a, b) => b.track.scrobbles.length - a.track.scrobbles.length);
      const topTracks = sortedTracks.slice(0, numNodes);

      const newChartStats: ChartStats = {
        artists: {}
      };

      topTracks.forEach(({ track, albumName, artistName }) => {
        const artist = chartStats.artists[artistName];
        const album = artist.albums[albumName];
        if (!newChartStats.artists[artistName]) {
          newChartStats.artists[artistName] = { ...artist, albums: {} };
        }
        if (!newChartStats.artists[artistName].albums[albumName]) {
          newChartStats.artists[artistName].albums[albumName] = { ...album, tracks: {} };
        }
        newChartStats.artists[artistName].albums[albumName].tracks[track.name] = track;
      });

      return newChartStats;
    }

    return chartStats;
  }

  convertScrobbles(scrobbles: Scrobble[], newChartStats: ChartStats): ChartStats {
    //console.log("convertScrobbles: " + filters.startDate + " | " + filters.endDate);
    for (const scrobble of scrobbles/*this.filterScrobbles(scrobbles, filters)*/) {
      this.handleScrobble(scrobble, newChartStats);
    }
    console.log("convertScrobbles finished");
    return newChartStats;
  }

  pauseUntilConditionMet(newChartStats: ChartStats) {
    return (source: Observable<any>) => {
      return new Observable<any>(subscriber => {
        const checkSubscription = interval(1000).pipe(
          tap(() => {
            // Log for debugging
            console.log('Checking condition...');
            console.log("artistImageStorage: " + Object.keys(this.artistImageStorage).length);
            console.log("newChartStats: " + Object.keys(newChartStats.artists).length);
          }),
          filter(() => Object.keys(newChartStats.artists).length <= Object.keys(this.artistImageStorage).length && Object.keys(newChartStats.artists).length !== 0),
          take(1)
        ).subscribe({
          next: () => {
            // Once condition is met, complete the checkSubscription and let the source observable proceed
            source.subscribe({
              next: (value) => subscriber.next(value),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
          },
          error: (err) => subscriber.error(err),
          complete: () => {
            subscriber.complete();
          }

        });

        // Return the teardown logic
        return () => {
          checkSubscription.unsubscribe();
        };
      });
    };
  }

  storeArtistImage(scrobbles: Scrobble[]): void {
    for (const scrobble of scrobbles) {
      if (!this.currentlyRetrieving.has(scrobble.artistName) && !this.artistImageStorage[scrobble.artistName]) {
        //this.artistImageStorage[scrobble.artistName] = ['', ''];
        //console.log(scrobble.artistName + ": (imageurl)");
        this.currentlyRetrieving.add(scrobble.artistName);
        this.scrobbleGetterService.getArtistImage(scrobble.artistName).subscribe({
          next: (artistImageURL) => {
            this.getDominantColor(artistImageURL)
              .then(color => {
                //const imageColor = this.rgbToHex(color);
                this.artistImageStorage[scrobble.artistName] = [artistImageURL, color.toString()]
              })
              .catch(error => {
                console.error("Error getting dominant color:", error);
                this.artistImageStorage[scrobble.artistName] = [artistImageURL, ""]
              });

            this.currentlyRetrieving.delete(scrobble.artistName);
            this.resetTimer.next();
          },
          error: (err) => {
            console.error('Error while fetching artist image:', err);
            this.artistImageStorage[scrobble.artistName] = ['', ''];
          }
        })
      }
    }
  }

  getDominantColor(imageSrc: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = imageSrc;

      img.onload = () => {
        try {
          const colorThief = new ColorThief();
          const color = colorThief.getColor(img);
          //console.log("Image loaded successfully: " + imageSrc)
          resolve(color);
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = (error) => {
        console.error("Error loading image: " + imageSrc, error);
        reject(error)
      }
    });
  }

  filterScrobbles(scrobbles: Scrobble[], filters: FilterState): Scrobble[] {
    //console.log("Start: " + new Date(filters.startDate).toDateString() + " " + new Date(filters.startDate).toTimeString()
    //        +  "End: " + new Date(filters.endDate).toDateString() + new Date(filters.endDate).toTimeString());
    return scrobbles.filter(scrobble => {
      if (filters.startDate > scrobble.date.getTime() || filters.endDate < scrobble.date.getTime()) {
        return false;
      }
      //console.log(scrobble.artistName + " date: " + scrobble.date.toDateString());
      return true;
    })
  }

  addArtistImagesRetry(newChartStats: ChartStats, filters: FilterState): ChartStats {
    console.log("addArtistImagesRetry, " + this.missingArtists.size);

    for (const artist of this.missingArtists) {
      newChartStats.artists[artist] = {
        ...newChartStats.artists[artist],
        image_url: this.artistImageStorage[artist] ? this.artistImageStorage[artist][0] : '',
        color: this.artistImageStorage[artist] ? this.artistImageStorage[artist][1] : ''
      }
      if (this.artistImageStorage[artist]) {
        //console.log("retried missing artist: " + artist + this.artistImageStorage[artist][0]);
        this.missingArtists.delete(artist);
      }
    }

    // Object.values(newChartStats.artists)
    //   .filter(artist => artist.name === 'Lyn')
    //   .forEach(artist => {
    //     console.log("artist: " + artist.name + " | url: " + artist.image_url);
    //   });

    return newChartStats;
  }

  addAlbumColors(newChartStats: ChartStats): Observable<ChartStats> {
    // Collect an array of observables for color updates
    const colorUpdates$: any = [];

    //console.log("addAlbumColors");

    // Iterate over artists and albums to update colors
    Object.values(newChartStats.artists).forEach(artist => {
      Object.values(artist.albums).forEach(album => {
        if (album.image_url && !this.albumImageStorage.artists[artist.name][album.name]) {
          //console.log("addAlbumColors if")
          // Convert the Promise returned by getDominantColor to an Observable
          const colorUpdate$ = from(this.getDominantColor(album.image_url)).pipe(
            map(color => {
              // Update the album's color with the result
              album.color = color.toString();
              if (!this.albumImageStorage.artists[artist.name]) {
                this.albumImageStorage.artists[artist.name] = {}
              }
              this.albumImageStorage.artists[artist.name][album.name] = color.toString();
              return album; // This line is not strictly necessary but helps with understanding the flow
            }),
            catchError(error => {
              console.error("Error getting dominant color for album: " + album.name, error);
              if (!this.albumImageStorage.artists[artist.name]) {
                this.albumImageStorage.artists[artist.name] = {}
              }
              this.albumImageStorage.artists[artist.name][album.name] = "";
              return of(null); // Continue the observable chain even if there's an error
            })
          );

          colorUpdates$.push(colorUpdate$);
        }
      });
    });

    if (colorUpdates$.length === 0) {
      colorUpdates$.push(of(''));
    }

    // Wait for all color updates to complete
    return forkJoin(colorUpdates$).pipe(
      map(() => newChartStats) // Return the updated ChartStats once all updates are done
    );
  }

  addTopAlbumColors(topAlbums: TopAlbum[]): Observable<TopAlbum[]> {
    // Collect an array of observables for color updates
    const colorUpdates$: any = [];

    //console.log("addAlbumColors");

    // Iterate over artists and albums to update colors
    topAlbums.forEach(topAlbum => {
      const colorUpdate$ = from(this.getDominantColor(topAlbum.image[3]['#text'])).pipe(
        map(color => {
          // Update the album's color with the result
          topAlbum.color = color.toString();

          return topAlbum; // This line is not strictly necessary but helps with understanding the flow
        }),
        catchError(error => {
          console.error("Error getting dominant color for top album: " + topAlbum.name, error);

          return of(null); // Continue the observable chain even if there's an error
        })
      );

      colorUpdates$.push(colorUpdate$);
    });

    if (colorUpdates$.length === 0) {
      colorUpdates$.push(of(''));
    }

    // Wait for all color updates to complete
    return forkJoin(colorUpdates$).pipe(
      map(() => topAlbums) // Return the updated ChartStats once all updates are done
    );
  }

  handleScrobble(scrobble: Scrobble, chartStats: ChartStats): void {
    // If the artist doesn't exist in chartStats, initialize it
    if (!chartStats.artists[scrobble.artistName]) {
      if (!this.artistImageStorage[scrobble.artistName]) {
        //console.log("adding missing Artist to set: " + scrobble.artistName);
        this.missingArtists.add(scrobble.artistName);
        chartStats.artists[scrobble.artistName] = {
          albums: {},
          scrobbles: [],
          name: scrobble.artistName,
          image_url: '',
          color: '',
          isCombo: false,
        };
      } else {
        chartStats.artists[scrobble.artistName] = {
          albums: {},
          scrobbles: [],
          name: scrobble.artistName,
          image_url: this.artistImageStorage[scrobble.artistName][0] || '',
          color: this.artistImageStorage[scrobble.artistName][1] || '',
          isCombo: false,
        };
      }
    }

    const artist = chartStats.artists[scrobble.artistName];

    // If the album doesn't exist for the artist, initialize it
    if (!artist.albums[scrobble.album]) {
      artist.albums[scrobble.album] = {
        tracks: {},
        scrobbles: [],
        name: scrobble.album,
        image_url: scrobble.albumImage,
        isCombo: false,
        artistName: artist.name
      };
      if (!this.albumImageStorage.artists[scrobble.artistName]) {
        this.albumImageStorage.artists[scrobble.artistName] = {}
      }
      if (this.albumImageStorage.artists[scrobble.artistName][scrobble.album]) {
        artist.albums[scrobble.album] = {
          ...artist.albums[scrobble.album],
          color: this.albumImageStorage.artists[scrobble.artistName][scrobble.album]
        };
      }
    }

    const album = artist.albums[scrobble.album];

    // If the track doesn't exist in the album, initialize it
    if (!album.tracks[scrobble.track]) {
      album.tracks[scrobble.track] = {
        scrobbles: [],
        name: scrobble.track
      };
    }

    const track = album.tracks[scrobble.track];

    // Add the scrobble timestamp to the artist, album, and track
    const scrobbleTime = scrobble.date.getTime();
    artist.scrobbles.push(scrobbleTime);
    album.scrobbles.push(scrobbleTime);
    track.scrobbles.push(scrobbleTime);
  }
}