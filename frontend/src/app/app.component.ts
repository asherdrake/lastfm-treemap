import { ViewContainerRef, ViewChild, Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { TreemapViewType } from './items';
import { tap } from 'rxjs';
import { FiltersService } from './filters.service';
import { DatasetComponent } from './dataset/dataset.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('treemapPlaceholder', { read: ViewContainerRef }) treemapContainer!: ViewContainerRef;
  @ViewChild(DatasetComponent) datasetComponent!: DatasetComponent;
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
    if (this.datasetComponent) {
      this.datasetComponent.sidebarActive = state;
      this.cdr.detectChanges();
    }
  }
}