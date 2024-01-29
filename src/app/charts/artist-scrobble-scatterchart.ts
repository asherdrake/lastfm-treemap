import { AbstractChart } from "./abstract-chart";
import { ChartStats } from "../items";

export class TracksAndScrobblesScatterChart extends AbstractChart {
    constructor() {
        super();
        this.options = {
            title: {
                text: "Tracks vs Scrobbles Scatter Chart"
            },
            chart: {
                type: 'scatter'
            },
            xAxis: {
                title: {
                    text: "Scrobbles"
                }
            },
            yAxis: {
                title: {
                    text: "Tracks"
                }
            },
            plotOptions: {
                scatter: {
                    tooltip: {
                        headerFormat: '',
                        pointFormat: '{point.name}<br>Scrobbles: {point.x}<br>Tracks: {point.y}',
                    }
                }
            },
            series: [{
                name: 'Artists',
                type: 'scatter',
                data: []
            }]
        };
    }

    update(stats: ChartStats): void {
        // let chartData = Object.values(stats.artists).map(artist => ({
        //     x: artist.scrobbles.length,
        //     y: artist.tracks.length,
        //     name: artist.name
        // }));

        // this.setData(chartData);
    }
}