import { ComponentRef, ViewContainerRef, ViewChild, Component, OnInit, ComponentFactoryResolver, ChangeDetectorRef } from '@angular/core';
import { StatsConverterService } from './stats-converter.service';
import { TreemapComponent } from './treemap/treemap.component';
import { ChartStats } from './items';
import { ScrobbleStorageService } from './scrobble-storage.service';
import { tap } from 'rxjs';
import { FiltersService } from './filters.service';
import { DatasetComponent } from './dataset/dataset.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  @ViewChild('treemapPlaceholder', { read: ViewContainerRef }) treemapContainer!: ViewContainerRef;
  @ViewChild(DatasetComponent) datasetComponent!: DatasetComponent;
  private currentTreemapComponentRef: ComponentRef<TreemapComponent> | null = null;
  view: string = "Artists"
  constructor(
    private statsConverterService: StatsConverterService, 
    private storage: ScrobbleStorageService, 
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
    this.statsConverterService.getChartStatsObservable().subscribe({
      next: (chartStats) => {
        this.loadTreemapComponent(chartStats!);
      }
    })
  }

  loadTreemapComponent(chartStats: ChartStats) {
    this.treemapContainer.clear();
    console.log("treemapContainer cleared")

    const componentRef = this.treemapContainer.createComponent(TreemapComponent);
    if (this.view === "Artists") {
      console.log(this.view + " if")
      componentRef.instance.treemapData = componentRef.instance.transformToTreemapData(chartStats);
      componentRef.instance.initializeTreemap();
      this.datasetComponent.transformChartStats(chartStats);
    } else {
      console.log(this.view + " else")
      componentRef.instance.treemapData = componentRef.instance.transformToTreemapDataAlbums(chartStats);
      componentRef.instance.initializeTreemap();
      this.datasetComponent.transformChartStats(chartStats);
    }
  }
}