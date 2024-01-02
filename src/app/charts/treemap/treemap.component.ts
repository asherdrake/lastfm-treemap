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
export class TreemapComponent implements OnInit{
  treemapData: TreeNode = {
    name: ''
  };
  scrobblesFetched: number = 0;
  pageNumber: number = 0;
  totalPages: number = 0;
  currentDepth: number = 0;
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
        this.drawTreemap();
      }
    })
  }

  ngOnInit(): void {
    this.scrobbleGetterService.initializeFetching('RashCream', this.storage);
  }
  
  drawTreemap(): void {
    const data: TreeNode = this.treemapData

    var treemapLayout = d3.treemap<TreeNode>()
      .size([5000, 5000]);

    var rootNode = d3.hierarchy(data);

    rootNode.sum((d: any) => {
      return d.value;
    });

    treemapLayout(rootNode);

    var nodes = d3.select('svg g')
      .selectAll('g')
      .data(rootNode.descendants() as d3.HierarchyRectangularNode<TreeNode>[])
      .join('g')
      .attr('transform', d => {
        return 'translate(' + [d.x0, d.y0] + ')'
      })

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

  /*drawTreemap(): void {
    const width = 100;
    const height = 100;
    const data: TreeNode = this.treemapData;
    const x = d3.scaleLinear().domain([0, width]).range([0, width]);
    const y = d3.scaleLinear().domain([0, height]).range([0, height]);

    var nodes = d3.hierarchy(data).sum((d: any) => {
      return d.value;
    })
    var treemapLayout = d3.treemap<TreeNode>()
      .size([1000, 1000]);

    treemapLayout(nodes);

    var chart = d3.select("#chart")
    var cells = chart
      .selectAll(".node")
      .data(nodes.descendants() as d3.HierarchyRectangularNode<TreeNode>[])
      .enter()
      .append("div")
      .attr("class", d => { return "node level-" + d.depth; })
      .attr("title", d => { return d.data.name ? d.data.name : "null"; });


      const zoom = (d: any) => { // http://jsfiddle.net/ramnathv/amszcymq/
      
        console.log('clicked: ' + d.data.name + ', depth: ' + d.depth);
        
        this.currentDepth = d.depth;
        parent.datum(d.parent || nodes);
        
        x.domain([d.x0, d.x1]);
        y.domain([d.y0, d.y1]);
        
        var t = d3.transition()
            .duration(800)
            .ease(d3.easeCubicOut);
        
        cells
          .transition(t)
          .style("left", function(d) { return x(d.x0) + "%"; })
          .style("top", function(d) { return y(d.y0) + "%"; })
          .style("width", function(d) { return x(d.x1) - x(d.x0) + "%"; })
          .style("height", function(d) { return y(d.y1) - y(d.y0) + "%"; });
        
        cells // hide this depth and above
          .filter(d => { return d.ancestors(); })
          .classed("hide", function(d) { return d.children ? true : false });
        
        cells // show this depth + 1 and below
          .filter(function(d) { return d.depth > currentDepth })
          .classed("hide", false);
        
      }

    cells
      .style("left", function(d) { return x(d.x0) + "%"; })
      .style("top", function(d) { return y(d.y0) + "%"; })
      .style("width", function(d) { return x(d.x1) - x(d.x0) + "%"; })
      .style("height", function(d) { return y(d.y1) - y(d.y0) + "%"; })
      //.style("background-image", function(d) { return d.value ? imgUrl + d.value : ""; })
      //.style("background-image", function(d) { return d.value ? "url(http://placekitten.com/g/300/300)" : "none"; }) 
      /*.style("background-color", d => { 
        while (d.depth > 2) {
          d = d.parent; 
        }
          return color(d.data.name);
      })
      .on("click", zoom)
      .append("p")
      .attr("class", "label")
      .text(function(d) { return d.data.name ? d.data.name : "---"; });
      //.style("font-size", "")
      //.style("opacity", function(d) { return isOverflowed( d.parent ) ? 1 : 0; });

    var parent = d3.select(".up")
      .datum(nodes)
      .on("click", zoom);
  }*/
}
