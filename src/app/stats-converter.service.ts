import { Injectable } from '@angular/core';
import { ChartStats, Scrobble, Artist } from './items';
import { tap, Observable, scan, switchMap, map, BehaviorSubject} from 'rxjs';
import { ScrobbleGetterService } from './scrobblegetter.service';
import { ScrobbleStorageService } from './scrobble-storage.service';
import { Chart } from 'highcharts';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class StatsConverterService {
  chartStats: Observable<ChartStats>;
  totalAlbumPages: number = 0;
  albumPagesProcessed: number = 0;
  readonly chartStatsComplete = new BehaviorSubject<boolean>(false);
  constructor(private storage: ScrobbleStorageService) {
    this.chartStats = this.storage.trackPageChunk.pipe(
      scan((prevConvertedStats, scrobbles) => this.convertScrobbles(scrobbles, prevConvertedStats), this.emptyStats()),
      switchMap((convertedStats) => 
        this.storage.albumArtStatus.pipe(
          tap(albumArtStatus => this.totalAlbumPages = albumArtStatus[1]),
          map((albumArtStatus) => this.mapArtToAlbum(convertedStats, albumArtStatus[0]!)),
          tap(() => {
            if (this.totalAlbumPages == this.albumPagesProcessed) {
              this.chartStatsComplete.next(true);
            }
          })
        )
      )
    ); 
  };

  convertScrobbles(scrobbles: Scrobble[], newChartStats: ChartStats): ChartStats {
    for (const scrobble of scrobbles) {
      this.handleScrobble(scrobble, newChartStats);
    }

    return newChartStats;
  }

  mapArtToAlbum(newChartStats: ChartStats, albumArt: { [key: string]: string }): ChartStats {
    for (const artistKey in newChartStats.artists) {
      const artist = newChartStats.artists[artistKey];

        // Iterate through each album of the artist
        for (const albumKey in artist.albums) {
            const album = artist.albums[albumKey];
            //console.log()
            newChartStats.artists[artistKey].albums[albumKey].image_url = albumArt[album.name];
            // Check if the album's name is a key in albumArt
            if (albumArt.hasOwnProperty(album.name)) {
                // Update the image_url of the album
                album.image_url = albumArt[album.name];
                newChartStats.artists[artistKey].albums[albumKey].image_url = albumArt[album.name];
            }
        }
    }

    this.albumPagesProcessed++;
    console.log("Album pages processed: " + this.albumPagesProcessed + ", Total Pages: " + this.totalAlbumPages);
    for (const key in albumArt) {
      console.log(key + ": " + albumArt[key]);
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
          name: scrobble.album,
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
