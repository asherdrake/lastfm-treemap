import { ViewContainerRef, ViewChild, Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { TreemapViewType } from '../items';
import { tap } from 'rxjs';
import { FiltersService } from '../filters.service';

@Component({
  selector: 'app-lightweight',
  templateUrl: './lightweight.component.html',
  styleUrl: './lightweight.component.css'
})
export class LightweightComponent {
  @ViewChild('treemapPlaceholder', { read: ViewContainerRef }) treemapContainer!: ViewContainerRef;
  view: TreemapViewType = "Artists"
  sidebarActive: boolean = false;
  constructor(
    private filter: FiltersService,
    private cdr: ChangeDetectorRef) {
    this.filter.state$.pipe(
      tap((filter) => {
        console.log("filter emitted")
        this.view = filter.view
      })
    ).subscribe()
  }

  ngOnInit(): void {
  }

  handleSidebarState(state: boolean): void {
    this.sidebarActive = state;
  }
}
