import { ViewChildren, QueryList, Component, NgZone, ChangeDetectorRef, ElementRef } from '@angular/core';
import { ChartStats, Artist, Album, TreemapViewType } from 'src/app/items';
import { CombineService } from 'src/app/combine.service';
import { FiltersService } from 'src/app/filters.service';
import { ScrobbleStorageService } from '../scrobble-storage.service';

interface Combo {
  name: string
  children: string[]
  childrenVisible: boolean
  isEditing: boolean
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
  nodes: Node[] = [];
  filteredNodes: Node[] = [];

  currentCombos: Combo[] = [];

  albumCombos: Combo[] = [];
  artistCombos: Combo[] = [];

  removedNodes: Node[] = [];

  constructor(private cdr: ChangeDetectorRef, 
              private combineService: CombineService, 
              private filters: FiltersService, 
              private storage: ScrobbleStorageService) {
    this.storage.artistCombos.subscribe({
      next: (c) => {
       // console.log("datasetcomponent: artistCombos subscription: " + c[0].name)
        this.artistCombos = c.map(combo => {
          return {
            name: combo.name,
            children: combo.children,
            childrenVisible: false,
            isEditing: false
          }
        });
        this.currentCombos = this.artistCombos
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

  fetchArtistNodesViaName(names: string[]): Node[] {
    const artists = Object.values(this.chartStats.artists).filter(a => names.includes(a.name))
    const artistNodes = artists.map(a => {
      return {
        name: a.name,
        scrobbles: a.scrobbles.length
      }
    })
    return artistNodes
  }

  fetchAlbumNodesViaName(names: string[]): Node[] {
    const albumNodes: Node[] = [];
    for (const artistKey in this.chartStats.artists) {
      const artist = this.chartStats.artists[artistKey];
      for (const albumKey in artist.albums) {
        const album = artist.albums[albumKey];
        if (names.includes(album.name)) {
          albumNodes.push({
            name: album.name,
            scrobbles: album.scrobbles.length,
            artist: artist.name
          })
        }
      }
    }
    return albumNodes
  }

  ngOnInit() {
    this.filters.state$.subscribe(filter => {
      if (filter.view === 'Artists') {
        this.currentCombos = this.artistCombos;
      } else {
        this.currentCombos = this.albumCombos;
      }
      this.currentViewType = filter.view;
      this.cdr.detectChanges();
    })
  }

  transformChartStatsArtists(chartStats: ChartStats): void {
    this.chartStats = chartStats;
    const artists: Node[] = [];
    
    // Iterate over each artist in the chartStats object
    for (const artistKey in chartStats.artists) {
        const artist = chartStats.artists[artistKey];
        artists.push({
          name: artist.name,
          scrobbles: artist.scrobbles.length
        });
    }

    const combinationNames = this.artistCombos.map(c => c.name);
    const artistsWithoutCombos = artists.filter(a => !combinationNames.includes(a.name))
    this.nodes = artistsWithoutCombos;
    this.filteredNodes = artistsWithoutCombos;
    this.removedNodes = this.fetchArtistNodesViaName(this.artistCombos.map(c => c.children).flat());
  }

  transformChartStatsAlbums(chartStats: ChartStats): void {
    this.chartStats = chartStats;
    const albums: Node[] = [];
    
    // Iterate over each artist in the chartStats object
    for (const artistKey in chartStats.artists) {
        const artist = chartStats.artists[artistKey];
        for (const albumKey in artist.albums) {
          const album = artist.albums[albumKey];
          albums.push({
            name: album.name,
            scrobbles: album.scrobbles.length,
            artist: artist.name
          });
        }
    }

    const combinationNames = this.albumCombos.map(c => c.name);
    const albumsWithoutCombos = albums.filter(a => !combinationNames.includes(a.name))
    this.nodes = albumsWithoutCombos;
    this.filteredNodes = albumsWithoutCombos;
    this.removedNodes = this.fetchAlbumNodesViaName(this.artistCombos.map(c => c.children).flat());
  }

  search(): void {
    if (!this.searchTerm) {
      this.filteredNodes = this.nodes;
    } else {
      this.filteredNodes = this.nodes.filter(node => 
        node.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  submitCombos(): void {
    const combos = this.currentCombos.map(c => {
      return {
        name: c.name,
        children: c.children
      }
    })
    this.currentViewType === 'Artists' ? this.storage.updateArtistCombos(combos) : this.storage.updateAlbumCombos(combos);
  }

  toggleChildren(combo: Combo): void {
    combo.childrenVisible = !combo.childrenVisible
  }

  deleteCombo(combo: Combo/*, event: Event*/): void {
    //event.stopPropagation();
    this.currentCombos = this.currentCombos.filter(c => c !== combo);
    const returningNodes = this.removedNodes.filter(node => combo.children.includes(node.name))
    this.removedNodes = this.removedNodes.filter(node => !combo.children.includes(node.name))
    this.nodes = [...this.nodes, ...returningNodes];
  }

  deleteChildFromCombo(name: string, combo: Combo): void {
    combo.children = combo.children.filter(a => a !== name);
    const returningNodes = this.removedNodes.filter(node => combo.children.includes(node.name))
    this.removedNodes = this.removedNodes.filter(node => !combo.children.includes(node.name))
    this.nodes = [...this.nodes, ...returningNodes];
  }

  //saving data for dragging an Artist/Album between Combos
  onDragStartBtwnCombos(event: DragEvent, name: string, sourceCombo: Combo): void {
    const dragData = {
      name: name,
      source: sourceCombo
    }

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  //saving data for dragging an artist/album from the dataset table to a Combo
  onDragStart(event: DragEvent, data: Artist | Album): void {
    const dragData = {
      data: data
    }

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }
  
  onDragOver(event: DragEvent): void {
    event.preventDefault(); // Necessary to allow the drop
  }

  onDropOnCombos(event: DragEvent, targetCombo: Combo): void {
    event.preventDefault();
    const dragDataString = event.dataTransfer?.getData('text/plain');

    if (dragDataString) {
      const dragData = JSON.parse(dragDataString);
      const name = dragData.name;
      if (dragData.source) { //true if the data was dragged from a combination
        const sourceComboName = dragData.source;
        const sourceComboIndex = this.currentCombos.findIndex(c => c.name === sourceComboName);
        this.deleteChildFromCombo(name, this.artistCombos[sourceComboIndex]);
      } else {
        // this.names = this.names.filter(n => n !== name);
        // this.filteredNames = this.filteredNames.filter(n => n !== name);
      }
      targetCombo.children = [...targetCombo.children, name];
    }
  }

  onDropOnDataset(event: DragEvent): void {
    event.preventDefault();
    const dragDataString = event.dataTransfer?.getData('text/plain');

    if (dragDataString) {
      const dragData = JSON.parse(dragDataString);
      const name = dragData.data;
      const sourceComboName = dragData.source;
      const sourceComboIndex = this.currentCombos.findIndex(c => c.name === sourceComboName);
      this.deleteChildFromCombo(name, this.currentCombos[sourceComboIndex]);
      //this.names = [...this.names, name];
    }
  }

  @ViewChildren('comboNameInput') comboNameInputElements!: QueryList<ElementRef>;
  addNewCombo(): void {
    const newCombo: Combo = {
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
