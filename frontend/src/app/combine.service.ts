import { Injectable } from '@angular/core';
import { ChartStats, Artist, Combo, Album, TreeNode } from './items';

@Injectable({
  providedIn: 'root'
})
export class CombineService {

  constructor() { }

  public combineArtists(chartStats: ChartStats, combinations: Combo[]): ChartStats {
    if (combinations) {
      combinations.forEach(combination => {
        const combinedArtist = this.createCombinedArtist(chartStats, combination);
        this.assignCombinedArtistToChartStats(chartStats, combinedArtist, combination);
      });
    }
    return chartStats;
  }

  private createCombinedArtist(chartStats: ChartStats, combination: Combo): Artist {
    let combinedArtist: Artist = {
      albums: {},
      scrobbles: [],
      name: combination.name,
      image_url: '',
      color: '', // Placeholder for default or logic-based color,
      isCombo: true
    };

    let maxScrobbles = -1;
    combination.children.forEach(artistName => {
      const artist = chartStats.artists[artistName];
      console.log("artistName: " + artistName);
      //console.log("CombineService_createCombinedArtist: " + artist.name);
      if (artist) {
        this.mergeArtistData(artist, combinedArtist, maxScrobbles);
      }
    });

    return combinedArtist;
  }

  // public combineAlbumsTreeNode(treeNodes: TreeNode, combinations: Combo[]): TreeNode {
  //   if (combinations) {
  //     combinations.forEach(combination => {
  //       const combinedAlbum = this.createCombinedAlbumTreeNode(treeNodes, combination);
  //       this.assignCombinedArtistToChartStats(chartStats, combinedArtist, combination);
  //     });
  //   }
  //   return chartStats;
  // }

  // private createCombinedAlbumTreeNode(treeNodes: TreeNode, combination: Combination): TreeNode {
  //   let combinedAlbum: TreeNode = {
  //     children: [],
  //     value: 0,
  //     name: combination.name,
  //     image: '',
  //     color: '' // Placeholder for default or logic-based color
  //   };

  //   let maxScrobbles = -1;
  //   combination.children.forEach(albumName => {
  //     const albums = treeNodes.children!.filter(a => a.name !== albumName);
  //     console.log("artistName: " + albumName);
  //     //console.log("CombineService_createCombinedArtist: " + artist.name);
  //     albums.forEach(a => this.mergeAlbumTreeNodes(a, combinedAlbum));
  //   });

  //   return combinedAlbum;
  // }

  // private mergeAlbumTreeNodes(album: TreeNode, combinedAlbum: TreeNode): void {
  //   combinedAlbum.value! += album.value!;
  //   combinedAlbum.color = album.color;
  //   combinedAlbum.image = album.image;
  //   album.children?.forEach(track => {
  //     const existingTrack = combinedAlbum.children?.find(trackName => trackName.name === track.name)
  //     if (existingTrack) {
  //       existingTrack.value! += track.value!;
  //     } else {
  //       combinedAlbum.children?.push(track)
  //     }
  //   })
  // }

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

  private assignCombinedArtistToChartStats(chartStats: ChartStats, combinedArtist: Artist, combination: Combo): void {
    // Remove original artists
    combination.children.forEach(artistName => {
      delete chartStats.artists[artistName];
    });

    chartStats.artists[combination.name] = combinedArtist;
  }

  // private assignCombinedAlbumToTreeNodes(treeNodes: TreeNode, combinedAlbum: TreeNode, combination: Combination): void {
  //   // Remove original albums
  //   combination.children.forEach(albumName => {
  //     treeNodes.children = treeNodes.children?.filter(album => album.name !== albumName)
  //   });

  //   chartStats.artists[combination.name] = combinedArtist;
  // }
}
