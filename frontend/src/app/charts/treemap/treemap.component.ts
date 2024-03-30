import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import * as d3 from 'd3';
import { Scrobble, ChartStats, ScrobblesJSON } from 'src/app/items';
import { StatsConverterService } from 'src/app/stats-converter.service';
import { ScrobbleGetterService } from 'src/app/scrobblegetter.service';
import { ScrobbleStorageService } from 'src/app/scrobble-storage.service';
import { FiltersService } from 'src/app/filters.service';
import { BaseType } from 'd3';

interface TreeNode {
  name: string;
  value?: number;
  children?: TreeNode[];
  image?: string;
  color?: string;
}

@Component({
  selector: 'app-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TreemapComponent implements OnInit{
  treemapData: TreeNode = {} as TreeNode;
  width: number = 3000;
  height: number = 3000;
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
  albumMode: boolean = false;
  constructor(private filters: FiltersService, private statsConverterService: StatsConverterService, private scrobbleGetterService: ScrobbleGetterService, private storage: ScrobbleStorageService) {
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0, Infinity])
      .on("zoom", (event) => {
        this.group.attr("transform", event.transform);
      })

    this.renderNode = this.renderNode.bind(this);
    this.positionSelection = this.positionSelection.bind(this);
    //this.positionTransition = this.positionTransition.bind(this);
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.updateTreemap = this.updateTreemap.bind(this);
    this.updateScales = this.updateScales.bind(this);
    this.calculateFontSize = this.calculateFontSize.bind(this);
  };

  ngOnInit(): void {
    //this.initializeTreemap();
  }

  transformToTreemapData(stats: ChartStats): TreeNode {
    const treemapData = {
      name: "ChartStats",
      children: Object.keys(stats.artists).map(artistKey => {
          const artist = stats.artists[artistKey];
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
  
    this.albumMode = true;
    this.currentDepth++;

    return treemapData;
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

    this.currentRoot = this.root;
    this.updateTreemap();
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
  
  transform(x: number, y: number, r: number): string {
    // This should return a string in the format of "translate(x, y) scale(z)"
    return `translate(${this.width / 2 - x}, ${this.height / 2 - y}) scale(${this.height / r})`;
  }

  renderNode(group: d3.Selection<SVGGElement, unknown, HTMLElement, any>, root: d3.HierarchyRectangularNode<TreeNode>) {
    const self = this;

    const node = group
      .selectAll("g")
      .data(root.children!)
      .join("g");

    node.filter((d: any) => d === root ? d.parent : d.children)
      .attr("cursor", "pointer")
      .on("click", (event, d) => d === root ? this.zoomOut() : this.zoomIn(d));

    this.appendRectangles(node)
    this.addTooltips(node);

    if (this.currentDepth == 0 || this.currentDepth == 1) {
      //this.appendText(node);
      this.appendImages(node);
    } else {
      this.backgroundImage(node, group, root);
      this.appendTrackText(node);
    }

    group.call(this.positionSelection, root);
  }

  appendRectangles(node: d3.Selection<d3.BaseType | SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const rect = node.append("rect")
      .attr('width', d => { return d.x1 - d.x0 })
      .attr('height', d => { return d.y1 - d.y0 })
      .attr("fill", d => {
        if (d.data.color) {
          return d.data.color
        }
        return "#ccc";
      })
      .attr("stroke", "#fff")

    if (this.currentDepth == 2) {
      rect.attr("fill", "rgba(0, 0, 0, 0.4)");
    }
  }

  appendText(node: d3.Selection<d3.BaseType | SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const self = this;

    node.append("text") //Titles
      .attr("font-size", d => `${this.calculateFontSize(d)}px`)
      .attr("fill-opacity", 0.7) 
      .text(d => d.data.name)
      .each(function(d) {
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
      .each(function(d) {
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

  appendImages(node: d3.Selection<d3.BaseType | SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const self = this;
    const marginRatio = 0.1;
    node.append("image")
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

  addTooltips(node: d3.Selection<d3.BaseType | SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const tooltip = d3.select("#tooltip");

    node.on("mouseover", (event, d) => {
        tooltip.style("opacity", 1);
        tooltip.html(`Name: ${d.data.name}<br>Scrobbles: ${d.value}`)
            .style("left", (event.pageX + 10) + "px") // Position the tooltip to the right of the cursor
            .style("top", (event.pageY) - 600 + "px"); // Position the tooltip below the cursor
    })
    .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY) - 600 + "px");
    })
    .on("mouseout", () => {
        tooltip.style("opacity", 0); // Hide the tooltip when not hovering
    });
  }

  backgroundImage(node: d3.Selection<d3.BaseType | SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>, group: d3.Selection<SVGGElement, unknown, HTMLElement, any>, root: d3.HierarchyRectangularNode<TreeNode>): void {
    const backgroundImage = group.selectAll(".album-background")
      .data([root])
      .enter()
      .insert("image", ":first-child")
      .attr("class", "album-background")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("xlink:href", d => d.data.image!)
  }

  appendTrackText(node: d3.Selection<d3.BaseType | SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const self = this;
    // node.append("text")
    //   .attr("font-size", d => `${self.calculateFontSize(d)}px`)
    //   .each(function(d) {
    //     d3.select(this)
    //       .selectAll("tspan")
    //       .data((d: any) => (d.data.name + " " + d.value).split(" "/*/(?=[A-Z][^A-Z])/g*/))
    //       .join("tspan")
    //       .attr("x", () => {
    //         const font_size = self.calculateFontSize(d);
    //         return font_size * 0.3
    //       })
    //       .attr("y", (childD, i) => {
    //         const font_size = self.calculateFontSize(d);
    //         return (font_size * 1.2) + i * (font_size * 1.2)
    //       })
    //       .attr("fill", "#ffffff")
    //       .text((childD: any) => childD);
    //   })
    const nodeEnter = node.append('foreignObject')
      .attr("class", "node-foreign")
      .attr("width", d => this.x(d.x1) - this.x(d.x0))
      .attr("height", d => this.y(d.y1) - this.y(d.y0))
      .attr("x", d => d.x0)
      .attr("y", d => d.y0);

    console.log("appendTrackText")

    const nodeDiv = nodeEnter.append("xhtml:div")
      .attr("class", "node-text")
      .attr("xmlns:xhtml", "http://www.w3.org/1999/xhtml")
      .style("width", d => `${this.x(d.x1) - this.x(d.x0)}px`)
      .style("height", d => `${this.y(d.y1) - this.y(d.y0)}px`)
      .style("font-size", d => `${this.calculateFontSize(d) * 2}px`)
      .html(d => `<xhtml:span>${d.data.name}</xhtml:span>`)
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
    return Math.min((width * 0.1), (height * 0.1))
  }



  positionSelection(group: d3.Selection<SVGGElement, unknown, HTMLElement, any>, root: d3.HierarchyRectangularNode<TreeNode>) {
    group.selectAll("g")
        .attr("transform", (d: any) => d === root ? `translate(0,-30)` : `translate(${this.x(d.x0)},${this.y(d.y0)})`)
      .select("rect")
        .attr("width", (d: any) => d === root ? this.width : this.x(d.x1) - this.x(d.x0))
        .attr("height", (d: any) => d === root ? 30 : this.y(d.y1) - this.y(d.y0));
  }

  zoomIn(node: d3.HierarchyRectangularNode<TreeNode>) {
    this.currentDepth++;
    this.currentRoot = node;
    this.updateScales(node);
    this.updateTreemap();
  }

  zoomOut() {
    if (this.currentDepth > 0 && !this.albumMode) {
      this.currentDepth--;
    } else if (this.albumMode && this.currentDepth > 1) {
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
