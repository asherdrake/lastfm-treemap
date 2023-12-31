import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { RGBColor } from 'd3';

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
export class TreemapComponent implements OnInit{
  /*private data = {"children": [
    {"name":"boss1",
    "children": [
      {"name":"mister_a","group":"A","value":28,"colname":"level3"},
      {"name":"mister_b","group":"A","value":19,"colname":"level3"},
      {"name":"mister_c","group":"C","value":18,"colname":"level3"},
      {"name":"mister_d","group":"C","value":19,"colname":"level3"}
    ], "colname":"level2"},
    {"name":"boss2",
    "children": [
      {"name":"mister_e","group":"C","value":14,"colname":"level3"},
      {"name":"mister_f","group":"A","value":11,"colname":"level3"},
      {"name":"mister_g","group":"B","value":15,"colname":"level3"},
      {"name":"mister_h","group":"B","value":16,"colname":"level3"}
    ],"colname":"level2"},
    {"name":"boss3",
    "children": [
      {"name":"mister_i","group":"B","value":10,"colname":"level3"},
      {"name":"mister_j","group":"A","value":13,"colname":"level3"},
      {"name":"mister_k","group":"A","value":13,"colname":"level3"},
      {"name":"mister_l","group":"D","value":25,"colname":"level3"},
      {"name":"mister_m","group":"D","value":16,"colname":"level3"},
      {"name":"mister_n","group":"D","value":28,"colname":"level3"}
    ],"colname":"level2"}],"name":"CEO"}
  private margin = {top: 10, right: 10, bottom: 10, left: 10};
  private width = 445 - this.margin.left - this.margin.right;
  private height = 445 - this.margin.top - this.margin.bottom;

  private createSvg(): void {
    this.svg = d3.select("figure#treemap")
    .append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
    .append("g")
      .attr("transform", "translate(" + this.margin + "," + this.margin + ")");
  }

  private readData() {
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/data_dendrogram_full.json", function(data) {
      const root = d3.hierarchy(data).sum(d => d.value)

      d3.treemap()
        .size([this.width, this.height])
    })
  }

  private drawBars(data: any[]): void {
    // Create the X-axis band scale
    const x = d3.scaleBand()
    .range([0, this.width])
    .domain(data.map(d => d.Framework))
    .padding(0.2);
  
    // Draw the X-axis on the DOM
    this.svg.append("g")
    .attr("transform", "translate(0," + this.height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");
  
    // Create the Y-axis band scale
    const y = d3.scaleLinear()
    .domain([0, 200000])
    .range([this.height, 0]);
  
    // Draw the Y-axis on the DOM
    this.svg.append("g")
    .call(d3.axisLeft(y));
  
    // Create and fill the bars
    this.svg.selectAll("bars")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d: any) => x(d.Framework))
    .attr("y", (d: any) => y(d.Stars))
    .attr("width", x.bandwidth())
    .attr("height", (d: any) => this.height - y(d.Stars))
    .attr("fill", "#d04a35");
  }

  ngOnInit(): void {
    this.createSvg();
    this.drawBars(this.data);
  }*/
  constructor() { }

  ngOnInit(): void {
    this.drawTreemap();
  }

  drawTreemap(): void {
    // Example data
    const data: TreeNode = {
      name: "root",
      children: [
        { name: "A", value: 500 },
        { name: "B", value: 300 },
        { name: "C", value: 200 },
      ]
    };

    const root = d3.hierarchy(data).sum((d: any) => d.value ? d.value : 0);
    d3.treemap<TreeNode>().size([300, 300])(root);

    const svg = d3.select('app-treemap')
                  .append('svg')
                  .attr('width', 300)
                  .attr('height', 300);

    const leaves = root.leaves() as d3.HierarchyRectangularNode<TreeNode>[];

    svg.selectAll('rect')
       .data(leaves)
       .enter()
       .append('rect')
       .attr('x', d => d.x0)
       .attr('y', d => d.y0)
       .attr('width', d => d.x1 - d.x0)
       .attr('height', d => d.y1 - d.y0)
       .style('stroke', 'black')
       .style('fill', 'lightblue');
  }
}
