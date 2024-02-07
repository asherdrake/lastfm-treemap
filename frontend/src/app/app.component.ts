import { ViewContainerRef, ViewChild, Component, OnInit, ComponentFactoryResolver } from '@angular/core';
import { StatsConverterService } from './stats-converter.service';
import { TreemapComponent } from './charts/treemap/treemap.component';
import { ChartStats } from './items';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  @ViewChild('treemapPlaceholder', { read: ViewContainerRef }) treemapContainer!: ViewContainerRef;

  constructor(private statsConverterService: StatsConverterService) {}

  ngOnInit(): void {
    this.statsConverterService.chartStats.subscribe((chartStats) => {
      this.loadTreemapComponent(chartStats);
    })
  }

  loadTreemapComponent(chartStats: ChartStats) {
    this.treemapContainer.clear();

    const componentRef = this.treemapContainer.createComponent(TreemapComponent);
    componentRef.instance.treemapData = componentRef.instance.transformToTreemapData(chartStats);
  }
}
