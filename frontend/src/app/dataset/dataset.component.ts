import { ViewChildren, QueryList, Component, NgZone, ChangeDetectorRef, ElementRef } from '@angular/core';
import { ChartStats, Artist, Album, TreemapViewType } from 'src/app/items';
import { CombineService } from 'src/app/combine.service';
import { FiltersService } from 'src/app/filters.service';
import { ScrobbleStorageService } from '../scrobble-storage.service';

interface Combo {
  name: string
  //children: [string,string][]
  childrenVisible: boolean
  isEditing: boolean
}

interface ArtistCombo extends Combo {
  children: Artist[]
}

interface AlbumCombo extends Combo {
  children: Album[]
}

interface Node {
  name: string
  scrobbles: number
  artist?: string
}

@Component({
  selector: 'app-dataset',
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.css']
})
export class DatasetComponent {
  chartStats: ChartStats = { artists: {} };

  searchTerm: string = '';
  newComboName: string = '';
  currentViewType: TreemapViewType = 'Artists';

  artists: Artist[] = [];
  filteredArtists: Artist[] = [];
  artistCombos: ArtistCombo[] = [];

  albums: Album[] = [];
  filteredAlbums: Album[] = [];
  albumCombos: AlbumCombo[] = [];

  constructor(private cdr: ChangeDetectorRef, 
              private combineService: CombineService, 
              private filters: FiltersService, 
              private storage: ScrobbleStorageService) {
    this.storage.artistCombos.subscribe({
      next: (c) => {
        this.artistCombos = c.map(combo => {
          return {
            name: combo.name,
            children: combo.children,
            childrenVisible: false,
            isEditing: false
          }
        });
      }
    })

    this.storage.albumCombos.subscribe({
      next: (c) => {
        this.albumCombos = c.map(combo => {
          return {
            name: combo.name,
            children: combo.children,
            childrenVisible: false,
            isEditing: false
          }
        })
      }
    })
  }

  ngOnInit() {
    this.filters.state$.subscribe(filter => {
      this.currentViewType = filter.view;
      this.cdr.detectChanges();
    })
  }

  transformChartStatsArtists(chartStats: ChartStats): void {
    this.chartStats = chartStats;
    const artists: Artist[] = [];
    
    // Iterate over each artist in the chartStats object
    for (const artistKey in chartStats.artists) {
        const artist = chartStats.artists[artistKey];
        artists.push(artist);
    }

    const combinationNames = this.artistCombos.map(c => c.name);
    const artistsWithoutCombos = artists.filter(a => !combinationNames.includes(a.name))
    this.artists = artistsWithoutCombos;
    this.filteredArtists = artistsWithoutCombos;
  }

  transformChartStatsAlbums(chartStats: ChartStats): void {
    this.chartStats = chartStats;
    const albums: Album[] = [];
    
    // Iterate over each artist in the chartStats object
    for (const artistKey in chartStats.artists) {
        const artist = chartStats.artists[artistKey];
        for (const albumKey in artist.albums) {
          const album = artist.albums[albumKey];
          albums.push(album);
        }
    }

    const combinationNames = this.albumCombos.map(c => c.name);
    const albumsWithoutCombos = albums.filter(a => !combinationNames.includes(a.name))
    this.albums = albumsWithoutCombos;
    this.filteredAlbums = albumsWithoutCombos;
  }

  searchArtists(): void {
    if (!this.searchTerm) {
      this.filteredArtists = this.artists;
    } else {
      this.filteredArtists= this.artists.filter(artist => 
        artist.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  searchAlbums(): void {
    if (!this.searchTerm) {
      this.filteredAlbums = this.albums;
    } else {
      this.filteredAlbums = this.albums.filter(album => 
        album.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  submitArtistCombos(): void {
    const combos = this.artistCombos.map(c => {
      return {
        name: c.name,
        children: c.children
      }
    })
    this.storage.updateArtistCombos(combos);
  }
  
  submitAlbumCombos(): void {
    const combos = this.albumCombos.map(c => {
      return {
        name: c.name,
        children: c.children
      }
    })
    this.storage.updateAlbumCombos(combos);
  }

  toggleChildren(combo: Combo): void {
    combo.childrenVisible = !combo.childrenVisible
  }

  deleteArtistCombo(combo: ArtistCombo/*, event: Event*/): void {
    //event.stopPropagation();
    this.artistCombos = this.artistCombos.filter(c => c !== combo);
    this.artists = [...this.artists, ...combo.children];
  }

  deleteAlbumCombo(combo: AlbumCombo/*, event: Event*/): void {
    //event.stopPropagation();
    this.albumCombos = this.albumCombos.filter(c => c !== combo);
    this.albums = [...this.albums, ...combo.children];
  }

  deleteChildFromArtistCombo(artist: Artist, combo: ArtistCombo): void {
    combo.children = combo.children.filter(a => a.name !== artist.name);
    this.artists = [...this.artists, artist];
  }

  deleteChildFromAlbumCombo(album: Album, combo: AlbumCombo): void {
    combo.children = combo.children.filter(a => a.name !== album.name);
    this.albums = [...this.albums, album];
  }

  //saving data for dragging an Artist/Album between Combos or from Combo to dataset
  onDragStartBtwnArtistCombos(event: DragEvent, artist: Artist, sourceCombo: Combo): void {
    const dragData = {
      artist: artist,
      source: sourceCombo
    }

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  onDragStartBtwnAlbumCombos(event: DragEvent, album: Album, sourceCombo: Combo): void {
    const dragData = {
      album: album,
      source: sourceCombo
    }

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  //saving data for dragging an artist/album from the dataset table to a Combo
  onDragStartArtists(event: DragEvent, artist: Artist): void {
    const dragData = {
      artist: artist
    }

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  onDragStartAlbums(event: DragEvent, album: Album): void {
    const dragData = {
        album: album
    };
    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }


  onDragOver(event: DragEvent): void {
    event.preventDefault(); // Necessary to allow the drop
  }

  onDropOnArtistCombos(event: DragEvent, targetCombo: ArtistCombo): void {
    event.preventDefault();
    const dragDataString = event.dataTransfer?.getData('text/plain');

    if (dragDataString) {
      const dragData = JSON.parse(dragDataString);
      const artist: Artist = dragData.artist;
      if (dragData.source) { //true if the data was dragged from a combination
        const sourceComboName = dragData.source;
        const sourceComboIndex = this.artistCombos.findIndex(c => c.name === sourceComboName);
        this.deleteChildFromArtistCombo(artist, this.artistCombos[sourceComboIndex]);
      } else {
        this.artists = this.artists.filter(a => a.name !== artist.name);
        this.filteredArtists = this.filteredArtists.filter(a => a.name !== artist.name);
      }
      targetCombo.children = [...targetCombo.children, artist];
    }
  }

  onDropOnAlbumCombos(event: DragEvent, targetCombo: AlbumCombo): void {
    event.preventDefault();
    const dragDataString = event.dataTransfer?.getData('text/plain');
    if (dragDataString) {
        const dragData = JSON.parse(dragDataString);
        const album: Album = dragData.album;
        if (dragData.source) { // true if the data was dragged from another combo
            const sourceComboName = dragData.source.name;
            const sourceComboIndex = this.albumCombos.findIndex(c => c.name === sourceComboName);
            this.deleteChildFromAlbumCombo(album, this.albumCombos[sourceComboIndex]);
        } else {
            this.albums = this.albums.filter(a => !(a.name === album.name && a.artistName === album.artistName));
            this.filteredAlbums = this.filteredAlbums.filter(a => !(a.name === album.name && a.artistName === album.artistName));
        }
        targetCombo.children = [...targetCombo.children, album];
    }
  }

  onDropOnArtistDataset(event: DragEvent): void {
    event.preventDefault();
    const dragDataString = event.dataTransfer?.getData('text/plain');

    if (dragDataString) {
      const dragData = JSON.parse(dragDataString);
      const artist: Artist = dragData.artist;
      const sourceComboName = dragData.source.name;
      const sourceComboIndex = this.artistCombos.findIndex(c => c.name === sourceComboName);
      const sourceCombo = this.artistCombos[sourceComboIndex]
      console.log("sourceCombo: " + sourceCombo);
      this.deleteChildFromArtistCombo(artist, sourceCombo);
      this.artists = [...this.artists, artist];
    }
  }

  onDropOnAlbumDataset(event: DragEvent): void {
    event.preventDefault();
    const dragDataString = event.dataTransfer?.getData('text/plain');
    if (dragDataString) {
        const dragData = JSON.parse(dragDataString);
        const album: Album = dragData.album;
        const sourceComboName = dragData.source.name;
        const sourceComboIndex = this.albumCombos.findIndex(c => c.name === sourceComboName);
        const sourceCombo = this.albumCombos[sourceComboIndex];
        console.log("sourceCombo: " + sourceCombo);
        this.deleteChildFromAlbumCombo(album, sourceCombo);
        this.albums = [...this.albums, album];
    }
  }

  @ViewChildren('comboNameInput') comboNameInputElements!: QueryList<ElementRef>;
  addNewArtistCombo(): void {
    const newCombo: ArtistCombo = {
      name: '',
      children: [],
      childrenVisible: false,
      isEditing: true
    };


    this.artistCombos.push(newCombo);
    this.cdr.detectChanges();

    setTimeout(() => {
      const inputElements = this.comboNameInputElements.toArray();
      const lastInput = inputElements[inputElements.length - 1];
      lastInput.nativeElement.focus();
    }, 0);
  }

  addNewAlbumCombo(): void {
    const newCombo: AlbumCombo = {
        name: '',
        children: [],
        childrenVisible: false,
        isEditing: true
    };
    this.albumCombos.push(newCombo);
    this.cdr.detectChanges();
    setTimeout(() => {
        const inputElements = this.comboNameInputElements.toArray();
        const lastInput = inputElements[inputElements.length - 1];
        lastInput.nativeElement.focus();
    }, 0);
  }

  editComboName(combo: Combo): void {
    combo.isEditing = true;
  }

  updateComboName(event: Event, combo: Combo): void {
    const inputElement = event.target as HTMLInputElement;
    combo.name = inputElement.value;

    if (event.type === 'blur' || (event as KeyboardEvent).key === 'Enter') {
      combo.isEditing = false;
      this.cdr.detectChanges();
    }
  }
}
