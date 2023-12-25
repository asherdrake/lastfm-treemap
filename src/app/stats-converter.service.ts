import { Injectable } from '@angular/core';
import { ChartStats, Scrobble } from './items';
import { Observable, scan} from 'rxjs';
import { ScrobbleGetterService } from './scrobblegetter.service';
import { ScrobbleStorageService } from './scrobble-storage.service';
import { Chart } from 'highcharts';

@Injectable({
  providedIn: 'root'
})
export class StatsConverterService {
  chartStats: Observable<ChartStats>;
  
  constructor(private storage: ScrobbleStorageService) {
    this.chartStats = this.storage.pageChunk.pipe(
      scan((prevConvertedStats, scrobbles) => this.convertScrobbles(scrobbles, prevConvertedStats), this.emptyStats())
    ) 
  };

  convertScrobbles(scrobbles: Scrobble[], newChartStats: ChartStats): ChartStats {
    for (const scrobble of scrobbles) {
      this.handleArtist(scrobble, newChartStats);
      this.handleAlbum(scrobble, newChartStats);
      this.handleTrack(scrobble, newChartStats)
    }

    return newChartStats;
  }

  handleArtist(scrobble: Scrobble, newChartStats: ChartStats): void {
    const artistStat = newChartStats.artists[scrobble.artist]
    if (!artistStat) {
      newChartStats.artists[scrobble.artist] = {
        tracks: [scrobble.track],
        scrobbles: [scrobble.date.getTime()],
        name: scrobble.artist
      }
    } else {
      artistStat.scrobbles.push(scrobble.date.getTime());
      if (artistStat.tracks.indexOf(scrobble.track) < 0) {
        artistStat.tracks.push(scrobble.track);
      }
    }
  }

  handleAlbum(scrobble: Scrobble, newChartStats: ChartStats): void {
    const albumStat = newChartStats.albums[scrobble.album];
    if (!albumStat) {
      newChartStats.albums[scrobble.album] = {
        artist: scrobble.artist,
        scrobbles: [scrobble.date.getTime()],
        name: scrobble.album
      }
    } else {
      albumStat.scrobbles.push(scrobble.date.getTime());
    }
  }

  handleTrack(scrobble: Scrobble, newChartStats: ChartStats): void {
    const trackStat = newChartStats.tracks[scrobble.track];
    if (!trackStat) {
      newChartStats.tracks[scrobble.track] = {
        artist: scrobble.artist,
        scrobbles: [scrobble.date.getTime()],
        name: scrobble.track
      }
    } else {
      trackStat.scrobbles.push(scrobble.date.getTime())
    }
  }

  private emptyStats(): ChartStats {
    return {
      artists: {},
      albums: {},
      tracks: {}
    }
  }
}
