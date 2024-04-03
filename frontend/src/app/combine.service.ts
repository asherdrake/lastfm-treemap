import { Injectable } from '@angular/core';
import { ChartStats, Artist, Track, Album } from './items';

@Injectable({
  providedIn: 'root'
})
export class CombineService {

  constructor() { }

  public combineArtists(chartStats: ChartStats, artistName1: string, artistName2: string, newName: string): ChartStats {
    if (!chartStats.artists[artistName1] || !chartStats.artists[artistName2]) {
      console.error('One or both artists not found');
      return chartStats;
    }

    const artist1 = chartStats.artists[artistName1];
    const artist2 = chartStats.artists[artistName2];

    const newArtist: Artist = {
      albums: {},
      scrobbles: this.combineScrobbles(artist1.scrobbles, artist2.scrobbles),
      name: newName
    };

    this.combineAlbums(artist1, artist2, newArtist);

    chartStats.artists[newName] = newArtist;

    return chartStats;
  }

  private combineScrobbles(scrobbles1: number[], scrobbles2: number[]): number[] {
    return scrobbles1.concat(scrobbles2);
  }

  private combineAlbums(artist1: Artist, artist2: Artist, newArtist: Artist): void {
    const allAlbumNames = new Set([...Object.keys(artist1.albums), ...Object.keys(artist2.albums)]);
    allAlbumNames.forEach(albumName => {
      const album1 = artist1.albums[albumName];
      const album2 = artist2.albums[albumName];
      const newAlbum: Album = {
        tracks: {},
        scrobbles: [],
        name: albumName
      };

      if (album1 && album2) {
        newAlbum.scrobbles = this.combineScrobbles(album1.scrobbles, album2.scrobbles);
        this.combineTracks(album1, album2, newAlbum);
      } else {
        // If the album is only in one artist, copy it
        const albumCopy = album1 ? album1 : album2;
        newAlbum.scrobbles = albumCopy.scrobbles;
        newAlbum.tracks = { ...albumCopy.tracks };
      }

      newArtist.albums[albumName] = newAlbum;
    });
  }

  private combineTracks(album1: Album, album2: Album, newAlbum: Album): void {
    const allTrackNames = new Set([...Object.keys(album1.tracks), ...Object.keys(album2.tracks)]);
    allTrackNames.forEach(trackName => {
      const track1 = album1.tracks[trackName];
      const track2 = album2.tracks[trackName];
      const newTrack: Track = {
        scrobbles: [],
        name: trackName
      };

      if (track1 && track2) {
        newTrack.scrobbles = this.combineScrobbles(track1.scrobbles, track2.scrobbles);
      } else {
        // If the track is only in one album, copy it
        newTrack.scrobbles = track1 ? track1.scrobbles : track2 ? track2.scrobbles : [];
      }

      newAlbum.tracks[trackName] = newTrack;
    });
  }
}
