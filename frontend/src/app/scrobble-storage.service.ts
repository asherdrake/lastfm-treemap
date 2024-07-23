import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { merge, distinctUntilChanged, filter, map, pairwise, switchMap, takeWhile, tap } from 'rxjs';
import { AlbumImages, Scrobble, User, ArtistCombo, AlbumCombo, Artist, Album } from './items';
import { MessageService } from './message.service';

export interface ScrobbleState {
  scrobbles: Scrobble[];
  artistImages?: {
    [key: string]: [string, string]
  }
  albumImages?: AlbumImages
  user?: User;

  artistCombinations: ArtistCombo[];
  albumCombinations: AlbumCombo[];

  totalTrackPages: number;
  currTrackPage: number;

  state: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScrobbleStorageService extends ComponentStore<ScrobbleState> {
  constructor(private messageService: MessageService) {
    super({
      scrobbles: [],
      totalTrackPages: 0,
      currTrackPage: 0,
      artistCombinations: [],
      albumCombinations: [],
      state: 'GETTINGUSER'
    });
  }

  readonly updateArtistCombos = this.updater((currData: ScrobbleState, artistCombos: ArtistCombo[]) => {
    //const updatedCombos = [...currData.combinations, ...combo];
    return {
      ...currData,
      artistCombinations: artistCombos
    }
  })

  readonly updateAlbumCombos = this.updater((currData: ScrobbleState, albumCombos: AlbumCombo[]) => {
    //const updatedCombos = [...currData.combinations, ...combo];
    return {
      ...currData,
      albumCombinations: albumCombos
    }
  })

  readonly addImport = this.updater((currData: ScrobbleState, imported: { importedScrobbles: Scrobble[], artistImages: { [key: string]: [string, string] }, albumImages: AlbumImages, artistCombinations: ArtistCombo[], albumCombinations: AlbumCombo[] }) => {
    console.log("json imported, artistImages: " + imported.artistImages)
    return {
      ...currData,
      scrobbles: [...imported.importedScrobbles],
      artistImages: imported.artistImages,
      albumImages: imported.albumImages,
      artistCombinations: imported.artistCombinations ? imported.artistCombinations : [],
      albumCombinations: imported.albumCombinations ? imported.albumCombinations : []
    }
  })

  readonly updateUser = this.updater((currData: ScrobbleState, user: User) => {
    //this.log('updateUser');
    console.log("state: CALCULATINGPAGES");
    return {
      ...currData,
      user,
      state: 'CALCULATINGPAGES'
    }
  })

  readonly updateTrackTotal = this.updater((currData: ScrobbleState, page: { totalTrackPages: number, currTrackPage: number }) => {
    //this.log('updateTotal');

    console.log("state: GETTINGSCROBBLES");
    return {
      ...currData,
      ...page,
      state: 'GETTINGSCROBBLES'
    }
  })

  readonly updateDateRange = this.updater((currData: ScrobbleState, dateRange: { startDate: number, endDate: number }) => {
    console.log('updateDateRange');

    return {
      ...currData,
      //startDate: dateRange.startDate,
      //endDate: dateRange.endDate
      ...dateRange
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

  readonly updateArtistImages = this.updater((currData: ScrobbleState, artistImages: { [key: string]: [string, string] }) => {
    console.log("updateArtistImages(componentstore): " + artistImages)
    return {
      ...currData,
      artistImages: artistImages
    }
  })

  readonly updateAlbumImages = this.updater((currData: ScrobbleState, albumImages: AlbumImages) => {
    return {
      ...currData,
      albumImages: albumImages
    }
  })

  readonly updateAlbumTotal = this.updater((currData: ScrobbleState, page: { totalAlbumPages: number, currAlbumPage: number }) => {
    console.log("state: GETTINGALBUMCOVERS");
    return {
      ...currData,
      ...page,
      state: 'GETTINGALBUMCOVERS'
    }
  })

  readonly finish = this.updater((currData: ScrobbleState, state: string) => {
    //this.log('finish');
    console.log("state: " + state);
    return {
      ...currData,
      state
    }
  })

  readonly loadingState = this.select(state => state.state);

  readonly loadingStatus = this.state$.pipe(
    //tap(() => this.log('loadingStatus')),
    filter(state => state.state === 'GETTINGSCROBBLES' || state.state == 'GETTINGALBUMCOVERS'),
    map(state => [state.scrobbles, state.currTrackPage, state.totalTrackPages] as [Scrobble[], number, number])
  );

  readonly scrobbles$ = this.select(state => state.scrobbles);

  readonly trackPageChunk = this.state$
    .pipe(
      filter(state => state.state === 'GETTINGSCROBBLES'),
      distinctUntilChanged(),
      switchMap(() => this.scrobbles$),
      pairwise(),
      tap(() => console.log('trackPageChunk')),
      map(([previous, next]) => next.slice(previous.length))
    );

  readonly imported = this.state$
    .pipe(
      filter(state => state.state === 'CALCULATINGPAGES'),
      tap(state => console.log("IMPORTED: " + state.scrobbles.length)),
      map(state => state.scrobbles)
    );

  readonly chunk = merge(
    this.imported.pipe(map(scrobbles => [scrobbles, false] as [Scrobble[], boolean])),
    this.trackPageChunk.pipe(map(scrobbles => [scrobbles, true] as [Scrobble[], boolean]))
  );

  readonly artistImageStorage = this.state$.pipe(
    tap(state => console.log("artistImageStorage emit: " + state.artistImages)),
    map(state => state.artistImages)
  )

  readonly albumImageStorage = this.state$.pipe(
    map(state => state.albumImages)
  )

  readonly artistCombos = this.state$.pipe(
    map(state => state.artistCombinations)
  )

  readonly albumCombos = this.state$.pipe(
    map(state => state.albumCombinations)
  )

  readonly artistImageUpdate = this.select(state => state.artistImages);

  private log(message: string) {
    this.messageService.add(`ScrobbleStorage: ${message}`);
  }
}
