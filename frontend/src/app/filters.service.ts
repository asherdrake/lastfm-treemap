import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store'

export interface FilterState {
  startDate: number,
  endDate: number,

  minArtistScrobbles: number,
  minAlbumScrobbles: number,

  view: string
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
      view: "Artists"
    });
  }

  readonly updateSettings = this.updater((currData: FilterState, settings: {startDate: number, endDate: number, minArtistScrobbles: number, minAlbumScrobbles: number, view: string}) => {
    return {
      ...currData,
      ...settings
    }
  });
}
