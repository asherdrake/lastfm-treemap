import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { InteractiveComponent } from './interactive.component';
import { FormsModule } from '@angular/forms';
import { InteractiveRoutingModule } from './interactive-routing.module';

@NgModule({
  declarations: [
    InteractiveComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    InteractiveRoutingModule
  ],
  exports: [
    InteractiveComponent
  ]
})
export class InteractiveModule { }
