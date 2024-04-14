import { Injectable } from '@angular/core';
import { chart, Chart } from 'highcharts';
import { ChartStats, Artist, ArtistCombo, Album, AlbumCombo } from './items';

@Injectable({
  providedIn: 'root'
})
export class CombineService {

  constructor() { }

  public combineArtists(chartStats: ChartStats, combinations: ArtistCombo[]): ChartStats {
    if (combinations) {
      combinations.forEach(combination => {
        const combinedArtist = this.createCombinedArtist(chartStats, combination);
        this.assignCombinedArtistToChartStats(chartStats, combinedArtist, combination);
      });
    }
    return chartStats;
  }

  public combineAlbums(chartStats: ChartStats, combinations: AlbumCombo[]): ChartStats {
    if (combinations) {
      combinations.forEach(combination => {
        const combinedAlbumParent: Artist = this.createCombinedAlbum(chartStats, combination);
        this.assignCombinedAlbumToChartStats(chartStats, combinedAlbumParent, combination)
      })
    }
    return chartStats
  }

  private createCombinedArtist(chartStats: ChartStats, combination: ArtistCombo): Artist {
    let combinedArtist: Artist = {
      albums: {},
      scrobbles: [],
      name: combination.name,
      image_url: '',
      color: '', // Placeholder for default or logic-based color,
      isCombo: true
    };

    let maxScrobbles = -1;
    combination.children.forEach(comboArtist => {
      const artist = chartStats.artists[comboArtist.name];
      //console.log("artistName: " + artistName[1]);
      //console.log("CombineService_createCombinedArtist: " + artist.name);
      if (artist) {
        this.mergeArtistData(artist, combinedArtist, maxScrobbles);
      }
    });

    return combinedArtist;
  }

  //returns the combined album under a parent dummy Artist
  private createCombinedAlbum(chartStats: ChartStats, combination: AlbumCombo): Artist {
    const combinedAlbumParent: Artist = {
      albums: {},
      scrobbles: [],
      name: combination.name,
      isCombo: true
    }

    let maxScrobbles = -1;
    combination.children.forEach(comboAlbum => {
      const album = chartStats.artists[comboAlbum.artistName].albums[comboAlbum.name];
      //console.log("albumName: " + albumInfo[1]);
      if (album) {
        this.mergeAlbumsAndTracks(album, combinedAlbumParent, album.name);
      }
    });

    return combinedAlbumParent;
  }

  private mergeArtistData(artist: Artist, combinedArtist: Artist, maxScrobbles: number): void {
    const totalScrobbles = artist.scrobbles.reduce((acc, cur) => acc + cur, 0);
    if (totalScrobbles > maxScrobbles) {
      maxScrobbles = totalScrobbles;
      combinedArtist.image_url = artist.image_url;
      combinedArtist.color = artist.color;
    }

    Object.keys(artist.albums).forEach(albumName => {
      this.mergeAlbumsAndTracks(artist.albums[albumName], combinedArtist, albumName);
    });
  }

  private mergeAlbumsAndTracks(album: Album, combinedArtist: Artist, albumName: string): void {
    if (!combinedArtist.albums[albumName]) {
      combinedArtist.albums[albumName] = JSON.parse(JSON.stringify(album)); // Deep copy
    } else {
      // Combine album scrobbles
      combinedArtist.albums[albumName].scrobbles = combinedArtist.albums[albumName].scrobbles.concat(album.scrobbles);
      // Combine tracks
      Object.keys(album.tracks).forEach(trackName => {
        if (!combinedArtist.albums[albumName].tracks[trackName]) {
          combinedArtist.albums[albumName].tracks[trackName] = JSON.parse(JSON.stringify(album.tracks[trackName]));
        } else {
          combinedArtist.albums[albumName].tracks[trackName].scrobbles =
            combinedArtist.albums[albumName].tracks[trackName].scrobbles.concat(album.tracks[trackName].scrobbles);
        }
      });
    }
  }

  private assignCombinedArtistToChartStats(chartStats: ChartStats, combinedArtist: Artist, combination: ArtistCombo): void {
    // Remove original artists
    combination.children.forEach(artist => {
      delete chartStats.artists[artist.name];
    });

    chartStats.artists[combination.name] = combinedArtist;
  }

  private assignCombinedAlbumToChartStats(chartStats: ChartStats, combinedArtist: Artist, combination: AlbumCombo): void {
    // Remove original albums
    combination.children.forEach(album => {
      delete chartStats.artists[album.artistName].albums[album.name];
    });

    chartStats.artists[combination.name] = combinedArtist;
  }
}
