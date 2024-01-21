import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { filter, map, pairwise, tap } from 'rxjs';
import { Scrobble, User } from './items';
import { MessageService } from './message.service';

export interface ScrobbleState {
  scrobbles: Scrobble[];
  albumArt?: {
    [key: string]: string
  }
  user?: User;

  totalTrackPages: number;
  currTrackPage: number;

  totalAlbumPages: number;
  currAlbumPage: number;

  state: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScrobbleStorageService extends ComponentStore<ScrobbleState>{
  constructor(private messageService: MessageService) { 
    super({
      scrobbles: [],
      totalTrackPages: 0,
      currTrackPage: 0,
      totalAlbumPages: 0,
      currAlbumPage: 0,
      state: 'GETTINGUSER'
    });
  }

  readonly updateUser = this.updater((currData: ScrobbleState, user: User) => {
    //this.log('updateUser');

    return {
      ...currData,
      user,
      state: 'CALCULATINGPAGES'
    }
  })

  readonly updateTrackTotal = this.updater((currData: ScrobbleState, page: {totalTrackPages: number, currTrackPage: number}) => {
    //this.log('updateTotal');

    return {
      ...currData,
      ...page,
      state: 'GETTINGSCROBBLES'
    }
  })

  readonly addTrackPage = this.updater((currData: ScrobbleState, newScrobbles: Scrobble[]) => {
    //this.log('addPage');

    return {
      ...currData,
      currTrackPage: currData.currTrackPage - 1,
      scrobbles: [...currData.scrobbles, ...newScrobbles]
    };
  })
  
  readonly updateAlbumTotal = this.updater((currData: ScrobbleState, page: {totalAlbumPages: number, currAlbumPage: number}) => {
    return {
      ...currData,
      ...page,
      state: 'GETTINGALBUMCOVERS'
    }
  })

  readonly addAlbumPage = this.updater((currData: ScrobbleState, newAlbums: {[key: string]: string}) => {
    return {
      ...currData,
      currAlbumPage: currData.currAlbumPage - 1,
      albumArt: {
        ...currData.albumArt,
        ...newAlbums
      },
    }
  })

  readonly finish = this.updater((currData: ScrobbleState, state: string) => {
    //this.log('finish');

    return {
      ...currData,
      state
    }
  }) 

  readonly loadingState = this.select(state => state.state);

  readonly loadingStatus = this.state$.pipe(
    //tap(() => this.log('loadingStatus')),
    filter(state => state.state === 'GETTINGSCROBBLES' || state.state == 'GETTINGALBUMCOVERS'),
    map(state => [state.scrobbles, state.currTrackPage, state.totalTrackPages, state.currAlbumPage, state.totalAlbumPages] as [Scrobble[], number, number, number, number])
  );

  readonly trackPageChunk = this.state$.pipe(
    filter(state => state.state === 'GETTINGSCROBBLES'),
    map(state => state.scrobbles),
    pairwise(),
    map(([previous, next]) => next.slice(previous.length)),
    //tap((scrobbles) => this.log(scrobbles[0].track))
  );
  
  readonly albumArtStatus = this.state$.pipe(
    filter(state => state.state === 'GETTINGALBUMCOVERS' && "albumArt" in state),
    map(state => [state.albumArt, state.totalAlbumPages] as [{[key: string]: string}, number]),
  );

  private log(message: string) {
    this.messageService.add(`ScrobbleStorage: ${message}`);
  }
}
