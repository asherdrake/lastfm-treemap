import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MessagesComponent } from './messages/messages.component';
import { StoreModule } from '@ngrx/store';
import { TreemapComponent } from './treemap/treemap.component';
import { LoadingComponent } from './loading/loading.component';
import { FormsModule } from '@angular/forms';
import { DatasetComponent } from './dataset/dataset.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TableVirtualScrollModule } from 'ng-table-virtual-scroll';

@NgModule({
  declarations: [
    AppComponent,
    MessagesComponent,
    TreemapComponent,
    LoadingComponent,
    DatasetComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ScrollingModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    TableVirtualScrollModule,
    StoreModule.forRoot({}, {}),
    NoopAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
