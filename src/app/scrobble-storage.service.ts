import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { filter, map, pairwise, tap } from 'rxjs';
import { Scrobble, User } from './items';
import { MessageService } from './message.service';

export interface ScrobbleState {
  scrobbles: Scrobble[];
  user?: User;
  totalPages: number;
  currPage: number;
  state: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScrobbleStorageService extends ComponentStore<ScrobbleState>{
  constructor(private messageService: MessageService) { 
    super({
      scrobbles: [],
      totalPages: 0,
      currPage: 0,
      state: 'GETTINGUSER'
    });
  }

  readonly updateUser = this.updater((currData: ScrobbleState, user: User) => {
    this.log('updateUser');

    return {
      ...currData,
      user,
      state: 'CALCULATINGPAGES'
    }
  })

  readonly updateTotal = this.updater((currData: ScrobbleState, page: {totalPages: number, currPage: number}) => {
    this.log('updateTotal');

    return {
      ...currData,
      ...page,
      state: 'GETTINGSCROBBLES'
    }
  })

  readonly addPage = this.updater((currData: ScrobbleState, newScrobbles: Scrobble[]) => {
    this.log('addPage');

    return {
      ...currData,
      currPage: currData.currPage - 1,
      scrobbles: [...currData.scrobbles, ...newScrobbles]
    };
  })

  readonly finish = this.updater((currData: ScrobbleState, state: string) => {
    this.log('finish');

    return {
      ...currData,
      state
    }
  }) 

  readonly loadingState = this.select(state => state.state);

  readonly loadingStatus = this.state$.pipe(
    tap(() => this.log('loadingStatus')),
    filter(state => state.state === 'GETTINGSCROBBLES'),
    map(state => [state.scrobbles, state.currPage, state.totalPages] as [Scrobble[], number, number])
  );

  readonly pageChunk = this.state$.pipe(
    filter(state => state.state === 'GETTINGSCROBBLES'),
    map(state => state.scrobbles),
    pairwise(),
    map(([previous, next]) => next.slice(previous.length)),
    tap((scrobbles) => this.log(scrobbles[0].track))
  );

  private log(message: string) {
    this.messageService.add(`ScrobbleStorage: ${message}`);
  }
}
