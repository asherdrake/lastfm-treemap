import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store'

export interface FilterState {
  startDate: number,
  endDate: number,

  minArtistScrobbles: number
}

@Injectable({
  providedIn: 'root'
})
export class FiltersService extends ComponentStore<FilterState> {

  constructor() { 
    super({
      startDate: 0,
      endDate: Date.now(),
      minArtistScrobbles: 0
    });
  }

  readonly updateSettings = this.updater((currData: FilterState, settings: {startDate: number, endDate: number, minArtistScrobbles: number}) => {
    return {
      ...currData,
      ...settings
    }
  });
}
