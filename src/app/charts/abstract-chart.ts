import { AlignValue, PointOptionsType, XAxisOptions } from 'highcharts';
import * as Highcharts from 'highcharts';
import { ChartStats } from '../items';
import treemap from 'highcharts/modules/treemap';

treemap(Highcharts);

export abstract class AbstractChart {
    options: Highcharts.Options = {};
    chart?: Highcharts.Chart;

    abstract update(stats: ChartStats): void;

    load(container: HTMLElement): void {
        this.chart = Highcharts.chart(container, this.options);
    }

    setData(...data: Array<PointOptionsType>[]): void {
        for (let i = 0; i < data.length; i++) {
            this.chart!.series[i].setData(data[i]);
        }
    }
}