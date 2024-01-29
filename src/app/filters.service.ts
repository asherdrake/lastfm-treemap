import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store'

export interface FilterState {
  startDate: number,
  endDate: number,
}

@Injectable({
  providedIn: 'root'
})
export class FiltersService extends ComponentStore<FilterState> {

  constructor() { 
    super({
      startDate: 0,
      endDate: Date.now()
    });
  }

  readonly updateDateRange = this.updater((currData: FilterState, dateRange: {startDate: number, endDate: number}) => {
    return {
      ...dateRange
    }
  });
}
