import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { Scrobble, ChartStats, TreeNode, ScrobblesJSON } from 'src/app/items';
import { StatsConverterService } from 'src/app/stats-converter.service';
import { ScrobbleGetterService } from 'src/app/scrobblegetter.service';
import { ScrobbleStorageService } from 'src/app/scrobble-storage.service';
import { FilterState, FiltersService } from 'src/app/filters.service';
import { BaseType } from 'd3';
import { takeUntil, bufferCount, take } from 'rxjs/operators';
import { Subject } from 'rxjs';
import textFit from 'textfit';

@Component({
  selector: 'app-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TreemapComponent implements OnInit {
  treemapData: TreeNode = {} as TreeNode;
  width: number = 2500;
  height: number = 2500;
  hierarchy: d3.HierarchyNode<TreeNode> = {} as d3.HierarchyNode<TreeNode>;
  root: d3.HierarchyRectangularNode<TreeNode> = {} as d3.HierarchyRectangularNode<TreeNode>;
  tooltip: d3.Selection<BaseType, unknown, HTMLElement, any> = {} as d3.Selection<BaseType, unknown, HTMLElement, any>;
  x: d3.ScaleLinear<number, number, never> = {} as d3.ScaleLinear<number, number, never>;
  y: d3.ScaleLinear<number, number, never> = {} as d3.ScaleLinear<number, number, never>;
  svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> = {} as d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  group: d3.Selection<SVGGElement, unknown, HTMLElement, any> = {} as d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  currentRoot: d3.HierarchyRectangularNode<TreeNode> = {} as d3.HierarchyRectangularNode<TreeNode>;
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown> = {} as d3.ZoomBehavior<SVGSVGElement, unknown>;
  currentDepth: number = 0;
  currentTransform: [number, number, number] = [this.width / 2, this.height / 2, this.height];
  target: [number, number, number] = [this.width / 2, this.height / 2, this.height / 4];
  initialScale = 0.2; // This means 50% zoom level (zoomed out)
  initialX = this.width * 0.1; // Centering on the X axis
  initialY = this.height * 0.1; // Centering on the Y axis
  filterState: FilterState = {} as FilterState;

  constructor(private filters: FiltersService, private statsConverterService: StatsConverterService, private scrobbleGetterService: ScrobbleGetterService, private storage: ScrobbleStorageService) {
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0, Infinity])
      .on("zoom", (event) => {
        this.group.attr("transform", event.transform);
        this.currentTransform = [event.transform.x, event.transform.y, event.transform.k];
      })

    this.positionSelection = this.positionSelection.bind(this);
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.updateTreemap = this.updateTreemap.bind(this);
    this.updateScales = this.updateScales.bind(this);
    this.calculateFontSize = this.calculateFontSize.bind(this);

    let finChartStats: ChartStats;
    const finished = new Subject<void>();

    this.statsConverterService.filteredChartStats.pipe(
      bufferCount(10, 10), //collects emission in buffers of 5, every 5 emissions
      takeUntil(finished)
    ).subscribe((statsArray: ChartStats[]) => {
      console.log("ChartStats received in treemap component");
      const stats = statsArray[statsArray.length - 1]; //renders every 5th emission
      this.transformToTreemapData(stats);
      this.updateTreemap();
    });

    this.statsConverterService.finishedChartStats.subscribe((stats: ChartStats) => {
      console.log("FINISHED ChartStats received in treemap component");
      finChartStats = stats;
      this.transformToTreemapData(stats);
      this.updateTreemap();

      if (!finished.complete) {
        finished.next();
        finished.complete();
      }
    });

    this.filters.state$.subscribe((state) => {
      this.filterState = state;
    });
  };

  ngOnInit(): void {
    console.log("ngOnInit");
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.initializeTreemap();
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  initializeTreemap(): void {
    console.log("Initializing treemap"/* with data:", this.treemapData*/);

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

    this.tooltip = d3.select("#tooltip")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "2px")
      .style("border-radius", "5px")
      .style("padding", "5px")

    //display the root
    this.group = this.svg.append("g")

    this.svg.call(this.zoom)
    //.on("dblclick.zoom", null);

    this.currentRoot = this.root;
    this.updateTreemap();
  }

  updateTreemap() {
    const self = this;
    console.log("UPDATE TREEMAP");
    this.group.selectAll(".album-background").remove();

    // Recalculate the hierarchy with the updated data
    this.hierarchy = d3.hierarchy(this.treemapData)
      .sum((d: any) => d.value);

    if ((this.filterState.view === "Artists" && this.currentDepth === 0) || (this.filterState.view === "Albums" && this.currentDepth === 1) || (this.filterState.view === "Tracks" && this.currentDepth === 2)) {
      this.currentRoot = d3.treemap<TreeNode>().tile(d3.treemapBinary)(this.hierarchy);
    }
    console.log('currentRoot:', this.currentRoot.data.name);

    // Join the data with the existing elements
    const node = this.group.selectAll<SVGGElement, d3.HierarchyRectangularNode<TreeNode>>("g")
      .data(this.currentRoot.children!, (d: any) => d.data.name + d.depth);

    const nodeEnter = node.enter().append("g");
    nodeEnter.append("rect");
    const nodeUpdate = nodeEnter.merge(node);

    this.appendRectangles(nodeUpdate);
    this.addTooltips(nodeUpdate);

    if (this.currentDepth === 0 || this.currentDepth === 1) {
      nodeEnter.append("image");
      this.appendImages(nodeUpdate);
      nodeUpdate.attr("cursor", "pointer")
        .on("click", (event, d) => this.zoomIn(d));
    } else if (this.currentDepth === 2) {
      nodeEnter.append('foreignObject');
      this.appendTrackText(nodeUpdate);
      this.backgroundImage();
    }

    // Handle exiting elements
    node.exit().remove();

    // Apply transformations;
    this.group.call(this.positionSelection, this.currentRoot);
  }

  zoomIn(node: d3.HierarchyRectangularNode<TreeNode>) {
    console.log("zoomin clicked");
    if (this.currentDepth == 2) {
      return;
    }
    this.currentDepth++;
    this.currentRoot = node;
    this.updateScales(node);
    this.updateTreemap();
  }

  appendRectangles(node: d3.Selection<SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    //const rect = node.append("rect")
    node.select("rect")
      .attr('width', d => { return d.x1 - d.x0 })
      .attr('height', d => { return d.y1 - d.y0 })
      .attr("fill", d => {
        if (d.data.color) {
          return d.data.color
        }
        return "#ccc";
      })
    // .attr("stroke", "#000")
    //.attr("stroke-width", '0')

    if (this.currentDepth == 2) {
      node.select("rect")
        .attr("fill", "rgba(0, 0, 0, 0.4)")
        .attr("stroke", "#fff")
    }
  }

  appendImages(node: d3.Selection<SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const self = this;
    const marginRatio = 0.1;

    //node.append("image")
    node.select("image")
      .attr('width', d => {
        const [width, height] = self.imageCalculations(d);
        return width < height ? width * 0.6 : height * 0.6
      })
      .attr('height', d => {
        const [width, height] = self.imageCalculations(d);
        return width < height ? width * 0.6 : height * 0.6
      })
      .attr('x', d => {
        const [width, height] = self.imageCalculations(d);
        return (width / 2) - (width < height ? width * 0.6 : height * 0.6) / 2;
      })
      .attr('y', d => {
        const [width, height] = self.imageCalculations(d);
        return (height / 2) - (width < height ? width * 0.6 : height * 0.6) / 2;
      })
      .attr("preserveAspectRatio", 'xMidYMid meet')
      .attr("href", d => {
        return d.data.image!
      })
  }

  addTooltips(node: d3.Selection<SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const tooltip = d3.select("#tooltip");

    node.on("mouseover", (event, d) => {
      tooltip.style("opacity", 1);
      tooltip.html(`Name: ${d.data.name}<br>Scrobbles: ${d.value}`)
        .style("left", (event.pageX + 10) + "px") // Position the tooltip to the right of the cursor
        .style("top", (event.pageY - 120) + "px"); // Position the tooltip below the cursor
    })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 120) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0); // Hide the tooltip when not hovering
      });
  }

  backgroundImage(): void {
    this.group.insert("image", ":first-child")
      .attr("class", "album-background")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("xlink:href", d => this.currentRoot.data.image!)
  }

  appendTrackText(node: d3.Selection<SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const self = this;
    const nodeEnter = //node.append('foreignObject')
      node.select("foreignObject")
        .attr("class", "node-foreign")
        .attr("width", d => this.x(d.x1) - this.x(d.x0))
        .attr("height", d => this.y(d.y1) - this.y(d.y0))
        .attr("x", d => d.x0)
        .attr("y", d => d.y0);

    console.log("appendTrackText" + nodeEnter)

    const nodeWrapperDiv = nodeEnter.append("xhtml:div")
      .attr("class", "node-wrapper")
      .style("width", d => `${(this.x(d.x1) - this.x(d.x0))}px`)
      .style("height", d => `${this.y(d.y1) - this.y(d.y0)}px`)

    const textDiv = nodeWrapperDiv.append("xhtml:div")
      .attr("class", "node-text")
      .attr("xmlns:xhtml", "http://www.w3.org/1999/xhtml")
      .style("width", d => `${(this.x(d.x1) - this.x(d.x0)) * 0.7}px`)
      .style("height", d => `${(this.y(d.y1) - this.y(d.y0)) * 0.4}px`)
      .style("font-size", d => `${this.calculateFontSize(d) * 2}px`)
      .html(d => `<xhtml:span>${d.data.name}</xhtml:span>`)

    nodeWrapperDiv.each(function (d) {
      const divElement = (this as HTMLElement).querySelector('div');
      if (divElement) {
        textFit(divElement, {
          alignVertWithFlexbox: true,
          alignHoriz: true,
          multiLine: true,
          maxFontSize: 1000
        });
      }
    });
  }

  transformToTreemapData(stats: ChartStats): void {
    //console.log("transformtoTreemapData: " + Object.keys(stats.artists));
    if (this.filterState.view === "Albums") {
      console.log("Albums Top View")
      this.treemapData = this.transformToTreemapDataAlbums(stats);
    } else if (this.filterState.view === "Tracks") {
      this.treemapData = this.transformToTreemapDataTracks(stats);
    } else {
      this.treemapData = this.transformToTreemapDataArtists(stats);
    }
  }

  transformToTreemapDataArtists(stats: ChartStats): TreeNode {
    const treemapData = {
      name: "ChartStats",
      children: Object.keys(stats.artists).map(artistKey => {
        const artist = stats.artists[artistKey];
        if (artist.name == "Lyn") {
          console.log("Lyn scrobbles: " + artist.scrobbles.length);
        }
        return {
          name: artist.name,
          children: Object.keys(artist.albums).map(albumKey => {
            const album = artist.albums[albumKey];
            //console.log("Album: " + album.name + ", Color: " + album.color)
            return {
              name: album.name,
              children: Object.keys(album.tracks).map(trackKey => {
                const track = album.tracks[trackKey];
                return {
                  name: track.name,
                  value: track.scrobbles.length // or another metric for value
                };
              }),
              image: album.image_url,
              color: album.color
            };
          }),
          image: artist.image_url,
          color: artist.color
        };
      })
    };
    this.currentDepth = 0;
    return treemapData
  }

  transformToTreemapDataAlbums(stats: ChartStats): TreeNode {
    const treemapData = {
      name: "ChartStats",
      children: [] as TreeNode[]
    };

    // Iterate over each artist
    Object.keys(stats.artists).forEach(artistKey => {
      const artist = stats.artists[artistKey];
      // Then iterate over each album of the artist
      Object.keys(artist.albums).forEach(albumKey => {
        const album = artist.albums[albumKey];
        // Prepare the album TreeNode, including its tracks as children
        const albumNode: TreeNode = {
          name: album.name,
          children: Object.keys(album.tracks).map(trackKey => {
            const track = album.tracks[trackKey];
            return {
              name: track.name,
              value: track.scrobbles.length, // Use the length of scrobbles array as value
              // Additional properties like 'image' and 'color' could be included here if needed
            };
          }),
          image: album.image_url, // Album image
          color: album.color // Album color
        };
        // Add the albumNode to the children of the ChartStats TreeNode
        treemapData.children.push(albumNode);
      });
    });

    this.currentDepth = 1;

    return treemapData;
  }

  transformToTreemapDataTracks(stats: ChartStats): TreeNode {
    const treemapData = {
      name: "ChartStats",
      children: [] as TreeNode[]
    };

    // Iterate over each artist
    Object.keys(stats.artists).forEach(artistKey => {
      const artist = stats.artists[artistKey];
      // Then iterate over each album of the artist
      Object.keys(artist.albums).forEach(albumKey => {
        const album = artist.albums[albumKey];

        // Then iterate over each tracks of the album
        Object.keys(album.tracks).forEach(trackKey => {
          const track = album.tracks[trackKey];

          const trackNode: TreeNode = {
            name: track.name,
            children: [],
            value: track.scrobbles.length,
            image: album.image_url,
            color: album.color
          }

          treemapData.children.push(trackNode);
        })
      });
    });

    this.currentDepth = 2;

    return treemapData;
  }

  transition(target: [number, number, number]): void {
    const i = d3.interpolateZoom(this.currentTransform, target);

    let duration = i.duration;
    if (duration < 250) { // If the calculated duration is too short, extend it
      duration = 250; // Adjust this value as needed
    }

    this.group.transition()
      .duration(1000)
      .attr("transform", "translate(100,100) scale(2)")
      .on("end", () => console.log("Transition complete"));
  }

  appendText(node: d3.Selection<d3.BaseType | SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const self = this;

    node.append("text") //Titles
      .attr("font-size", d => `${this.calculateFontSize(d)}px`)
      .attr("fill-opacity", 0.7)
      .text(d => d.data.name)
      .each(function (d) {
        const currText = d3.select(this)
        const textLength = currText.node()?.getBBox();
        const rectWidth = self.x(d.x1) - self.y(d.x0);

        self.formatTitleText(currText, textLength!)

        if (d3.select(this).node()!.getBBox().width > rectWidth) {
          console.log("while textWidth")
          d3.select(this).attr("font-size", (d: any) => {
            return `${self.calculateFontSize(d) * 0.3}px`
          })
          self.formatTitleText(d3.select(this), currText.node()!.getBBox())
        }

        if (self.currentDepth == 0 || self.currentDepth == 1) {
          currText.attr("fill", (d: any) => {
            const color = d.data.color
            const [r, g, b] = self.hexToRgb(color);
            if (r * 0.299 + g * 0.587 + b * 0.114 > 186) {
              return "#000000"
            }
            return "#ffffff"
          })
        }
      })

    node.append("text") //Scrobble Count
      .attr("font-size", d => `${self.calculateFontSize(d)}px`)
      .attr("fill-opacity", 0.7)
      .text((d: any) => d.value)
      .each(function (d) {
        const currText = d3.select(this)
        const textLength = currText.node()?.getBBox();

        self.formatScrobbleText(currText, textLength!);

        if (self.currentDepth == 0 || self.currentDepth == 1) {
          currText.attr("fill", (d: any) => {
            const color = d.data.color
            const [r, g, b] = self.hexToRgb(color);
            if (r * 0.299 + g * 0.587 + b * 0.114 > 186) {
              return "#000000"
            }
            return "#ffffff"
          })
        }
      })
  }

  transform(x: number, y: number, r: number): string {
    // This should return a string in the format of "translate(x, y) scale(z)"
    return `translate(${this.width / 2 - x}, ${this.height / 2 - y}) scale(${this.height / r})`;
  }

  formatScrobbleText(currText: d3.Selection<SVGTextElement, unknown, null, undefined>, textLength: DOMRect): void {
    currText.attr("x", (d: any) => {
      const [width, height] = this.imageCalculations(d);
      return (width / 2) - textLength!.width / 2
    })
      .attr("y", (d: any) => {
        const [width, height] = this.imageCalculations(d);
        return (height / 2) + (width < height ? width * 0.6 : height * 0.6) / 2 + textLength!.height
      })
  }

  formatTitleText(currText: d3.Selection<SVGTextElement, unknown, null, undefined>, textLength: DOMRect): void {
    currText.attr("x", (d: any) => {
      const [width, height] = this.imageCalculations(d);
      return (width / 2) - textLength!.width / 2
    })
      .attr("y", (d: any) => {
        const [width, height] = this.imageCalculations(d);
        return (height / 2) - (width < height ? width * 0.6 : height * 0.6) / 2 - textLength!.height / 2
      })
  }

  hexToRgb(hex: string): [number, number, number] {
    // Remove the hash at the start if it's there
    if (!hex) {
      hex = "#cccccc"
    }

    hex = hex.replace(/^#/, '');

    // Parse the r, g, b values
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    return [r, g, b];
  }

  imageCalculations(d: d3.HierarchyRectangularNode<TreeNode>): [number, number] {
    const width = this.x(d.x1) - this.x(d.x0);
    const height = this.y(d.y1) - this.y(d.y0);
    // const aspectRatio = width / height;
    // const sideLength = width < height ? width : height;
    return [width, height];
  }

  calculateFontSize(d: d3.HierarchyRectangularNode<TreeNode>): number {
    let width = this.x(d.x1) - this.x(d.x0);
    let height = this.y(d.y1) - this.y(d.y0);
    //return Math.min((width * 0.1), (height * 0.1))
    return Math.min(width * 0.1);
  }

  positionSelection(group: d3.Selection<SVGGElement, unknown, HTMLElement, any>, root: d3.HierarchyRectangularNode<TreeNode>) {
    group.selectAll("g")
      .attr("transform", (d: any) => d === root ? `translate(0,-30)` : `translate(${this.x(d.x0)},${this.y(d.y0)})`)
      .select("rect")
      .attr("width", (d: any) => d === root ? this.width : this.x(d.x1) - this.x(d.x0))
      .attr("height", (d: any) => d === root ? 30 : this.y(d.y1) - this.y(d.y0));
  }

  handleKeyDown(event: KeyboardEvent): void {
    // Check if Ctrl + Z was pressed
    if (event.ctrlKey && event.shiftKey && event.key === 'Z') {
      this.zoomOut();
    }
  }

  zoomOut() {
    if (this.currentDepth > 0 && !(this.filterState.view === "Albums")) {
      this.currentDepth--;
    } else if (this.filterState.view === "Albums" && this.currentDepth > 1) {
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
}
