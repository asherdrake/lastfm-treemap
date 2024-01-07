import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { RGBColor } from 'd3';
import { ChartStats } from 'src/app/items';
import { StatsConverterService } from 'src/app/stats-converter.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ScrobbleGetterService } from 'src/app/scrobblegetter.service';
import { ScrobbleStorageService } from 'src/app/scrobble-storage.service';

interface TreeNode {
  name: string;
  value?: number;
  children?: TreeNode[];
}


@Component({
  selector: 'app-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.css']
})
export class TreemapComponent implements OnInit {
  treemapData: TreeNode = {} as TreeNode;
  width: number = 5000;
  height: number = 5000;
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
  constructor(private statsConverterService: StatsConverterService, private scrobbleGetterService: ScrobbleGetterService, private storage: ScrobbleStorageService) {
    this.statsConverterService.chartStats.pipe(takeUntilDestroyed()).subscribe(stats => {
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
                          })
                      };
                  })
              };
          })
      };
  
      this.treemapData = treemapData;
    });

    this.storage.loadingStatus.pipe(takeUntilDestroyed()).subscribe(status => {
      this.scrobblesFetched = status[0].length;
      this.pageNumber = status[1];
      this.totalPages = status[2];
      if ((status[2] - status[1]) == status[2]) {
        console.log("Treemap data: ", this.treemapData)
        this.initializeTreemap();
      }
    })

    this.tile = this.tile.bind(this);
    this.renderNode = this.renderNode.bind(this);
    this.positionSelection = this.positionSelection.bind(this);
    this.positionTransition = this.positionTransition.bind(this);
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.updateTreemap = this.updateTreemap.bind(this);
    this.updateScales = this.updateScales.bind(this);
  };

  ngOnInit(): void {
    this.scrobbleGetterService.initializeFetching('RashCream', this.storage);
  }

  initializeTreemap(): void {
    console.log("Initializing treemap with data:", this.treemapData);
    //computing layout
    this.hierarchy = d3.hierarchy(this.treemapData)
      .sum((d: any) => d.value);
    this.root = d3.treemap<TreeNode>().tile(this.tile)(this.hierarchy);

    //creating scales
    this.x = d3.scaleLinear().rangeRound([0, this.width]);
    this.y = d3.scaleLinear().rangeRound([0, this.height]);

    //creating svg container
    this.svg = d3.select("#treemap-container").append("svg")
      //.attr("viewBox", [0.5, -30.5, this.width, this.height + 30])
      .attr("width", this.width)
      .attr("height", this.height + 30)
      .attr("style", "max-width: 100%; height: auto;")
      .style("font", "10px sans-serif");

    //display the root
    this.group = this.svg.append("g")
    //   .call(this.renderNode, this.root);

    this.currentRoot = this.root;
    this.updateTreemap();
  }

  tile(node: d3.HierarchyRectangularNode<TreeNode>, x0: number, y0: number, x1: number, y1: number) {
    d3.treemapBinary(node, 0, 0, this.width, this.height);
    for (const child of node.children!) {
      child.x0 = x0 + child.x0 / this.width * (x1 - x0);
      child.x1 = x0 + child.x1 / this.width * (x1 - x0);
      child.y0 = y0 + child.y0 / this.height * (y1 - y0);
      child.y1 = y0 + child.y1 / this.height * (y1 - y0);
    }
  }

  renderNode(group: d3.Selection<SVGGElement, unknown, HTMLElement, any>, root: d3.HierarchyRectangularNode<TreeNode>) {
    const node = group
      .selectAll("g")
      .data(root.children!.concat(root))
      .join("g");

      node.filter((d: any) => d === root ? d.parent : d.children)
        .attr("cursor", "pointer")
        .on("click", (event, d) => d === root ? this.zoomOut() : this.zoomIn(d));

      node.append("rect")
        .attr("fill", d => d === root ? "#fff" : d.children ? "#ccc" : "#ddd")
        .attr("stroke", "#fff");

      node.append("text")
        .attr("font-weight", d => d === root ? "bold" : null)
        .selectAll("tspan")
        .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g))
        .join("tspan")
        .attr("x", 3)
        .attr('y', (d, i, nodes) => 13 + i * 10)
        .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
        .attr("font-weight", (d, i, nodes) => i === nodes.length - 1 ? "normal" : null)
        .text(d => d);
      
    group.call(this.positionSelection, root);
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
    this.currentRoot = node;
    this.updateScales(node);
    this.updateTreemap();
  }

  zoomOut() {
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

  /*zoomIn(d: any) {
    const group0 = this.group.attr("pointer-events", "none");
    const group1 = this.group = this.svg.append("g").call(this.renderNode, d);

    this.x.domain([d.x0, d.x1]);
    this.y.domain([d.y0, d.y1]);

    this.svg.transition()
      .duration(750)
      .call(() => group0.transition().remove()
        .call(this.positionTransition, d.parent))
      .call(() => {
        const transition = group1.transition();
        transition
          .attrTween("opacity", () => {
            const interpolator = d3.interpolate(0, 1);
            return (t: number) => interpolator(t).toString();
          })
          .call(this.positionTransition, d);
      });
  }

  zoomOut(d: any) {
    const group0 = this.group.attr("pointer-events", "none");
    const group1 = this.group = this.svg.insert("g", "*").call(this.renderNode, d.parent);

    this.x.domain([d.parent.x0, d.parent.x1]);
    this.y.domain([d.parent.y0, d.parent.y1]);

    return this.svg.node();
  }*/
}
