import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ChartStats, Scrobble, Artist } from './items';
import { interval, of, defer, concatMap, Subject, switchMap, tap, filter, Observable, map, combineLatest, takeUntil, timer, take } from 'rxjs';
import { ScrobbleGetterService } from './scrobblegetter.service';
import { ScrobbleStorageService, ScrobbleState } from './scrobble-storage.service';
import { FiltersService, FilterState } from './filters.service';
import ColorThief from 'color-thief-ts';

interface ArtistImages {
  [key: string]: [string, string]
}

@Injectable({
  providedIn: 'root'
})
export class StatsConverterService {
  //chartStats: Observable<ChartStats>;
  startDate: number = 0;
  endDate: number = 0;
  artistImageStorage: ArtistImages = {};
  missingArtists = new Set<string>();
  currentlyRetrieving = new Set<string>();
  imageProcessing;
  private timerDuration: number = 10000;
  private resetTimer = new Subject<void>();
  imageProcessingComplete = new Subject<void>();
  completed: Observable<ScrobbleState>;

  constructor(private router: Router, private storage: ScrobbleStorageService, private scrobbleGetterService: ScrobbleGetterService, private filters: FiltersService) {
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
    
    this.completed = this.storage.state$.pipe(filter(state => state.state === "FINISHED"));
  };

  getChartStatsObservable(): Observable<ChartStats> {
    return combineLatest([
      this.completed,
      this.filters.state$
    ]).pipe(
      map(([scrobbles, filters]) => this.convertScrobbles(scrobbles.scrobbles, filters, { artists: {} })),
      concatMap(([newChartStats, filters]) => {
        return this.pauseUntilConditionMet(newChartStats)(of(newChartStats)).pipe(
          map(() => {
            return [newChartStats, filters]
          })
        );
      }),
      map(([newChartStats, filters]) => this.addArtistImagesRetry(newChartStats as ChartStats, filters as FilterState)),
      map(([newChartStats, filters]) => {
        const filteredArtists = Object.keys(newChartStats.artists).reduce((acc, artistName) => {
          const artist = newChartStats.artists[artistName];
          const scrobbleCount = artist.scrobbles.length; // Calculate the total scrobble count for the artist
    
          console.log(filters.minArtistScrobbles);
          if (scrobbleCount >= filters.minArtistScrobbles) {
            // If the artist meets the minimum scrobble count, include them in the output
            acc[artistName] = artist;
          }
    
          return acc;
        }, {} as { [key: string]: Artist });
    
        // Return a new ChartStats object with the filtered artists
        return {
          ...newChartStats,
          artists: filteredArtists
        };
      })
    )
  }

  convertScrobbles(scrobbles: Scrobble[], filters: FilterState, newChartStats: ChartStats): [ChartStats, FilterState] {
    console.log("convertScrobbles: " + filters.startDate + " | " + filters.endDate);
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
          filter(() => Object.keys(newChartStats.artists).length === Object.keys(this.artistImageStorage).length),
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
          //console.log(color)
          resolve(color);
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = (error) => {
        console.error("Error loading image:", error);
        reject(error)
      }
    });
  }

  filterScrobbles(scrobbles: Scrobble[], filters: FilterState): Scrobble[] {
    return scrobbles.filter(scrobble => {
      if (filters.startDate > scrobble.date.getTime() || filters.endDate < scrobble.date.getTime()) {
        return false;
      }
      return true;
    })
  }

  addArtistImagesRetry(newChartStats: ChartStats, filters: FilterState): [ChartStats, FilterState] {
    console.log("addArtistImagesRetry, " + this.missingArtists.size);
    for (const artist of this.missingArtists) {
      newChartStats.artists[artist] = {
        ...newChartStats.artists[artist],
        image_url: this.artistImageStorage[artist][0] || '',
        color: this.artistImageStorage[artist][1] || ''
      }
      console.log("retried missing artist: " +artist + this.artistImageStorage[artist][0]);
    }
    return [newChartStats, filters];
  }

  handleScrobble(scrobble: Scrobble, chartStats: ChartStats): void {
    //console.log("handling " + scrobble.artistName)
    // If the artist doesn't exist in chartStats, initialize it
    if (!chartStats.artists[scrobble.artistName]) {
      if (!this.artistImageStorage[scrobble.artistName]) {
        console.log("adding missing Artist to set: " + scrobble.artistName);
        this.missingArtists.add(scrobble.artistName);
        chartStats.artists[scrobble.artistName] = {
          albums: {},
          scrobbles: [],
          name: scrobble.artistName,
          image_url: '',
          color: ''
        };
      } else {
        chartStats.artists[scrobble.artistName] = {
              albums: {},
              scrobbles: [],
              name: scrobble.artistName,
              image_url: this.artistImageStorage[scrobble.artistName][0] || '',
              color: this.artistImageStorage[scrobble.artistName][1] || ''
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
            image_url: scrobble.albumImage // Assuming the album image is the same as the artist image
        };
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
