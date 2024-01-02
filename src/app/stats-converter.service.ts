import { Injectable } from '@angular/core';
import { ChartStats, Scrobble, Artist } from './items';
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
      this.handleScrobble(scrobble, newChartStats);
    }

    return newChartStats;
  }

  handleScrobble(scrobble: Scrobble, newChartStats: ChartStats): void {
    const artistStat = newChartStats.artists[scrobble.artistName];
    if (!artistStat) {
      newChartStats.artists[scrobble.artistName] = {
        tracks: [],
        albums: {},
        scrobbles: [scrobble.date.getTime()],
        name: scrobble.artistName,
      }
    } else {
      const albumStat = artistStat.albums[scrobble.album];
      if (!albumStat) {
        newChartStats.artists[scrobble.artistName].albums[scrobble.album] = {
          artist: scrobble.artistName,
          tracks: {},
          scrobbles: [scrobble.date.getTime()],
          name: scrobble.album
        }
        artistStat.scrobbles.push(scrobble.date.getTime())
        if (artistStat.tracks.indexOf(scrobble.track) < 0) {
          artistStat.tracks.push(scrobble.track);
        }
      } else {
        const trackStat = albumStat.tracks[scrobble.track];
        if (!trackStat) {
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
        }
      }
    }
  }

  private emptyStats(): ChartStats {
    return {
      artists: {},
    }
  }
}
