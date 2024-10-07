import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { InteractiveComponent } from './interactive.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    InteractiveComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule
  ],
  exports: [
    InteractiveComponent
  ]
})
export class InteractiveModule { }
