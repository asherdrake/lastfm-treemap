import { Component, OnInit } from '@angular/core';
import { TreemapViewType, TreeNode, ChartStats } from '../items';
import { Subscription } from 'rxjs';
import { StatsConverterService } from '../stats-converter.service';
import { FilterState } from 'src/app/filters.service';

@Component({
  selector: 'app-interactive',
  templateUrl: './interactive.component.html',
  styleUrls: ['./interactive.component.css'],
})
export class InteractiveComponent implements OnInit {
  view: TreemapViewType = "Albums"
  sidebarActive: boolean = false;
  filterState: FilterState = {} as FilterState;
  treeNodeData: TreeNode = { name: "root", children: [] };
  subscription?: Subscription;

  constructor(private statsConverterService: StatsConverterService) {}

  ngOnInit(): void {
    this.statsConverterService.start();
    this.subscription = this.statsConverterService.finishedChartStats.subscribe((stats: ChartStats | null) => {
      if (stats) {
        console.log("FINISHED ChartStats received in interactive component");
        this.view = this.statsConverterService.filterState.view
        console.log(this.view);
        this.transformToTreemapData(stats);
      }
    });
  }

  ngOnDestroy(): void {
    this.statsConverterService.stop();
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  handleSidebarState(state: boolean): void {
    this.sidebarActive = state;
  }

  transformToTreemapData(stats: ChartStats): void {
    //console.log("transformtoTreemapData: " + Object.keys(stats.artists));
    if (this.view === "Albums") {
      console.log("Albums Top View");
      this.treeNodeData = this.transformToTreemapDataAlbums(stats);
    } else if (this.view === "Tracks") {
      this.treeNodeData = this.transformToTreemapDataTracks(stats);
    } else {
      console.log("Artists Top View");
      this.treeNodeData = this.transformToTreemapDataArtists(stats);
    }
  }

  transformToTreemapDataArtists(stats: ChartStats): TreeNode {
    const treemapData = {
      name: "ChartStats",
      children: Object.keys(stats.artists).map(artistKey => {
        const artist = stats.artists[artistKey];
        return {
          name: artist.name,
          children: Object.keys(artist.albums).map(albumKey => {
            const album = artist.albums[albumKey];
            //console.log("Album: " + album.name + ", Color: " + album.color)
            return {
              name: album.name,
              children: Object.keys(album.tracks).map(trackKey => {
                const track = album.tracks[trackKey];
                return {
                  name: track.name,
                  value: track.scrobbles.length // or another metric for value
                };
              }),
              image: album.image_url,
              color: album.color
            };
          }),
          image: artist.image_url,
          color: artist.color
        };
      })
    };
    return treemapData
  }

  transformToTreemapDataAlbums(stats: ChartStats): TreeNode {
    const treemapData = {
      name: "ChartStats",
      children: [] as TreeNode[]
    };

    // Iterate over each artist
    Object.keys(stats.artists).forEach(artistKey => {
      const artist = stats.artists[artistKey];
      // Then iterate over each album of the artist
      Object.keys(artist.albums).forEach(albumKey => {
        const album = artist.albums[albumKey];
        // Prepare the album TreeNode, including its tracks as children
        const albumNode: TreeNode = {
          name: album.name,
          artist: artist.name,
          children: Object.keys(album.tracks).map(trackKey => {
            const track = album.tracks[trackKey];
            return {
              name: track.name,
              value: track.scrobbles.length, // Use the length of scrobbles array as value
              // Additional properties like 'image' and 'color' could be included here if needed
            };
          }),
          image: album.image_url, // Album image
          color: album.color // Album color
        };
        // Add the albumNode to the children of the ChartStats TreeNode
        treemapData.children.push(albumNode);
      });
    });

    return treemapData;
  }

  transformToTreemapDataTracks(stats: ChartStats): TreeNode {
    const treemapData = {
      name: "ChartStats",
      children: [] as TreeNode[]
    };

    // Iterate over each artist
    Object.keys(stats.artists).forEach(artistKey => {
      const artist = stats.artists[artistKey];
      // Then iterate over each album of the artist
      Object.keys(artist.albums).forEach(albumKey => {
        const album = artist.albums[albumKey];

        // Then iterate over each tracks of the album
        Object.keys(album.tracks).forEach(trackKey => {
          const track = album.tracks[trackKey];

          const trackNode: TreeNode = {
            name: track.name,
            children: [],
            value: track.scrobbles.length,
            image: album.image_url,
            color: album.color
          }

          treemapData.children.push(trackNode);
        })
      });
    });

    return treemapData;
  }
}