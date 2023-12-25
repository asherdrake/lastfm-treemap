import { AbstractChart } from "./abstract-chart";
import { ChartStats } from "../items";

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
        let chartData = Object.values(stats.artists).map(artist => ({
            name: artist.name,
            value: artist.scrobbles.length
        }));

        this.setData(chartData);
    }
}