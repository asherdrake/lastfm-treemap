import { ViewChildren, QueryList, Component, NgZone, ChangeDetectorRef, ElementRef } from '@angular/core';
import { ChartStats } from 'src/app/items';
import { CombineService } from 'src/app/combine.service';
import { FiltersService } from 'src/app/filters.service';
import { ScrobbleStorageService } from '../scrobble-storage.service';
import { drag } from 'd3';
//import { tap, pipe } from 'rxjs';

interface Artist {
  name: string,
  scrobbles: number,
}

interface Combination {
  name: string,
  artists: string[],
  childrenVisible: boolean,
  isEditing: boolean
}

@Component({
  selector: 'app-dataset',
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.css']
})
export class DatasetComponent {
  artists: string[] = [];
  searchTerm: string = '';
  filteredArtists: string[] = [];
  newArtistName: string = '';
  combinations: Combination[] = [];

  constructor(private cdr: ChangeDetectorRef, private combineService: CombineService, private filters: FiltersService, private storage: ScrobbleStorageService) {
    this.storage.combos.subscribe({
      next: (c) => {
        this.combinations = c.map(combo => {
          return {
            name: combo.name,
            artists: combo.artists,
            childrenVisible: false,
            isEditing: false
          }
        });
      }
    })
  }

  transformChartStats(chartStats: ChartStats): void {
    //this.chartStats = chartStats;
    const artists: string[] = [];
    
    // Iterate over each artist in the chartStats object
    for (const artistKey in chartStats.artists) {
        const artist = chartStats.artists[artistKey];
        // Aggregate scrobbles counts. Assuming we sum them up
        //const totalScrobbles = artist.scrobbles.reduce((acc, curr) => acc + curr, 0);
        
        // Transform into the SimplifiedArtist format
        const simplifiedArtist: Artist = {
            name: artist.name,
            scrobbles: artist.scrobbles.length
        };

        artists.push(artist.name);
    }

    const combinationNames = this.combinations.map(c => c.name);
    const artistsWithoutCombos = artists.filter(a => !combinationNames.includes(a))
    this.artists = artistsWithoutCombos;
    this.filteredArtists = artistsWithoutCombos;
  }

  search(): void {
    if (!this.searchTerm) {
      this.filteredArtists = this.artists;
    } else {
      this.filteredArtists = this.artists.filter(artist => 
        artist.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
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

  deleteCombo(combo: Combination/*, event: Event*/): void {
    //event.stopPropagation();

    this.combinations = this.combinations.filter(c => c !== combo);
    this.artists = [...this.artists, ...combo.artists];
  }

  deleteArtistFromCombo(artist: string, combo: Combination/*, event: Event*/): void {
    //event.stopPropagation();

    combo.artists = combo.artists.filter(a => a !== artist);
  }

  onDragStartBtwnCombos(event: DragEvent, artistName: string, sourceCombo: Combination): void {
    const dragData = {
      name: artistName,
      source: sourceCombo.name
    }

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  onDragStart(event: DragEvent, artistName: string): void {
    const dragData = {
      name: artistName
    }

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }
  
  onDragOver(event: DragEvent): void {
    event.preventDefault(); // Necessary to allow the drop
  }

  onDropOnCombos(event: DragEvent, targetCombo: Combination): void {
    event.preventDefault();
    const dragDataString = event.dataTransfer?.getData('text/plain');

    if (dragDataString) {
      const dragData = JSON.parse(dragDataString);
      const artistName = dragData.name;
      if (dragData.source) {
        const sourceComboName = dragData.source;

        const sourceComboIndex = this.combinations.findIndex(c => c.name === sourceComboName);
        this.deleteArtistFromCombo(artistName, this.combinations[sourceComboIndex]);
      } else {
        this.artists = this.artists.filter(a => a !== artistName);
        this.filteredArtists = this.filteredArtists.filter(a => a !== artistName);
      }
      targetCombo.artists = [...targetCombo.artists, artistName];
      //sourceCombo.artists.forEach(a => console.log(a));
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const dragDataString = event.dataTransfer?.getData('text/plain');

    if (dragDataString) {
      const dragData = JSON.parse(dragDataString);
      const artistName = dragData.name;
      const sourceComboName = dragData.source;

      const sourceComboIndex = this.combinations.findIndex(c => c.name === sourceComboName);
      this.deleteArtistFromCombo(artistName, this.combinations[sourceComboIndex]);
      this.artists = [...this.artists, artistName];
    }
  }

  @ViewChildren('comboNameInput') comboNameInputElements!: QueryList<ElementRef>;
  addNewCombo(): void {
    const newCombo: Combination = {
      name: '',
      artists: [],
      childrenVisible: false,
      isEditing: true
    };
    this.combinations.push(newCombo);
    this.cdr.detectChanges();

    setTimeout(() => {
      const inputElements = this.comboNameInputElements.toArray();
      const lastInput = inputElements[inputElements.length - 1];
      lastInput.nativeElement.focus();
    }, 0);
  }

  editComboName(combo: Combination): void {
    combo.isEditing = true;
  }

  updateComboName(event: Event, combo: Combination): void {
    const inputElement = event.target as HTMLInputElement;
    combo.name = inputElement.value;

    if (event.type === 'blur' || (event as KeyboardEvent).key === 'Enter') {
      combo.isEditing = false;
      this.cdr.detectChanges();
    }
  }
}
