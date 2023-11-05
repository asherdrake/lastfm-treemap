import { Directive, Input, ElementRef } from '@angular/core';
import { AbstractChart } from './charts/abstract-chart';

@Directive({
  selector: '[chartLoader]'
})
export class ChartLoaderDirectiveDirective {

  constructor(private elementRef: ElementRef) { }

  @Input()
  set chart(chart: AbstractChart) {
    chart.load(this.elementRef.nativeElement);
  }
}
