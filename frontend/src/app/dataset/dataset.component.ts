import { Component } from '@angular/core';
import { ChartStats } from 'src/app/items';
import { CombineService } from 'src/app/combine.service';

interface Artist {
  name: string,
  scrobbles: number,
  selected: boolean
}

@Component({
  selector: 'app-dataset',
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.css']
})
export class DatasetComponent {
  artists: Artist[] = [];
  searchTerm: string = '';
  filteredArtists: Artist[] = [];
  selectedArtists: Artist[] = [];
  newArtistName: string = '';

  constructor(private combineService: CombineService) {}

  transformChartStats(chartStats: ChartStats): void {
    const artists: Artist[] = [];
    
    // Iterate over each artist in the chartStats object
    for (const artistKey in chartStats.artists) {
        const artist = chartStats.artists[artistKey];
        // Aggregate scrobbles counts. Assuming we sum them up
        //const totalScrobbles = artist.scrobbles.reduce((acc, curr) => acc + curr, 0);
        
        // Transform into the SimplifiedArtist format
        const simplifiedArtist: Artist = {
            name: artist.name,
            scrobbles: artist.scrobbles.length,
            selected: false // Assuming default is false as no criteria is provided
        };

        artists.push(simplifiedArtist);
    }

    this.artists = artists;
    this.filteredArtists = artists;
  }

  search(): void {
    if (!this.searchTerm) {
      this.filteredArtists = this.artists;
    } else {
      this.filteredArtists = this.artists.filter(artist => 
        artist.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  onArtistCheckboxChange(artist: Artist, event: Event): void {
    const inputElement = event.target as HTMLInputElement;

    if (inputElement.checked) {
      this.selectedArtists = [...this.selectedArtists, artist];
      console.log("checkbox changed added");
    } else {
      this.selectedArtists = this.selectedArtists.filter(a => a !== artist);
      console.log("checkbox changed deleted");
    }

    this.selectedArtists.forEach(artist => console.log(artist.name));
  }

  onRemoveClick(artist: Artist): void {
    artist.selected = false;
    this.selectedArtists = this.selectedArtists.filter(a => a !== artist);
  }

  combineSelected(): void {
    
  }
}
