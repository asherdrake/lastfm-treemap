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
    this.position = this.position.bind(this);
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
      .attr("viewBox", [0.5, -30.5, this.width, this.height + 30])
      .attr("width", this.width)
      .attr("height", this.height + 30)
      .attr("style", "max-width: 100%; height: auto;")
      .style("font", "10px sans-serif");

    //display the root
    this.group = this.svg.append("g")
      .call(this.renderNode, this.root);
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
        .on("click", (event, d) => d === root ? this.zoomOut(root) : this.zoomIn(d));

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
      
    group.call(this.position, root);
  }

  position(group: d3.Selection<SVGGElement, unknown, HTMLElement, any>, root: d3.HierarchyRectangularNode<TreeNode>) {
    group.selectAll("g")
        .attr("transform", (d: any) => d === root ? `translate(0,-30)` : `translate(${this.x(d.x0)},${this.y(d.y0)})`)
      .select("rect")
        .attr("width", (d: any) => d === root ? this.width : this.x(d.x1) - this.x(d.x0))
        .attr("height", (d: any) => d === root ? 30 : this.y(d.y1) - this.y(d.y0));
  }

  zoomIn(d: any) {
    const group0 = this.group.attr("pointer-events", "none");
    const group1 = this.group = this.svg.append("g").call(this.renderNode, d);

    this.x.domain([d.x0, d.x1]);
    this.y.domain([d.y0, d.y1]);

    /*this.svg.transition()
        .duration(750)
        //.call(t => group0.transition(t).remove()
          .call(this.position, d.parent)
        .call(t => group1.transition(t)
          .attrTween("opacity", () => d3.interpolate(0, 1))
          .call(this.position, d));*/
  }

  zoomOut(d: any) {
    const group0 = this.group.attr("pointer-events", "none");
    const group1 = this.group = this.svg.insert("g", "*").call(this.renderNode, d.parent);

    this.x.domain([d.parent.x0, d.parent.x1]);
    this.y.domain([d.parent.y0, d.parent.y1]);

    return this.svg.node();
  }






































































  /*drawTreemap(): void {
    const data: TreeNode = this.treemapData

    var rootNode = d3.hierarchy(data).sum((d: any) => d.value);

    var treemapLayout = d3.treemap<TreeNode>()
      .size([this.width, this.height])
      .tile(d3.treemapBinary)(rootNode);

    this.renderNode(rootNode, 1);
  }*/

  /*renderNode(root: TreeNode, depth: number) {
    //clear existing nodes
    d3.select('svg g').selectAll('*').remove();

    //creating treemap layout with new data
    const rootNode = d3.hierarchy(root)
      .sum((d: any) => d.value);
      //.sort((a, b) => b.height - a.height || b.value! - a.value!);

    const treemap = d3.treemap<TreeNode>()
      .size([this.width, this.height])
      .padding(1)
      .tile(d3.treemapBinary)(rootNode);

    //binding data to the nodes
    const nodes = d3.select('svg g')
      .selectAll('g')
      .data(rootNode.descendants().filter((d:any) => d.depth === depth) as d3.HierarchyRectangularNode<TreeNode>[])
      .enter()
      .append('g')
      .attr('transform', d => 'translate(' + [d.x0, d.y0] + ')');

    //drawing the rectangles
    nodes.append('rect')
      .attr('id', d => "rect-" + d.data.name)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .style('stroke', 'black')
      .attr('fill', 'lightblue')

    //adding text labels
    nodes.append('text')
      .attr('clip-path', d => "url(#clip-" + d.data.name + ")")
      .selectAll('tspan')
      .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g))
      .enter()
      .append('tspan')
      .attr('x', 4)
      .attr('y', (d, i, nodes) => 13 + i * 10)
      .text(d => d);

    //adds event listener for zooming in on click
    nodes.on('click', d => this.zoomin(d));  

    /*var nodes = d3.select('svg g')
      .selectAll('g')
      .data(root.descendants().filter((d: any) => d.depth === depth ) as d3.HierarchyRectangularNode<TreeNode>[])
      .join('g')
      .attr('transform', d => {
        return 'translate(' + [d.x0, d.y0] + ')'
      })
      .on("click", (event, d) => this.zoomin(d))

    nodes
      .append('rect')
      .attr('width', d => { return d.x1 - d.x0; })
      .attr('height', d => { return d.y1 - d.y0; })
      .style('stroke', 'black')
      .style('fill', 'lightblue')

    nodes
      .append('text')
      .attr('dx', 4)
      .attr('dy', 14)
      .text(d => { return d.data.name; })
  }

  /*tile(node: d3.HierarchyRectangularNode<TreeNode>, x0: number, y0: number, x1: number, y1: number) {
    d3.treemapBinary(node, 0, 0, this.width, this.height);
    if (node.children) {
      for (const child of node.children) {
        child.x0 = x0 + child.x0 / this.width * (x1 - x0);
        child.x1 = x0 + child.x1 / this.width * (x1 - x0);
        child.y0 = y0 + child.y0 / this.height * (y1 - y0);
        child.y1 = y0 + child.y1 / this.height * (y1 - y0);
      }
    }
  }

  zoomin(d: d3.HierarchyRectangularNode<TreeNode>) {
    // Define the transition
    const transition = d3.transition()
      .duration(750)
      .tween("scale", () => {
        var xScale = d3.scaleLinear()
          .domain([d.x0, d.x1])
          .range([0, this.width]);
  
        var yScale = d3.scaleLinear()
          .domain([d.y0, d.y1])
          .range([0, this.height]);
  
        return () => {
          d3.select('svg g')
            .selectAll('g')
            .transition(transition)
            .attr('transform', child => {
              return 'translate(' + xScale(child.x0) + ',' + yScale(child.y0) + ')';
            })
            .select('rect')
            .attr('width', child => xScale(child.x1) - xScale(child.x0))
            .attr('height', child => yScale(child.y1) - yScale(child.y0));
        };
      });
  
    // Render children of the clicked node
    this.renderNode(d, d.depth + 1);
  }*/
}
