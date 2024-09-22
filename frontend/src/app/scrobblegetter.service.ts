import { Injectable } from '@angular/core';
import { User, Scrobble, AlbumImages, ArtistCombo, AlbumCombo, TopAlbum, Image } from './items';
import { BehaviorSubject, catchError, Observable, of } from 'rxjs';
import { HttpParams, HttpClient } from '@angular/common/http'
import { map, tap, takeWhile, take, switchMap } from 'rxjs/operators'
import { MessageService } from './message.service';
import { ScrobbleStorageService } from './scrobble-storage.service';
//import * as DOMParser from 'dom-parser';

interface RecentTracks {
  track: Track[]
  '@attr': {
    page: string;
    perPage: string;
    totalPages: string;
  }
}

interface Track {
  name: string;
  artist: {
    '#text': string;
    '@attr'?: {
      mbid?: string;
    }
  };
  album: {
    '#text': string;
  };
  date: {
    uts: number;
  };
  image: Image[];
  '@attr'?: {
    nowplaying?: 'true' | 'false'
  }
}

interface TopAlbums {
  album: TopAlbum[]
}

interface LoadingState {
  storage: ScrobbleStorageService;
  username: string;

  from: string;

  totalTrackPages?: number;
  trackPageSize?: number;
  trackPage?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScrobbleGetterService {
  private readonly API_KEY = '2a9fa20cf72cff44d62d98800ec93aaf';
  private readonly URL = 'https://ws.audioscrobbler.com/2.0/';
  public topAlbumSubject = new BehaviorSubject<TopAlbum[]>([]);
  constructor(private http: HttpClient, private messageService: MessageService) { }

  initializeFetching(username: string, startDate: string, endDate: string, storage: ScrobbleStorageService, importedScrobbles: Scrobble[], artistImages: { [key: string]: [string, string] }, albumImages: AlbumImages, artistCombinations: ArtistCombo[], albumCombinations: AlbumCombo[]) {
    this.getUser(username).subscribe({
      next: user => {
        //storage.updateUser(user);
        console.log("initializing fetching....startDate = " + startDate);

        const from = String(this.getStartDate(importedScrobbles));
        storage.addImport({ importedScrobbles, artistImages, albumImages, artistCombinations, albumCombinations });
        storage.updateUser(user);
        this.calcTrackPages({ storage, username: user.name, trackPageSize: 200, from })

      },
      error: (e) => {
        storage.finish(e.status === 404 ? 'USERNOTFOUND' : 'LOADFAILED');
        throw e;
      }
    });
  }

  getStartDate(importedScrobbles: Scrobble[]): number {
    console.log("Getting Start Date..");
    if (importedScrobbles.length) {
      console.log("From = " + importedScrobbles[importedScrobbles.length - 1].date.getTime() + 1);
      return importedScrobbles[importedScrobbles.length - 1].date.getTime() / 1000 + 1;
    }
    return 0;
  }

  private calcTrackPages(loadingState: LoadingState) {
    loadingState.trackPage = 1;
    console.log("calcTrackPages");
    this.getScrobbles(loadingState).subscribe({
      next: recenttracks => {
        console.log("calcTrackPages subscription");
        const pageTotal = parseInt(recenttracks['@attr'].totalPages);

        if (pageTotal > 0) {
          loadingState.storage.updateTrackTotal({
            totalTrackPages: pageTotal,
            currTrackPage: pageTotal
          });
          console.log("Getting scrobbles start...");
          this.iterateTrackPages({ ...loadingState, trackPage: pageTotal, totalTrackPages: pageTotal });
        } else {
          console.log("GETTING SCROBBLES FINISHED (calcTrackPages");
          loadingState.storage.finish('FINISHED');
        }
      }
    })
  }

  private iterateTrackPages(loadingState: LoadingState): void {
    loadingState.storage.loadingState.pipe(
      takeWhile(state => state === 'GETTINGSCROBBLES'),
      take(1),
      switchMap(() => this.getScrobbles(loadingState))
    ).subscribe({
      next: recenttracks => {
        this.storeAsScrobbles(loadingState, recenttracks.track);

        if (loadingState.trackPage! > 0) {
          const numPagesHandled = loadingState.totalTrackPages! - loadingState.trackPage!;
          console.log("if loadingState.trackPage: " + loadingState.trackPage)
          //loadingState.trackPage!--;
          this.iterateTrackPages(loadingState);
        } else {
          console.log("else loadingState.trackPage: " + loadingState.trackPage);
          console.log("GETTING SCROBBLES FINISHED (iterateTrackPages)");
          loadingState.storage.finish('FINISHED');
        }
      },
      error: (err) => {
        console.error('Error while iterating track pages:', err)
        loadingState.storage.finish('LOADFAILED500');
      }
    })
  }

  private storeAsScrobbles(loadingState: LoadingState, tracks: Track[]): void {
    const scrobbles: Scrobble[] = tracks.filter(t => t.date && !(t['@attr']?.nowplaying === 'true')).map(t => ({
      track: t.name,
      album: t.album['#text'],
      artistName: t.artist['#text'],
      albumImage: t.image[3]['#text'],
      date: new Date(t.date.uts * 1000)
    })).reverse();

    //console.log("NEW SCROBBLES: " + scrobbles.length)
    loadingState.trackPage!--;
    loadingState.storage.addTrackPage(scrobbles);
  }

  private getScrobbles(loadingState: LoadingState): Observable<RecentTracks> {
    const params = new HttpParams()
      .append('method', 'user.getrecenttracks')
      .append('user', loadingState.username)
      .append('page', String(loadingState.trackPage))
      .append('from', loadingState.from)
      .append('format', 'json')
      .append('limit', 1000)
      .append('api_key', this.API_KEY);

    console.log("getScrobbles page: " + String(loadingState.trackPage))
    return this.http.get<{ recenttracks: RecentTracks }>(this.URL, { params }).pipe(
      map(response => response.recenttracks)
    );
  }

  public startTopAlbums(username: string) {
    this.getTopAlbums(username).subscribe(topAlbums => {
      this.topAlbumSubject.next(topAlbums.album);
    })
  }

  private getTopAlbums(username: string): Observable<TopAlbums> {
    const params = new HttpParams()
      .append('method', 'user.gettopalbums')
      .append('user', username)
      .append('period', 'overall')
      .append('limit', 100)
      .append('page', 1)
      .append('format', 'json')
      .append('api_key', this.API_KEY);

    console.log('getTopAlbums')

    return this.http.get<{ topalbums: TopAlbums }>(this.URL, { params }).pipe(
      tap(response => console.log(response.topalbums)),
      map(response => response.topalbums)
    );
  }

  private getUser(username: string): Observable<User> {
    this.log('getting User...');
    const params = new HttpParams()
      .append('method', 'user.getinfo')
      .append('user', username)
      .append('format', 'json')
      .append('api_key', this.API_KEY);

    return this.http.get<{ user: User }>(this.URL, { params }).pipe(
      map(u => u.user),
      tap(user => this.log(`fetched last.fm user=${user.name}`))
    );
  }

  getArtistImage(artistName: string): Observable<string> {
    //code to call the backend server-side proxy
    const url = `/api/artist-image/${artistName}`;
    return this.http.get<{ imageUrl: string }>(url).pipe(
      map(response => response.imageUrl),
      catchError(this.handleError<string>('getArtistImage'))
    );
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(error);
      this.log(`${operation} failed: ${error.message}`);
      return of(result as T);
    }
  }

  private log(message: string) {
    this.messageService.add(`ScrobbleGetterService: ${message}`);
  }
}
