import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { LightweightComponent } from './lightweight.component';
import { FormsModule } from '@angular/forms';
import { LightweightRoutingModule } from './lightweight-routing.module';



@NgModule({
  declarations: [
    LightweightComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    FormsModule,
    LightweightRoutingModule
  ],
  exports: [
    LightweightComponent
  ]
})
export class LightweightModule { }
