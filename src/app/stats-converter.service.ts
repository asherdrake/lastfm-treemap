import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ChartStats, Scrobble, Artist } from './items';
import { take, tap, filter, Observable, map, combineLatest} from 'rxjs';
import { ScrobbleGetterService } from './scrobblegetter.service';
import { ScrobbleStorageService } from './scrobble-storage.service';
import { FiltersService, FilterState } from './filters.service';


interface ArtistImages {
  [key: string]: string
}

@Injectable({
  providedIn: 'root'
})
export class StatsConverterService {
  chartStats: Observable<ChartStats>;
  startDate: number = 0;
  endDate: number = 0;
  artistImageStorage: ArtistImages = {};

  constructor(private router: Router, private storage: ScrobbleStorageService, private scrobbleGetterService: ScrobbleGetterService, private filters: FiltersService) {
    this.storage.trackPageChunk.pipe(
      map(scrobbles => this.storeArtistImage(scrobbles))
    ).subscribe({
      next: () => {
        console.log("trackPageChunk observable")
        this.storage.updateArtistImages(this.artistImageStorage);
      }
    });

    this.storage.artistImageStorage.subscribe({
      next: (artistImages) => {
        this.artistImageStorage = artistImages as ArtistImages
      }
    })
    
    const completed = this.storage.state$.pipe(filter(state => state.state === "FINISHED"));
    
    this.chartStats = combineLatest([
      completed,
      this.filters.state$
    ]).pipe(
      map(([scrobbles, filters]) => this.convertScrobbles(scrobbles.scrobbles, filters, { artists: {} })),
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
  };

  convertScrobbles(scrobbles: Scrobble[], filters: FilterState, newChartStats: ChartStats): [ChartStats, FilterState] {
    console.log("convertScrobbles: " + filters.startDate + " | " + filters.endDate);
    for (const scrobble of this.filterScrobbles(scrobbles, filters)) {
        this.handleScrobble(scrobble, newChartStats);
    }
    return [newChartStats, filters];
  }

  storeArtistImage(scrobbles: Scrobble[]): void {
    for (const scrobble of scrobbles) {
      if (!this.artistImageStorage[scrobble.artistName]) {
        this.artistImageStorage[scrobble.artistName] = ' ';
        //console.log(scrobble.artistName + ": (imageurl)");
        this.scrobbleGetterService.getArtistImage(scrobble.artistName).subscribe({
          next: (artistImageURL) => {
            this.artistImageStorage[scrobble.artistName] = artistImageURL;
          },
          error: (err) => console.error('Error while fetching artist image:', err)
        })
      }
    }
  }

  filterScrobbles(scrobbles: Scrobble[], filters: FilterState): Scrobble[] {
    return scrobbles.filter(scrobble => {
      if (filters.startDate > scrobble.date.getTime() || filters.endDate < scrobble.date.getTime()) {
        return false;
      }
      return true;
    })
  }

  handleScrobble(scrobble: Scrobble, chartStats: ChartStats): void {
    // If the artist doesn't exist in chartStats, initialize it
    if (!chartStats.artists[scrobble.artistName]) {
      chartStats.artists[scrobble.artistName] = {
          albums: {},
          scrobbles: [],
          name: scrobble.artistName,
          image_url: this.artistImageStorage[scrobble.artistName] || '--'
      };
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
