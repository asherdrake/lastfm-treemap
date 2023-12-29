import { Component, OnInit, } from '@angular/core';
import { ScrobbleGetterService } from 'src/app/scrobblegetter.service';
import { User, Scrobble, LoadingStats, ChartStats } from 'src/app/items';
import { ScrobbleStorageService } from 'src/app/scrobble-storage.service';
import { combineLatest, tap, map, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'src/app/message.service';
import { AbstractChart } from '../abstract-chart';
import { TracksAndScrobblesScatterChart } from '../artist-scrobble-scatterchart';
import { TreemapChart } from '../treemap-chart';
import { StatsConverterService } from 'src/app/stats-converter.service';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartComponent implements OnInit{
  playcount: string = '';
  url: string = '';
  scrobblesFetched: number = 0;
  pageNumber: number = 0;
  totalPages: number = 0;
  charts: AbstractChart[];
  constructor (private statsConverterService: StatsConverterService, private scrobbleGetterService : ScrobbleGetterService, private storage: ScrobbleStorageService, private messages: MessageService) {
    this.charts = [
      new TreemapChart(),
      new TracksAndScrobblesScatterChart()
    ]
    this.statsConverterService.chartStats.pipe(takeUntilDestroyed()).subscribe(stats => this.updateCharts(stats));

    this.storage.loadingStatus.pipe(takeUntilDestroyed()).subscribe(status => {
      this.pageNumber = status[1];
      this.totalPages = status[2];
    })
  }

  updateTestStats(scrobbles: Scrobble[], currPage: number, totalPages: number) {
    this.log("updatingTestStats");
    this.scrobblesFetched = scrobbles.length;
    this.pageNumber = currPage;
    this.totalPages = totalPages;
    this.messages.add(`fetched page ${this.pageNumber}, out of ${this.totalPages} total pages, with ${this.scrobblesFetched} scrobbles fetched.`);
  }

  updateCharts(stats: ChartStats): void {
    this.charts.forEach(chart => chart.update(stats));
  }

  ngOnInit(): void {
    this.scrobbleGetterService.initializeFetching('RashCream', this.storage);
  }
  
  private log(message: string) {
    this.messages.add(`ChartComponent: ${message}`);
  }
}
