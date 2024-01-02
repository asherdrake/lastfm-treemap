import { AbstractChart } from "./abstract-chart";
import { ChartStats, Artist, Album } from "../items";

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

    // update(stats: ChartStats): void {
    //     let chartData = Object.values(stats.artists).sort(this.compareFn).slice(0, 100).map(artist => ({
    //         name: artist.name,
    //         value: artist.scrobbles.length
    //     }));

    //     this.setData(chartData);
    // }

    update(chartStats: ChartStats): void {
        let albums: Album[] = [];
    
        for (const artistKey in chartStats.artists) {
            if (chartStats.artists.hasOwnProperty(artistKey)) {
                const artist = chartStats.artists[artistKey];
                for (const albumKey in artist.albums) {
                    if (artist.albums.hasOwnProperty(albumKey)) {
                        albums.push(artist.albums[albumKey]);
                    }
                }
            }
        }

        let chartData = albums.sort(this.compareFn).slice(0, 100).map(album => ({
            name: album.name,
            value: album.scrobbles.length
        }));

        this.setData(chartData)
    }

    private compareFn(a: any, b: any) {
        if (a.scrobbles.length > b.scrobbles.length) {
          return -1;
        } else if (a.scrobbles.length < b.scrobbles.length) {
          return 1;
        }
    
        return 0;
    }
}