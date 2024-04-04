import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store'
import { Combination } from 'src/app/items';

export interface FilterState {
  startDate: number,
  endDate: number,

  combinations: Combination[],

  minArtistScrobbles: number
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
      view: "Artists",
      combinations: []
    });
  }

  readonly updateSettings = this.updater((currData: FilterState, settings: {startDate: number, endDate: number, minArtistScrobbles: number, minAlbumScrobbles: number, view: string}) => {
    return {
      ...currData,
      ...settings
    }
  });

  readonly updateCombos = this.updater((currData: FilterState, combo: {name: string, artists: string[] }) => {
    const updatedCombos = [...currData.combinations, combo];
    return {
      ...currData,
      combinations: updatedCombos
    }
  })
}
