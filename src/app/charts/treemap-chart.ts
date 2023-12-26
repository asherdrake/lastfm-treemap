import { AbstractChart } from "./abstract-chart";
import { ChartStats, Artist } from "../items";

export class TreemapChart extends AbstractChart {
    constructor() {
        super();
        this.options = {
            title: {
                text: "Treemap Chart"
            },
            chart: {
                type: 'treemap'
            },
            series: [{
                name: 'Artists',
                type: 'treemap',
                layoutAlgorithm: 'squarified',
                data: []
            }]
        };
    }

    update(stats: ChartStats): void {
        let chartData = Object.values(stats.artists).sort(this.compareFn).slice(0, 100).map(artist => ({
            name: artist.name,
            value: artist.scrobbles.length
        }));

        this.setData(chartData);
    }

    private compareFn(a: Artist, b: Artist) {
        if (a.scrobbles.length > b.scrobbles.length) {
          return -1;
        } else if (a.scrobbles.length < b.scrobbles.length) {
          return 1;
        }
    
        return 0;
      }
}