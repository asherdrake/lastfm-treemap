import { Input, Component, OnInit, ViewEncapsulation, SimpleChanges } from '@angular/core';
import * as d3 from 'd3';
import { TreemapViewType, TreeNode } from 'src/app/items';
import { FilterState } from 'src/app/filters.service';
import { BaseType } from 'd3';
import textFit from 'textfit';

@Component({
  selector: 'app-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TreemapComponent implements OnInit {
  @Input() treemapData: TreeNode = { name: "root", children: [] };
  @Input() isInteractiveMode: boolean = false;
  @Input() view: TreemapViewType = 'Albums';
  @Input() showNames: boolean = false;
  @Input() showScrobbleCount: boolean = false;

  width: number = 2500;
  height: number = 2500;

  hierarchy?: d3.HierarchyNode<TreeNode>;
  root: d3.HierarchyRectangularNode<TreeNode> = {} as d3.HierarchyRectangularNode<TreeNode>;
  tooltip: d3.Selection<BaseType, unknown, HTMLElement, any> = {} as d3.Selection<BaseType, unknown, HTMLElement, any>;
  x: d3.ScaleLinear<number, number, never> = {} as d3.ScaleLinear<number, number, never>;
  y: d3.ScaleLinear<number, number, never> = {} as d3.ScaleLinear<number, number, never>;
  svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> = {} as d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  group: d3.Selection<SVGGElement, unknown, HTMLElement, any> = {} as d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  currentRoot: d3.HierarchyRectangularNode<TreeNode> = {} as d3.HierarchyRectangularNode<TreeNode>;
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown> = {} as d3.ZoomBehavior<SVGSVGElement, unknown>;
  currentDepth: number = 0;
  filterState: FilterState = {} as FilterState;

  constructor() {
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0, Infinity])
      .on("zoom", (event) => {
        this.group.attr("transform", event.transform);
      })

    this.positionSelection = this.positionSelection.bind(this);
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.updateTreemap = this.updateTreemap.bind(this);
    this.updateScales = this.updateScales.bind(this);
    this.calculateFontSize = this.calculateFontSize.bind(this);
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.hierarchy) {
      // `ngOnInit` hasn't run yet, so skip this until `ngOnInit` initializes everything
      console.log("ngOnChanges returned")
      return;
    }
    if (changes['treemapData']) {
      console.log("ngOnChanges")
      if (this.view == 'Artists') {
        this.currentDepth = 0;
      } else if (this.view == 'Albums') {
        this.currentDepth = 1;
      } else {
        this.currentDepth = 2;
      }
      this.updateTreemap();
    }
  }

  ngOnInit(): void {
    console.log("ngOnInit");
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.initializeTreemap();
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  resetZoom(): void {
    // Reset the zoom transform
    this.svg.transition()
      .duration(0)
      .call(this.zoom.transform, d3.zoomIdentity);
  }

  initializeTreemap(): void {
    console.log("Initializing treemap");
    console.log(this.treemapData);
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
      .style("font", "10px 'Nunito', sans-serif")
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

    this.currentRoot = this.root;
    this.updateTreemap();
  }

  updateTreemap() {
    const self = this;
    console.log("UPDATE TREEMAP");
    console.log("showNames" + this.showNames);
    console.log("showScrobbleCount" + this.showScrobbleCount);
    this.group.selectAll(".album-background").remove();

    // Recalculate the hierarchy with the updated data
    this.hierarchy = d3.hierarchy(this.treemapData)
      .sum((d: any) => d.value);

    if ((this.view === "Artists" && this.currentDepth === 0)
      || (this.view === "Albums" && this.currentDepth === 1)
      || (this.view === "Tracks" && this.currentDepth === 2)) {
      //console.log("entered currentRoot conditional")
      this.currentRoot = d3.treemap<TreeNode>().tile(d3.treemapBinary)(this.hierarchy);
      this.updateScales(this.currentRoot);
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
      nodeEnter.append('foreignObject');
      this.appendImages(nodeUpdate);
      this.appendTopLeftText(nodeUpdate);
      this.appendScrobbleCount(nodeUpdate);
      if (this.isInteractiveMode) {
        nodeUpdate.attr("cursor", "pointer")
          .on("click", (event, d) => this.zoomIn(d));
      }
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
    node.select("rect")
      .attr('width', d => { return d.x1 - d.x0 })
      .attr('height', d => { return d.y1 - d.y0 })
      .attr("fill", d => {
        if (!d.data.image && this.currentDepth != 2) {
          return d.data.children ? d.data.children[0].color! : ""
        }
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
        // if (!d.data.image) {
        //   console.log(d.data.name);
        //   console.log(d.data.children![0].image);
        // }
        return !d.data.image ? (d.data.children ? d.data.children![0].image! : '') : d.data.image!
      })
  }

  addTooltips(node: d3.Selection<SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const tooltip = d3.select("#tooltip");

    node.on("mouseover", (event, d) => {
      tooltip.style("opacity", 1);
      tooltip.html(d.data.artist ? `Name: ${d.data.name}<br>Scrobbles: ${d.value}<br>Artist: ${d.data.artist}` : `Name: ${d.data.name}<br>Scrobbles: ${d.value}`)
        .style("left", (event.pageX + 10) + "px") // Position the tooltip to the right of the cursor
        .style("top", (event.pageY - 70) + "px"); // Position the tooltip below the cursor
    })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 70) + "px");
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
    const nodeEnter =
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

  appendTopLeftText(node: d3.Selection<SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const self = this;

    // Update the foreignObject elements
    const foreignObjects = node.select("foreignObject")
      .attr("class", "node-foreign")
      .attr("width", d => this.x(d.x1) - this.x(d.x0))
      .attr("height", d => this.y(d.y1) - this.y(d.y0))
      .attr("x", 0)
      .attr("y", 0);

    console.log("appendTopLeftText", foreignObjects);

    // For each foreignObject, select or create the node-wrapper div
    foreignObjects.each(function (d) {
      const foreignObject = d3.select(this);

      // Select the existing node-wrapper div or append a new one if it doesn't exist
      let nodeWrapperDiv = foreignObject.select("div.node-wrapper");
      if (nodeWrapperDiv.empty()) {
        nodeWrapperDiv = foreignObject.append("xhtml:div")
          .attr("class", "node-wrapper");
      }

      const width = foreignObject.attr("width")
      const height = Number(foreignObject.attr("height")) / 2;
      const padding = Math.min(Number(width), Number(height)) * 0.05;

      // Update attributes and styles for node-wrapper div
      nodeWrapperDiv
        .style("width", `${width}px`)
        .style("height", `${height}px`)
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("justify-content", "flex-start")
        .style("align-items", "flex-start")
        //.style("padding", "2px")
        .attr("x", 0)
        .attr("y", 0);

      // Select the existing node-text div or append a new one if it doesn't exist
      let textDiv = nodeWrapperDiv.select("div.node-text");
      if (textDiv.empty()) {
        textDiv = nodeWrapperDiv.append("xhtml:div")
          .attr("class", "node-text")
          .attr("xmlns:xhtml", "http://www.w3.org/1999/xhtml");
      }

      // Update attributes and styles for node-text div
      textDiv
        //.style("box-sizing", "border-box")
        .style("width", "70%")
        .style("height", "10%")
        .style("padding", `${padding}px`)
        .style("overflow", "hidden")
        .style("white-space", "nowrap")
        .style("text-overflow", "ellipsis")
        .style("display", "flex")
        .style("align-items", "flex-start")
        .style("justify-content", "flex-start")
        .html((d: any) => self.showNames ? `<xhtml:span style="display: inline-block; max-width: 100%; max-height: 100%;">${d.data.name}</xhtml:span>` : `<xhtml:span style="display: inline-block; max-width: 100%; max-height: 100%;"></xhtml:span>`);

      // Apply text fitting to the textDiv
      const divElement = (textDiv.node() as HTMLElement);
      if (divElement) {
        textFit(divElement, {
          alignVertWithFlexbox: true,
          alignHoriz: false,
          multiLine: true,
          maxFontSize: 1000,
          minFontSize: 0
        });
      }

      // Update styles for the text-fitted content
      nodeWrapperDiv.select(".textFitted")
        .style("fill", "rgba(0, 0, 0, 1)")
        .style("stroke", "#fff")
        .style("z-index", "100");
    });
  }

  appendScrobbleCount(node: d3.Selection<SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>): void {
    const self = this;

    // Update the foreignObject elements
    const foreignObjects = node.select("foreignObject")
      .attr("class", "node-foreign")
      .attr("width", d => this.x(d.x1) - this.x(d.x0))
      .attr("height", d => this.y(d.y1) - this.y(d.y0))
      .attr("x", 0)
      .attr("y", 0);

    console.log("appendScrobbleCount", foreignObjects);

    // For each foreignObject, select or create the node-wrapper div
    foreignObjects.each(function (d) {
      const foreignObject = d3.select(this);

      // Select the existing node-wrapper div or append a new one if it doesn't exist
      let nodeWrapperDiv = foreignObject.select("div.scrobble-wrapper");
      if (nodeWrapperDiv.empty()) {
        nodeWrapperDiv = foreignObject.append("xhtml:div")
          .attr("class", "scrobble-wrapper");
      }

      const width = foreignObject.attr("width")
      const height = Number(foreignObject.attr("height")) / 2;
      const padding = Math.min(Number(width), Number(height)) * 0.05;

      // Update attributes and styles for node-wrapper div
      nodeWrapperDiv
        .style("width", `${width}px`)
        .style("height", `${height}px`)
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("justify-content", "flex-end")
        .style("align-items", "flex-end")
        //.style("padding", "2px")
        .attr("x", 0)
        .attr("y", 0);

      // Select the existing node-text div or append a new one if it doesn't exist
      let textDiv = nodeWrapperDiv.select("div.scrobble-count");
      if (textDiv.empty()) {
        textDiv = nodeWrapperDiv.append("xhtml:div")
          .attr("class", "scrobble-count")
          .attr("xmlns:xhtml", "http://www.w3.org/1999/xhtml");
      }

      // Update attributes and styles for node-text div
      textDiv
        //.style("box-sizing", "border-box")
        .style("width", "70%")
        .style("height", "20%")
        .style("padding", `${padding}px`)
        .style("overflow", "hidden")
        .style("white-space", "nowrap")
        .style("text-overflow", "ellipsis")
        .style("display", "flex")
        .style("align-items", "flex-end")
        .style("justify-content", "flex-end")
        .html((d: any) => self.showScrobbleCount ? `<xhtml:span style="display: inline-block; max-width: 100%; max-height: 100%;">${d.value}</xhtml:span>` : `<xhtml:span style="display: inline-block; max-width: 100%; max-height: 100%;"></xhtml:span>`);

      // Apply text fitting to the textDiv
      const divElement = (textDiv.node() as HTMLElement);
      if (divElement) {
        textFit(divElement, {
          alignVertWithFlexbox: true,
          alignHoriz: false,
          multiLine: true,
          maxFontSize: 1000,
          minFontSize: 0
        });
      }

      // Update styles for the text-fitted content
      nodeWrapperDiv.select(".textFitted")
        .style("fill", "rgba(0, 0, 0, 1)")
        .style("stroke", "#fff")
        .style("z-index", "100");
    });
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
    return [width, height];
  }

  calculateFontSize(d: d3.HierarchyRectangularNode<TreeNode>): number {
    let width = this.x(d.x1) - this.x(d.x0);
    let height = this.y(d.y1) - this.y(d.y0);
    return Math.min(width * 0.1);
  }

  positionSelection(group: d3.Selection<SVGGElement, unknown, HTMLElement, any>, root: d3.HierarchyRectangularNode<TreeNode>) {
    group.selectAll("g")
      .attr("transform", (d: any) => d === root ? `translate(0,-30)` : `translate(${this.x(d.x0)},${this.y(d.y0)})`)
      .select("rect")
      .attr("width", (d: any) => {
        return d === root ? this.width : this.x(d.x1) - this.x(d.x0);
      })
      .attr("height", (d: any) => {
        return d === root ? 30 : this.y(d.y1) - this.y(d.y0)
      });
  }

  handleKeyDown(event: KeyboardEvent): void {
    // Check if Ctrl + Shift + Z was pressed
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
    //console.log("x domain: " + node.x0 + ", " + node.x1);
    this.y.domain([node.y0, node.y1]);
    // console.log("y domain: " + node.y0 + ", " + node.y1);
  }
}
