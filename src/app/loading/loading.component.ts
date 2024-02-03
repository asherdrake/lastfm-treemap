import { Component, OnInit } from '@angular/core';
import { ScrobbleStorageService } from '../scrobble-storage.service';
import { map, take } from 'rxjs';
import { ScrobbleGetterService } from '../scrobblegetter.service';
import { FiltersService } from '../filters.service';
import { Scrobble, ScrobblesJSON } from "src/app/items";

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
  constructor(private storage: ScrobbleStorageService, private scrobbleGetterService: ScrobbleGetterService, private filters: FiltersService) {
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
        artistImages: state.artistImages
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
    //this.group.remove();
    this.updateDateRange();
  }

  updateDateRange(): void {
    console.log("updateDateRange");
    const startDate = Date.parse(this.startDate);
    const endDate = Date.parse(this.endDate);
    this.filters.updateDateRange({startDate, endDate});
  }
  
  startFetching(importedScrobbles: Scrobble[], artistImages: { [key: string]: string }): void {
    this.updateDateRange();
    this.scrobbleGetterService.initializeFetching(this.username, this.startDate, this.endDate, this.storage, importedScrobbles, artistImages);
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
        this.startFetching(scrobbles, parsed.artistImages);
      }
    };

    fileReader.readAsText(file);
  }

  ngOnInit(): void {
  }
}
