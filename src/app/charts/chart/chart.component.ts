import { Component, OnInit } from '@angular/core';
import { ScrobbleGetterService } from 'src/app/scrobblegetter.service';
import { User } from 'src/app/items';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartComponent implements OnInit{
  playcount: string = '';
  url: string = '';

  constructor (private scrobbleGetterService : ScrobbleGetterService) {}

  ngOnInit(): void {
    this.getUser('RashCream');
  }
  
  getUser(username: string): void {
    this.scrobbleGetterService.getUser(username)
      .subscribe((user => {
        this.playcount = user.playcount
        this.url = user.url;
      }));
  }
}
