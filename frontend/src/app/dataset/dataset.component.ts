import { Component } from '@angular/core';
import { ChartStats } from 'src/app/items';
import { CombineService } from 'src/app/combine.service';
import { FiltersService } from 'src/app/filters.service';
import { ScrobbleStorageService } from '../scrobble-storage.service';
import { tap, pipe } from 'rxjs';

interface Artist {
  name: string,
  scrobbles: number,
  selected: boolean
}

interface Combination {
  name: string,
  artists: string[]
  childrenVisible: boolean
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
  combinations: Combination[] = [];

  constructor(private combineService: CombineService, private filters: FiltersService, private storage: ScrobbleStorageService) {
    this.storage.combos.subscribe({
      next: (c) => {
        this.combinations = c.map(combo => {
          return {
            name: combo.name,
            artists: combo.artists,
            childrenVisible: false
          }
        });
      }
    })
  }

  transformChartStats(chartStats: ChartStats): void {
    //this.chartStats = chartStats;
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
    this.combinations.push({
      name: this.newArtistName,
      artists: this.selectedArtists.map(a => a.name),
      childrenVisible: false
    })

    this.selectedArtists.forEach(a => a.selected = false);
    this.selectedArtists = [];
    this.searchTerm = '';
  }

  submitCombos(): void {
    const combos = this.combinations.map(c => {
      return {
        name: c.name,
        artists: c.artists
      }
    })
    this.storage.updateCombos(combos);
  }

  toggleChildren(combo: Combination): void {
    combo.childrenVisible = !combo.childrenVisible
  }

  deleteCombo(combo: Combination, event: Event): void {
    event.stopPropagation();

    this.combinations = this.combinations.filter(c => c !== combo);
  }

  deleteArtistFromCombo(artist: string, combo: Combination, event: Event): void {
    event.stopPropagation();

    combo.artists = combo.artists.filter(a => a !== artist);
  }
}
