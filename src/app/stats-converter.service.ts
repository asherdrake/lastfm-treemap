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
      /*this.handleArtist(scrobble, newChartStats);
      this.handleAlbum(scrobble, newChartStats);
      this.handleTrack(scrobble, newChartStats)*/
      //Object.values(newChartStats.artists).sort();
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
        //mbid: scrobble.artistMBID
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
      } else {
        const trackStat = albumStat.tracks[scrobble.track];
        if (!trackStat) {
          newChartStats.artists[scrobble.artistName].albums[scrobble.album].tracks[scrobble.track] = {
            artist: scrobble.artistName,
            album: scrobble.album,
            scrobbles: [scrobble.date.getTime()],
            name: scrobble.track
          }
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

  /*handleArtist(scrobble: Scrobble, newChartStats: ChartStats): void {
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
  }*/

  private emptyStats(): ChartStats {
    return {
      artists: {},
      //albums: {},
      //tracks: {}
    }
  }
}
