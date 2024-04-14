import { Component, OnInit } from '@angular/core';
import { ScrobbleStorageService } from '../scrobble-storage.service';
import { map, take } from 'rxjs';
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
  minArtistScrobbles: number = 0;
  minAlbumScrobbles: number = 0;
  minTrackScrobbles: number = 0;
  public viewOptions: string[] = ["Artists", "Albums", "Tracks"];
  public selectedView: TreemapViewType = this.viewOptions[0] as TreemapViewType;
  constructor(private storage: ScrobbleStorageService, private scrobbleGetterService: ScrobbleGetterService, private statsConverterService: StatsConverterService, private filters: FiltersService) {
    this.storage.loadingStatus.pipe(
      map(loadingStatus => {
        this.scrobblesFetched = loadingStatus[0].length;
        this.pageNumber = loadingStatus[1];
        this.totalPages = loadingStatus[2];
      })
    ).subscribe();
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
    const timezoneOffset = new Date(this.startDate).getTimezoneOffset() * 60000;
    const startDate = Date.parse(this.startDate) + timezoneOffset;
    const endDate = Date.parse(this.endDate) + timezoneOffset;
    const minArtistScrobbles = this.minArtistScrobbles;
    const minAlbumScrobbles = this.minAlbumScrobbles;
    const minTrackScrobbles = this.minTrackScrobbles;
    const view = this.selectedView;
    this.filters.updateSettings({startDate, endDate, minArtistScrobbles, minAlbumScrobbles, minTrackScrobbles, view });
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
