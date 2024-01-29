import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { RGBColor } from 'd3';
import { ChartStats } from 'src/app/items';
import { tap, take, finalize, combineLatest, filter, map, BehaviorSubject, distinctUntilChanged, Subject } from 'rxjs';
import { StatsConverterService } from 'src/app/stats-converter.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScrobbleGetterService } from 'src/app/scrobblegetter.service';
import { ScrobbleStorageService } from 'src/app/scrobble-storage.service';
import { FiltersService } from 'src/app/filters.service';

interface TreeNode {
  name: string;
  value?: number;
  children?: TreeNode[];
  image?: string;
}

@Component({
  selector: 'app-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.css']
})
export class TreemapComponent/* implements OnInit */{
  treemapData: TreeNode = {} as TreeNode;
  width: number = 1500;
  height: number = 1500;
  scrobblesFetched: number = 0;
  pageNumber: number = 0;
  totalPages: number = 0;
  hierarchy: d3.HierarchyNode<TreeNode> = {} as d3.HierarchyNode<TreeNode>;
  root: d3.HierarchyRectangularNode<TreeNode> = {} as d3.HierarchyRectangularNode<TreeNode>;
  x: d3.ScaleLinear<number, number, never> = {} as d3.ScaleLinear<number, number, never>;
  y: d3.ScaleLinear<number, number, never> = {} as d3.ScaleLinear<number, number, never>;
  svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> = {} as d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  group: d3.Selection<SVGGElement, unknown, HTMLElement, any> = {} as d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  currentRoot: d3.HierarchyRectangularNode<TreeNode> = {} as d3.HierarchyRectangularNode<TreeNode>;
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown> = {} as d3.ZoomBehavior<SVGSVGElement, unknown>;
  currentDepth: number = 0;
  username: string = '';
  startDate: string = '';
  endDate: string = '';
  constructor(private filters: FiltersService, private statsConverterService: StatsConverterService, private scrobbleGetterService: ScrobbleGetterService, private storage: ScrobbleStorageService) {
    /*combineLatest([
      this.statsConverterService.chartStats,
      this.storage.loadingStatus
    ])
    .pipe(
      tap(([_, loadingStatus]) => {
        this.scrobblesFetched = loadingStatus[0].length;
        this.pageNumber = loadingStatus[1];
        this.totalPages = loadingStatus[2];
      }),
      filter(([_, loadingStatus]) => loadingStatus[2] - loadingStatus[1] === loadingStatus[2] && loadingStatus[2] !== 0),
      take(1),
      map(([chartStats, _]) => this.transformToTreemapData(chartStats))
    )
    */
    this.storage.loadingStatus.pipe(
      map(loadingStatus => {
        this.scrobblesFetched = loadingStatus[0].length;
        this.pageNumber = loadingStatus[1];
        this.totalPages = loadingStatus[2];
      })
    ).subscribe();

    this.statsConverterService.chartStats
    .pipe(
      map(chartStats => this.transformToTreemapData(chartStats))
    )
    .subscribe({
      next: (data) => {
        console.log("Observable emitted: " + data);
        this.treemapData = data;
        this.initializeTreemap();
      },
      error: (err) => console.error('Error while fetching treemap data:', err)
    });

    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on("zoom", (event) => {
        this.group.attr("transform", event.transform);
      })

    this.renderNode = this.renderNode.bind(this);
    this.positionSelection = this.positionSelection.bind(this);
    this.positionTransition = this.positionTransition.bind(this);
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.updateTreemap = this.updateTreemap.bind(this);
    this.updateScales = this.updateScales.bind(this);
    this.calculateFontSize = this.calculateFontSize.bind(this);
  };

  transformToTreemapData(stats: ChartStats): TreeNode {
    const treemapData = {
      name: "ChartStats",
      children: Object.keys(stats.artists).map(artistKey => {
          const artist = stats.artists[artistKey];
          return {
              name: artist.name,
              children: Object.keys(artist.albums).map(albumKey => {
                  const album = artist.albums[albumKey];
                  return {
                      name: album.name,
                      children: Object.keys(album.tracks).map(trackKey => {
                          const track = album.tracks[trackKey];
                          return {
                              name: track.name,
                              value: track.scrobbles.length // or another metric for value
                          };
                      }),
                      image: album.image_url
                  };
              }),
              image: artist.image_url
          };
      })
    };
    return treemapData
  }

  calculateScrobblesForArtist(treemapData: TreeNode, artistName: string) {
    let totalScrobbles = 0;

    // Find the artist in the treemap data
    const artistNode = treemapData.children!.find(child => child.name === artistName);

    if (artistNode && artistNode.children) {
        // Iterate over all albums of the artist
        artistNode.children.forEach(album => {
            if (album.children) {
                // Iterate over all tracks of the album
                album.children.forEach(track => {
                    // Sum up the scrobbles
                    totalScrobbles += track.value!;
                });
            }
        });
    }

    return totalScrobbles;
}

  startFetching(): void {
    this.updateDateRange();
    this.scrobbleGetterService.initializeFetching(this.username, this.startDate, this.endDate, this.storage);
  }

  applySettings(): void {
    this.group.remove();
    this.updateDateRange();
  }

  updateDateRange(): void {
    const startDate = Date.parse(this.startDate);
    const endDate = Date.parse(this.endDate);
    this.filters.updateDateRange({startDate, endDate});
  }

  initializeTreemap(): void {
    console.log("Initializing treemap"/* with data:", this.treemapData*/);
    //computing layout
    this.hierarchy = d3.hierarchy(this.treemapData)
      .sum((d: any) => d.value);
    this.root = d3.treemap<TreeNode>().tile(d3.treemapBinary)(this.hierarchy);

    //creating scales
    this.x = d3.scaleLinear().rangeRound([0, this.width]);
    this.y = d3.scaleLinear().rangeRound([0, this.height]);

    //creating svg container
    this.svg = d3.select("#treemap-container").select("svg");

    if (this.svg.empty()) {
      this.svg = d3.select('#treemap-container').append("svg");
    }
    this.svg
      .attr("viewBox", [0.5, -30.5, this.width, this.height + 30])
      .attr("width", this.width)
      .attr("height", this.height + 30)
      .style("font", "10px sans-serif")
      .call(this.zoom);

    //display the root
    this.group = this.svg.append("g")

    this.currentRoot = this.root;
    this.updateTreemap();
  }

  renderNode(group: d3.Selection<SVGGElement, unknown, HTMLElement, any>, root: d3.HierarchyRectangularNode<TreeNode>) {
    //console.log("Root: " + root.toString);
    //console.log("Root children: " + root.children);
    const node = group
      .selectAll("g")
      .data(root.children!/*.concat(root)*/)
      .join("g");

    node.filter((d: any) => d === root ? d.parent : d.children)
      .attr("cursor", "pointer")
      .on("click", (event, d) => d === root ? this.zoomOut() : this.zoomIn(d));

    node.append("rect")
      .attr('width', d => { return d.x1 - d.x0 })
      .attr('height', d => { return d.y1 - d.y0 })
      .attr("fill", d => d === root ? "#fff" : d.children ? "#ccc" : "#ddd")
      .attr("stroke", "#fff");

    const self = this;

    node.append("text")
      .attr("font-weight", d => d === root ? "bold" : null)
      .attr("font-size", d => `${self.calculateFontSize(d)}px`)
      .each(function(d) {
        d3.select(this)
          .selectAll("tspan")
          .data((d: any) => (d.data.name + " " + d.value).split(" "/*/(?=[A-Z][^A-Z])/g*/))
          .join("tspan")
          .attr("x", () => {
            const font_size = self.calculateFontSize(d);
            return font_size * 0.3
          })
          .attr("y", (childD, i) => {
            const font_size = self.calculateFontSize(d);
            return (font_size * 1.2) + i * (font_size * 1.2)
          })
          .attr("fill-opacity", (childD, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
          .attr("font-weight", (childD, i, nodes) => i === nodes.length - 1 ? "normal" : null)
          .text((childD: any) => childD);
      })
    
    if (this.currentDepth == 0 || this.currentDepth == 1) {
      node.append("image")
        .attr("width", d => this.x(d.x1) - this.x(d.x0))
        .attr("height", d => {
         // console.log(d.data.image);
          return this.y(d.y1) - this.y(d.y0)
        })
        .attr("href", d => {
          //console.log(d.data.name + ": " + d.data.image);
          return d.data.image!
        })
    }
    
    group.call(this.positionSelection, root);
  }

  calculateFontSize(d: d3.HierarchyRectangularNode<TreeNode>): number {
    let width = this.x(d.x1) - this.x(d.x0);
    let height = this.y(d.y1) - this.y(d.y0);
    return Math.min((width * 0.1), (height * 0.1))
  }

  positionSelection(group: d3.Selection<SVGGElement, unknown, HTMLElement, any>, root: d3.HierarchyRectangularNode<TreeNode>) {
    group.selectAll("g")
        .attr("transform", (d: any) => d === root ? `translate(0,-30)` : `translate(${this.x(d.x0)},${this.y(d.y0)})`)
      .select("rect")
        .attr("width", (d: any) => d === root ? this.width : this.x(d.x1) - this.x(d.x0))
        .attr("height", (d: any) => d === root ? 30 : this.y(d.y1) - this.y(d.y0));
  }

  positionTransition(group: d3.Transition<SVGGElement, unknown, HTMLElement, any>, root: d3.HierarchyRectangularNode<TreeNode>) {
    group.selectAll("g")
      .transition()
      .duration(750)
      .attr("transform", (d: any) => `translate(${this.x(d.x0)},${this.y(d.y0)})`);
  
    group.selectAll("rect")
      .transition()
      .duration(750)
      .attr("width", (d: any) => this.x(d.x1) - this.x(d.x0))
      .attr("height", (d: any) => this.y(d.y1) - this.y(d.y0));
  }

  zoomIn(node: d3.HierarchyRectangularNode<TreeNode>) {
    this.currentDepth++;
    this.currentRoot = node;
    this.updateScales(node);
    this.updateTreemap();
  }

  zoomOut() {
    if (this.currentDepth > 0) {
      this.currentDepth--;
    }
    console.log("Zoom Out button clicked")
    if (this.currentRoot.parent) {
      this.currentRoot = this.currentRoot.parent;
      this.updateScales(this.currentRoot);
      this.updateTreemap();
    }
  }

  updateScales(node: d3.HierarchyRectangularNode<TreeNode>) {
    // Set the x and y scales to match the dimensions of the new root node
    this.x.domain([node.x0, node.x1]);
    this.y.domain([node.y0, node.y1]);
  }

  updateTreemap() {
    this.group.remove();
    this.group = this.svg.append("g");
    this.group.call(this.renderNode, this.currentRoot);
  }
}
