import { Injectable } from '@angular/core';
import { User, Scrobble, LoadingStats } from './items';
import { Observable, of} from 'rxjs';
import { HttpParams, HttpClient } from '@angular/common/http'
import { map, tap, takeWhile, take, switchMap } from 'rxjs/operators'
import { MessageService } from './message.service';
import { ScrobbleStorageService } from './scrobble-storage.service';

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
  };
  album: {
    '#text': string;
  };
  date: {
    uts: number;
  };
  '@attr'?: {
    nowplaying?: 'true' | 'false'
  }
}

interface LoadingState {
  storage: ScrobbleStorageService;
  username: string;
  totalPages?: number;
  pageSize?: number;
  page?: number
}

@Injectable({
  providedIn: 'root'
})
export class ScrobbleGetterService {
  private readonly API_KEY = '2a9fa20cf72cff44d62d98800ec93aaf';
  private readonly URL = 'https://ws.audioscrobbler.com/2.0/';

  constructor(private http: HttpClient, private messageService: MessageService) { }

  initializeFetching(username: string, storage: ScrobbleStorageService){
    this.getUser(username).subscribe({
      next: user => {
        storage.updateUser(user);
        this.calcPages({storage, username: user.name, pageSize: 200})
      },
      error: (e) => storage.finish(e.status === 404 ? 'USERNOTFOUND' : 'LOADFAILED')
    });
  }

  private calcPages(loadingState: LoadingState) {
    loadingState.page = 1;
    this.getScrobbles(loadingState).subscribe({
      next: recenttracks => {
        const pageTotal = parseInt(recenttracks['@attr'].totalPages);

        if (pageTotal > 0) {
          loadingState.storage.updateTotal({
            totalPages: pageTotal,
            currPage: pageTotal
          });

          this.iteratePages({...loadingState, page: pageTotal, totalPages: pageTotal});
        }
      }
    })
  }

  private iteratePages(loadingState: LoadingState): void {
    loadingState.storage.loadingState.pipe(
      takeWhile(state => state === 'GETTINGSCROBBLES'),
      take(1),
      switchMap(() => this.getScrobbles(loadingState))
    ).subscribe({
      next: recenttracks => {
        this.storeAsScrobbles(loadingState, recenttracks.track);

        if (loadingState.page! > 0) {
          const numPagesHandled = loadingState.totalPages! - loadingState.page!;
          this.iteratePages(loadingState);
        } else {
          loadingState.storage.finish('FINISHED');
        }
      }
    })
  }

  private storeAsScrobbles(loadingState: LoadingState, tracks: Track[]): void {
    const scrobbles: Scrobble[] = tracks.filter(t => t.date && !(t['@attr']?.nowplaying === 'true')).map(t => ({
      track: t.name,
      album: t.album['#text'],
      artist: t.artist['#text'],
      date: new Date(t.date.uts * 1000)
    })).reverse();
    
    loadingState.page!--;
    loadingState.storage.addPage(scrobbles);
  }

  private getScrobbles(loadingState: LoadingState): Observable<RecentTracks> {
    //this.log('getting Scrobbles...Current Page:' + loadingState.page);
    const params = new HttpParams()
      .append('method', 'user.getrecenttracks')
      .append('user', loadingState.username)
      .append('page', String(loadingState.page))
      .append('format', 'json')
      .append('limit', 200)
      .append('api_key', this.API_KEY);

    return this.http.get<{recenttracks: RecentTracks}>(this.URL, {params}).pipe(
      map(response => response.recenttracks)
    );
  }

  private getUser(username: string): Observable<User> {
    this.log('getting User...');
    const params = new HttpParams()
      .append('method', 'user.getinfo')
      .append('user', username)
      .append('format', 'json')
      .append('api_key', this.API_KEY);

    return this.http.get<{user: User}>(this.URL, {params}).pipe(
      map(u => u.user),
      tap(user => this.log(`fetched last.fm user=${user.name}`))
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
