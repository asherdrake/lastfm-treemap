import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store'
import { filter } from 'd3';
import { TreemapViewType } from 'src/app/items';

export interface FilterState {
  startDate: number,
  endDate: number,

  minScrobbles: number,

  numNodes: number,

  showNames: boolean,
  showScrobbleCount: boolean,

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
      minScrobbles: 0,
      numNodes: 0,
      showNames: false,
      showScrobbleCount: false,
      view: "Artists"
    });
  }

  readonly updateSettings = this.updater((currData: FilterState, settings: { startDate: number, endDate: number, minScrobbles: number, numNodes: number, showNames: boolean, showScrobbleCount: boolean, view: TreemapViewType }) => {
    console.log("UPDATE SETTINGS: " + settings.startDate + " | " + settings.endDate)
    return {
      ...currData,
      ...settings
    }
  });
}
