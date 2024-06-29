import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TreeNode, ChartStats, Scrobble, Artist, Album, ArtistCombo, AlbumCombo } from './items';
import { scan, from, mergeMap, interval, of, forkJoin, concatMap, Subject, catchError, tap, filter, Observable, map, combineLatest, takeUntil, timer, take } from 'rxjs';
import { ScrobbleGetterService } from './scrobblegetter.service';
import { ScrobbleStorageService, ScrobbleState } from './scrobble-storage.service';
import { FiltersService, FilterState } from './filters.service';
import ColorThief from 'color-thief-ts';
import { CombineService } from './combine.service';
import { chart } from 'highcharts';

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
  chartStats: Observable<ChartStats>;
  startDate: number = 0;
  endDate: number = 0;
  artistImageStorage: ArtistImages = {};
  albumImageStorage: AlbumImages = { artists: {} };
  missingArtists = new Set<string>();
  currentlyRetrieving = new Set<string>();
  imageProcessing;
  //private timerDuration: number = 10000;
  private resetTimer = new Subject<void>();
  imageProcessingComplete = new Subject<void>();
  completed: Observable<ScrobbleState>;
  filterState: FilterState = {
    startDate: 0,
    endDate: Date.now(),
    minArtistScrobbles: 0,
    minAlbumScrobbles: 0,
    minTrackScrobbles: 0,
    view: "Artists"
  };

  constructor(
    private router: Router,
    private storage: ScrobbleStorageService,
    private scrobbleGetterService: ScrobbleGetterService,
    private filters: FiltersService,
    private combineService: CombineService) {
    this.imageProcessing = this.storage.trackPageChunk.pipe(
      map(scrobbles => this.storeArtistImage(scrobbles)),
      // takeUntil(timerResetObservable),
      // tap(() => console.log("Image Processing Complete."))
    ).subscribe();

    this.storage.artistImageStorage.subscribe({
      next: (artistImages) => {
        this.artistImageStorage = artistImages as ArtistImages
      }
    })

    this.storage.albumImageStorage.subscribe({
      next: (albumImages) => {
        this.albumImageStorage = albumImages as AlbumImages
      }
    })

    this.completed = this.storage.state$.pipe(filter(state => state.state === "FINISHED"));

    // const chunk 
    this.chartStats = combineLatest([
      this.storage.trackPageChunk,
      this.filters.state$
    ]).pipe(
      tap(([_, filters]) => this.filterState = filters),
      tap(() => console.log("combineLatest")),
      scan((acc, [scrobbles, filters]) => this.updateChartStats(scrobbles, filters, acc), { artists: {} } as ChartStats),
      map(chartStats => this.addArtistImagesRetry(chartStats, this.filterState)),
      map(chartStats => this.filterArtists(chartStats, this.filterState)),
      map(chartStats => this.filterAlbums(chartStats, this.filterState)),
      map(chartStats => this.filterTracks(chartStats, this.filterState)),
    );

    //this.chartStats.subscribe();
  };

  updateChartStats(scrobbles: Scrobble[], filterState: FilterState, chartStats: ChartStats): ChartStats {
    console.log("updateChartStats")
    this.convertScrobbles(scrobbles, filterState, chartStats);
    return chartStats;
  }

  getChartStatsObservable(): Observable<ChartStats> {
    let filterState: FilterState;
    let artistCombinations: ArtistCombo[];
    let albumCombinations: AlbumCombo[];
    return combineLatest([
      this.completed,
      this.filters.state$
    ]).pipe(
      map(([scrobbles, filters]) => {
        filterState = filters;
        artistCombinations = scrobbles.artistCombinations
        albumCombinations = scrobbles.albumCombinations
        return this.convertScrobbles(scrobbles.scrobbles, filters, { artists: {} })
      }),
      concatMap(([newChartStats, filters]) => {
        return this.pauseUntilConditionMet(newChartStats)(of(newChartStats)).pipe(
          map(() => {
            return [newChartStats, filters]
          })
        );
      }),
      map(([newChartStats, filters]) => this.addArtistImagesRetry(newChartStats as ChartStats, filters as FilterState)),
      //map(([newChartStats, filters]) => this.addAlbumColors(newChartStats, filters)),
      // mergeMap(([newChartStats, filters]) =>
      //   this.addAlbumColors(newChartStats).pipe(
      //     map(updatedChartStats => {
      //       //this.storage.updateAlbumImages(this.albumImageStorage);
      //       return updatedChartStats;
      //     })
      //   )
      // ),
      map(chartStats => this.combineService.combineArtists(chartStats, artistCombinations)),
      map(chartStats => {
        // Conditionally apply the transformation if the condition is true
        if (filterState.view === 'Albums') {
          return this.combineService.combineAlbums(chartStats, albumCombinations)
        } else {
          // Pass through the chartStats unchanged if the condition is false
          return chartStats;
        }
      }),
      map(chartStats => this.filterArtists(chartStats, filterState)),
      map(chartStats => this.filterAlbums(chartStats, filterState)),
      map(chartStats => this.filterTracks(chartStats, filterState)),
    )
  }

  filterArtists(chartStats: ChartStats, filterState: FilterState): ChartStats {
    const filteredArtists = Object.keys(chartStats.artists).reduce((acc, artistName) => {
      const artist = chartStats.artists[artistName];
      const scrobbleCount = artist.scrobbles.length; // Calculate the total scrobble count for the artist

      console.log(filterState.minArtistScrobbles);
      if (scrobbleCount >= filterState.minArtistScrobbles) {
        // If the artist meets the minimum scrobble count, include them in the output
        acc[artistName] = artist;
      }

      return acc;
    }, {} as { [key: string]: Artist });

    return {
      ...chartStats,
      artists: filteredArtists
    };
  }

  filterAlbums(chartStats: ChartStats, filter: FilterState): ChartStats {
    for (const artistKey in chartStats.artists) {
      const artist = chartStats.artists[artistKey];
      for (const albumKey in artist.albums) {
        const album = artist.albums[albumKey];
        const totalScrobbles = album.scrobbles.length; // Assuming this is the correct way to get the scrobble count for an album

        if (totalScrobbles < filter.minAlbumScrobbles) {
          console.log("filterAlbums")
          delete artist.albums[albumKey]; // Remove the album if it doesn't meet the scrobble count criteria
        }
      }
    }

    return chartStats
  }

  filterTracks(chartStats: ChartStats, filter: FilterState): ChartStats {
    for (const artistKey in chartStats.artists) {
      const artist = chartStats.artists[artistKey];
      for (const albumKey in artist.albums) {
        const album = artist.albums[albumKey];
        for (const trackKey in album.tracks) {
          const track = album.tracks[trackKey];
          const totalScrobbles = track.scrobbles.length;
          if (totalScrobbles < filter.minTrackScrobbles) {
            delete album.tracks[trackKey];
          }
        }
      }
    }

    return chartStats
  }

  convertScrobbles(scrobbles: Scrobble[], filters: FilterState, newChartStats: ChartStats): [ChartStats, FilterState] {
    //console.log("convertScrobbles: " + filters.startDate + " | " + filters.endDate);
    for (const scrobble of this.filterScrobbles(scrobbles, filters)) {
      this.handleScrobble(scrobble, newChartStats);
    }
    console.log("convertScrobbles finished");
    return [newChartStats, filters];
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
          filter(() => Object.keys(newChartStats.artists).length <= Object.keys(this.artistImageStorage).length),
          take(1)
        ).subscribe(() => {
          // Once condition is met, complete the checkSubscription and let the source observable proceed
          source.subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
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
          error: (err) => console.error('Error while fetching artist image:', err)
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
        console.log("retried missing artist: " + artist + this.artistImageStorage[artist][0]);
        this.missingArtists.delete(artist);
      }
    }
    return newChartStats;
  }

  addAlbumColors(newChartStats: ChartStats): Observable<ChartStats> {
    // Collect an array of observables for color updates
    const colorUpdates$: any = [];

    console.log("addAlbumColors");

    // Iterate over artists and albums to update colors
    Object.values(newChartStats.artists).forEach(artist => {
      Object.values(artist.albums).forEach(album => {
        if (album.image_url && !this.albumImageStorage.artists[artist.name][album.name]) {
          console.log("addAlbumColors if")
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

  handleScrobble(scrobble: Scrobble, chartStats: ChartStats): void {
    //console.log("handling " + scrobble.artistName)
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