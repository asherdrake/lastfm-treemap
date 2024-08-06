import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ScrobbleStorageService } from '../scrobble-storage.service';
import { map, take, filter } from 'rxjs';
import { ScrobbleGetterService } from '../scrobblegetter.service';
import { FiltersService } from '../filters.service';
import { Scrobble, ScrobblesJSON, AlbumImages, ArtistCombo, AlbumCombo, TreemapViewType } from "src/app/items";
import { StatsConverterService } from '../stats-converter.service';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.css']
})
export class LoadingComponent implements OnInit {
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
  loadingStatus: string = 'Getting user data...';
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

  loadingBarWidth(): string {
    if (this.totalPages === 0) {
      return '0%';
    }

    const progress = ((this.totalPages - this.pageNumber) / this.totalPages) * 100;
    return `${progress}%`;
  }

  artistBarWidth(): string {
    if (!(this.loadingStatus === "FINISHED")) {
      return '0%';
    }
    const storageContentSize = Object.keys(this.statsConverterService.artistImageStorage).length;
    const progress = (storageContentSize / this.statsConverterService.artistTotal) * 100;
    return `${progress}%`;
  }

  toggleSidebar(): void {
    this.sidebarActive = !this.sidebarActive
    this.sidebarStateChanged.emit(this.sidebarActive);
  }

  downloadJSON(): void {
    this.storage.state$.pipe(
      map(state => ({
        username: state.user?.name,
        scrobbles: state.scrobbles,
        artistImages: this.statsConverterService.artistImageStorage,
        albumImages: this.statsConverterService.albumImageStorage,
        artistCombinations: state.artistCombinations,
        albumCombinations: state.albumCombinations
      })),
      take(1)
    ).subscribe(scrobblesData => {
      const scrobblesJSON = JSON.stringify(scrobblesData, null, 2);
      const blob = new Blob([scrobblesJSON], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'treemapdata.json';
      a.click();

      window.URL.revokeObjectURL(url);
    })
  }

  applySettings(): void {
    const timezoneOffset = new Date().getTimezoneOffset() * 60000;
    const startDate = this.startDate ? Date.parse(this.startDate) + timezoneOffset : 0;
    const endDate = this.endDate ? Date.parse(this.endDate) + timezoneOffset : Date.now();
    const minScrobbles = this.minScrobbles
    const numNodes = this.numNodes;
    const view = this.selectedView;
    this.filters.updateSettings({ startDate, endDate, minScrobbles, numNodes, view });
  }

  startFetching(importedScrobbles: Scrobble[], artistImages: { [key: string]: [string, string] }, albumImages: AlbumImages, artistCombinations: ArtistCombo[], albumCombinations: AlbumCombo[]): void {
    this.applySettings();
    this.scrobbleGetterService.initializeFetching(this.username, this.startDate, this.endDate, this.storage, importedScrobbles, artistImages, albumImages, artistCombinations, albumCombinations);
  }

  fileInput(event: any): void {
    console.log("File input");
    const file = event.target.files[0];
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      const parsed = JSON.parse((fileReader.result as string)) as ScrobblesJSON;
      if (parsed) {
        const scrobbles = parsed.scrobbles.map((scrobble: any) => ({
          track: scrobble.track,
          album: scrobble.album,
          artistName: scrobble.artistName,
          albumImage: scrobble.albumImage,
          date: new Date(scrobble.date)
        }))
        this.username = parsed.username;
        this.startFetching(scrobbles, parsed.artistImages, parsed.albumImages, parsed.artistCombinations, parsed.albumCombinations);
      }
    };

    fileReader.readAsText(file);
  }

  ngOnInit(): void {
  }
}
