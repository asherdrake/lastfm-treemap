import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { StoreModule } from '@ngrx/store';
import { FormsModule } from '@angular/forms';
import { InteractiveModule } from './interactive/interactive.module';
import { provideHttpClient } from '@angular/common/http';
import { SharedModule } from './shared/shared.module';
import { DatasetComponent } from './dataset/dataset.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TableVirtualScrollModule } from 'ng-table-virtual-scroll';
import { CommonModule } from '@angular/common';
import { LightweightModule } from './lightweight/lightweight.module';

@NgModule({
  declarations: [
    AppComponent,
    DatasetComponent,
  ],
  imports: [
    CommonModule,
    BrowserModule,
    ScrollingModule,
    AppRoutingModule,
    FormsModule,
    SharedModule,
    InteractiveModule,
    LightweightModule,
    ReactiveFormsModule,
    TableVirtualScrollModule,
    StoreModule.forRoot({}, {}),
  ],
  providers: [provideHttpClient()],
  bootstrap: [AppComponent]
})
export class AppModule { }
