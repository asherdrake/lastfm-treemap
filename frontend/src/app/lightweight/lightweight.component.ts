import { Component, OnInit } from '@angular/core';
import { TreemapViewType, TreeNode, TopAlbum } from '../items';
import { Subscription } from 'rxjs';
import { FilterState } from '../filters.service';
import { StatsConverterService } from '../stats-converter.service';

@Component({
  selector: 'app-lightweight',
  templateUrl: './lightweight.component.html',
  styleUrl: './lightweight.component.css'
})
export class LightweightComponent implements OnInit {
  //@ViewChild(DatasetComponent) datasetComponent!: DatasetComponent;
  view: TreemapViewType = "Albums"
  sidebarActive: boolean = false;
  filterState: FilterState = {} as FilterState;
  treeNodeData: TreeNode = { name: "root", children: [] };
  showNames: boolean = false;
  showScrobbleCount: boolean = false;
  subscription?: Subscription;

  constructor(private statsConverterService: StatsConverterService) { }

  ngOnInit(): void {
    this.statsConverterService.start();

    this.subscription = this.statsConverterService.finishedTopAlbums.subscribe((topAlbums: TopAlbum[] | null) => {
      console.log("topalbumobservable subscription")
      if (topAlbums && topAlbums.length != 0) {
        //console.log("topalbumsubject inside" + this.treemapData)
        this.treeNodeData = this.convertTopAlbums(topAlbums);
        this.view = 'Albums';
        this.showNames = this.statsConverterService.filterState.showNames;
        this.showScrobbleCount = this.statsConverterService.filterState.showScrobbleCount;
        console.log("showNames " + this.showNames);
        console.log("showScrobbleCount " + this.showScrobbleCount);
      }
    })
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

  convertTopAlbums(topAlbums: TopAlbum[]): TreeNode {
    const treemapData: TreeNode = {
      name: "ChartStats",
      children: [] as TreeNode[]
    };

    topAlbums.forEach(album => {
      const treeNode: TreeNode = {
        name: album.name,
        value: album.playcount,
        color: album.color,
        artist: album.artist,
        image: album.image[3]['#text']
      }

      treemapData.children!.push(treeNode);
    });
    console.log("convertTopAlbums");
    console.log(treemapData);
    return treemapData;
  }
}
