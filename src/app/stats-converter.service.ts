import { Injectable } from '@angular/core';
import { ChartStats, Scrobble, Artist } from './items';
import { filter, tap, Observable, scan, switchMap, map, BehaviorSubject, distinctUntilChanged, combineLatest} from 'rxjs';
import { ScrobbleGetterService } from './scrobblegetter.service';
import { ScrobbleStorageService } from './scrobble-storage.service';
import { Chart } from 'highcharts';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  constructor(private storage: ScrobbleStorageService, private scrobbleGetterService: ScrobbleGetterService, private filters: FiltersService) {
    this.storage.trackPageChunk.pipe(
      map(scrobbles => this.storeArtistImage(scrobbles))
    ).subscribe();

    const completed = this.storage.state$.pipe(filter(state => state.state === "FINISHED"));
    
    this.chartStats = combineLatest([
      completed,
      this.filters.state$
    ]).pipe(
      map(([scrobbles, filters]) => this.convertScrobbles(scrobbles.scrobbles, filters, this.emptyStats()))
    )
  };

  convertScrobbles(scrobbles: Scrobble[], filters: FilterState, newChartStats: ChartStats): ChartStats {
    console.log("convertScrobbles: " + filters.startDate + " | " + filters.endDate);
    for (const scrobble of this.filterScrobbles(scrobbles, filters)) {
        this.handleScrobble(scrobble, newChartStats);
    }
    return newChartStats;
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
            image_url: this.artistImageStorage[scrobble.artistName]
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

  /*handleScrobble(scrobble: Scrobble, newChartStats: ChartStats): void {
    const artistStat = newChartStats.artists[scrobble.artistName];
    if (scrobble.artistName === "pasteboard") {
      console.log("handleScrobble: " + scrobble.track + ", " + scrobble.album + ", " + scrobble.date);
    }
    if (!artistStat) {
        newChartStats.artists[scrobble.artistName] = {
          tracks: [],
          albums: {},
          scrobbles: [scrobble.date.getTime()],
          name: scrobble.artistName,
          image_url: this.artistImageStorage[scrobble.artistName]
        }
        //newChartStats.artists[scrobble.artistName].albums[scrobble.album] = scrobble.album;
    } else {
      const albumStat = artistStat.albums[scrobble.album];
      if (!albumStat) {
        newChartStats.artists[scrobble.artistName].albums[scrobble.album] = {
          artist: scrobble.artistName,
          tracks: {},
          scrobbles: [scrobble.date.getTime()],
          name: scrobble.album,
          image_url: scrobble.artistImage
        }
        artistStat.scrobbles.push(scrobble.date.getTime())
        if (artistStat.tracks.indexOf(scrobble.track) < 0) {
          artistStat.tracks.push(scrobble.track);
          if (scrobble.track === "pasteboard") {
            console.log("Artist Stat Push: " + scrobble.track + ", " + scrobble.album + ", " + scrobble.date);
          }
        }
      } else {
        const trackStat = albumStat.tracks[scrobble.track];
        if (!trackStat) {
          if (scrobble.track === "pasteboard") {
            console.log("!Track Stat: " + scrobble.track + ", " + scrobble.album + ", " + scrobble.date);
          }
          newChartStats.artists[scrobble.artistName].albums[scrobble.album].tracks[scrobble.track] = {
            artist: scrobble.artistName,
            album: scrobble.album,
            scrobbles: [scrobble.date.getTime()],
            name: scrobble.track
          }
          artistStat.scrobbles.push(scrobble.date.getTime())
          if (artistStat.tracks.indexOf(scrobble.track) < 0) {
            artistStat.tracks.push(scrobble.track);
          }
          albumStat.scrobbles.push(scrobble.date.getTime());
        } else {
          artistStat.scrobbles.push(scrobble.date.getTime())
          if (artistStat.tracks.indexOf(scrobble.track) < 0) {
            artistStat.tracks.push(scrobble.track);
          }
          albumStat.scrobbles.push(scrobble.date.getTime());
          trackStat.scrobbles.push(scrobble.date.getTime());
          if (scrobble.track === "pasteboard") {
            console.log("Track Stat: " + scrobble.track + ", " + scrobble.album + ", " + scrobble.date);
          }
        }
      }
    }
  }*/

  private emptyStats(): ChartStats {
    return {
      artists: {},
    }
  }
}
