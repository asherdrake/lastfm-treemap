import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ScrobbleStorageService } from '../scrobble-storage.service';
import { map, take, filter } from 'rxjs';
import { ScrobbleGetterService } from '../scrobblegetter.service';
import { FiltersService } from '../filters.service';
import { Scrobble, ScrobblesJSON, AlbumImages, ArtistCombo, AlbumCombo, TreemapViewType } from "src/app/items";
import { StatsConverterService } from '../stats-converter.service';

@Component({
  selector: 'app-loadinglw',
  templateUrl: './loading-lightweight.component.html',
  styleUrls: ['./loading-lightweight.component.css']
})
export class LoadingLightweightComponent implements OnInit {
  scrobblesFetched: number = 0;
  pageNumber: number = 0;
  totalPages: number = 0;
  startDate: string = '';
  endDate: string = '';
  username: string = '';
  numNodes: number = 50;
  minScrobbles: number = 10;
  public viewOptions: string[] = ["Albums", "Artists"];
  public selectedView: TreemapViewType = this.viewOptions[0] as TreemapViewType;
  sidebarActive: boolean = true;
  artistImageStorageSize: number = 0;
  loadingStatus: string = 'GETTINGUSER';
  isFetchingInProgress: boolean = false;
  amount: number = 100;
  @Output() sidebarStateChanged = new EventEmitter<boolean>();
  constructor(private storage: ScrobbleStorageService, private scrobbleGetterService: ScrobbleGetterService, private statsConverterService: StatsConverterService, private filters: FiltersService) {
    this.storage.loadingStatus.pipe(
      map(loadingStatus => {
        this.scrobblesFetched = loadingStatus[0].length;
        this.pageNumber = loadingStatus[1];
        this.totalPages = loadingStatus[2];
      })
    ).subscribe();


    this.storage.errorState.subscribe(error => {
      if (error === "LOADFAILED500") {
        alert("Last.fm API error. Download your data, refresh the page and upload it to continue.");
      } else {
        alert("User not found. Refresh and try again.");
      }
    })

    this.storage.state$.pipe(
      filter(state => state.state === "FINISHED"),
      map(() => {
        this.loadingStatus = "FINISHED";
      })
    ).subscribe();
  }

  // Watcher for selectedView changes
  setSelectedView(view: TreemapViewType) {
    this.selectedView = view;
    //this.resetMinScrobbles();
  }

  toggleSidebar(): void {
    this.sidebarActive = !this.sidebarActive
    this.sidebarStateChanged.emit(this.sidebarActive);
  }

  startTopAlbumsTreemap() {
    this.scrobbleGetterService.startTopAlbums(this.username, this.amount);
    console.log("startTopAlbumsTreemap" + this.username);
  }

  ngOnInit(): void {
  }
}
