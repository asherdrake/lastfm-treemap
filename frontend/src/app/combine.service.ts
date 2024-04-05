import { Injectable } from '@angular/core';
import { ChartStats, Artist, Combination, Album } from './items';

@Injectable({
  providedIn: 'root'
})
export class CombineService {

  constructor() { }

  public combineArtists(chartStats: ChartStats, combinations: Combination[]): ChartStats {
    if (combinations) {
      combinations.forEach(combination => {
        const combinedArtist = this.createCombinedArtist(chartStats, combination);
        this.assignCombinedArtistToChartStats(chartStats, combinedArtist, combination);
      });
    }
    return chartStats;
  }

  private createCombinedArtist(chartStats: ChartStats, combination: Combination): Artist {
    let combinedArtist: Artist = {
      albums: {},
      scrobbles: [],
      name: combination.name,
      image_url: '',
      color: '' // Placeholder for default or logic-based color
    };

    let maxScrobbles = -1;
    combination.artists.forEach(artistName => {
      const artist = chartStats.artists[artistName];
      console.log("artistName: " + artistName);
      //console.log("CombineService_createCombinedArtist: " + artist.name);
      if (artist) {
        this.mergeArtistData(artist, combinedArtist, maxScrobbles);
      }
    });

    return combinedArtist;
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

  private assignCombinedArtistToChartStats(chartStats: ChartStats, combinedArtist: Artist, combination: Combination): void {
    // Remove original artists
    combination.artists.forEach(artistName => {
      delete chartStats.artists[artistName];
    });

    chartStats.artists[combination.name] = combinedArtist;
  }
}
