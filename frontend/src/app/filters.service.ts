import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store'
import { filter } from 'd3';
import { TreemapViewType } from 'src/app/items';

export interface FilterState {
  startDate: number,
  endDate: number,

  minArtistScrobbles: number,
  minAlbumScrobbles: number,
  minTrackScrobbles: number,

  view: TreemapViewType
}

@Injectable({
  providedIn: 'root'
})
export class FiltersService extends ComponentStore<FilterState> {

  constructor() { 
    super({
      startDate: 0,
      endDate: Date.now(),
      minArtistScrobbles: 0,
      minAlbumScrobbles: 0,
      minTrackScrobbles: 0,
      view: "Artists"
    });
  }

  readonly updateSettings = this.updater((currData: FilterState, settings: {startDate: number, endDate: number, minArtistScrobbles: number, minAlbumScrobbles: number, minTrackScrobbles: number, view: TreemapViewType}) => {
    console.log("UPDATE SETTINGS: " +settings.startDate + " | " + settings.endDate)
    return {
      ...currData,
      ...settings
    }
  });
}
