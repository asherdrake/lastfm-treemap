import { Component, OnInit } from '@angular/core';
import { ScrobbleStorageService } from '../scrobble-storage.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScrobbleGetterService } from '../scrobblegetter.service';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.css']
})
export class LoadingComponent implements OnInit {
  scrobblesFetched: number = 0;
  pageNumber: number = 0;
  totalPages: number = 0;

  constructor(private storage: ScrobbleStorageService, private scrobbleGetterService: ScrobbleGetterService) {
    this.storage.loadingStatus.pipe(takeUntilDestroyed()).subscribe(status => {
      this.scrobblesFetched = status[0].length;
      this.pageNumber = status[1];
      this.totalPages = status[2];
    })
  }

  ngOnInit(): void {
    this.scrobbleGetterService.initializeFetching('RashCream', this.storage);
  }
}
