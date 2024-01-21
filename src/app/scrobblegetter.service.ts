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
  '@attr'?: {
    nowplaying?: 'true' | 'false'
  }
}

interface TopAlbums {
  album: Album[]
  '@attr': {
    page: string;
    perPage: string;
    totalPages: string;
  }
}

interface Album {
  name: string
  image: Image[]
}

interface Image {
  size: string;
  '#text': string;
}

interface LoadingState {
  storage: ScrobbleStorageService;
  username: string;

  totalTrackPages?: number;
  trackPageSize?: number;
  trackPage?: number;

  totalAlbumPages?: number;
  albumPageSize?: number;
  albumPage?: number;
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
        this.calcTrackPages({storage, username: user.name, trackPageSize: 200})
      },
      error: (e) => storage.finish(e.status === 404 ? 'USERNOTFOUND' : 'LOADFAILED')
    });
  }

  private calcTrackPages(loadingState: LoadingState) {
    loadingState.trackPage = 1;
    this.getScrobbles(loadingState).subscribe({
      next: recenttracks => {
        const pageTotal = parseInt(recenttracks['@attr'].totalPages);

        if (pageTotal > 0) {
          loadingState.storage.updateTrackTotal({
            totalTrackPages: pageTotal,
            currTrackPage: pageTotal
          });

          this.iterateTrackPages({...loadingState, trackPage: pageTotal, totalTrackPages: pageTotal});
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
          console.log("loadingState.trackPage: " + loadingState.trackPage)
          this.iterateTrackPages(loadingState);
        } else {
          loadingState.storage.finish('FINISHEDTRACKS');
          console.log("iterateTrackPages finished, moving on to albums")
          this.calcAlbumPages(loadingState);
        }
      }
    })
  }

  private storeAsScrobbles(loadingState: LoadingState, tracks: Track[]): void {
    const scrobbles: Scrobble[] = tracks.filter(t => t.date && !(t['@attr']?.nowplaying === 'true')).map(t => ({
      track: t.name,
      album: t.album['#text'],
      artistName: t.artist['#text'],
      date: new Date(t.date.uts * 1000)
    })).reverse();
    
    loadingState.trackPage!--;
    loadingState.storage.addTrackPage(scrobbles);
  }

  private calcAlbumPages(loadingState: LoadingState) {
    loadingState.albumPage = 1;
    this.getAlbums(loadingState).subscribe({
      next: topalbums => {
        const pageTotal = parseInt(topalbums['@attr'].totalPages);

        if (pageTotal > 0) {
          loadingState.storage.updateAlbumTotal({
            totalAlbumPages: pageTotal,
            currAlbumPage: pageTotal
          });

          this.iterateAlbumPages({...loadingState, albumPage: pageTotal, totalAlbumPages: pageTotal});
        }
      }
    })
  }
  
  private iterateAlbumPages(loadingState: LoadingState): void {
    loadingState.storage.loadingState.pipe(
      takeWhile(state => state === 'GETTINGALBUMCOVERS'),
      take(1),
      switchMap(() => this.getAlbums(loadingState))
    ).subscribe({
      next: topalbums => {
        this.storeAlbumArt(loadingState, topalbums.album);

        if (loadingState.albumPage! > 0) {
          //const numPagesHandled = loadingState.totalTrackPages! - loadingState.trackPage!;
          this.iterateAlbumPages(loadingState);
        } else {
          loadingState.storage.finish('FINISHEDALL');
        }
      }
    })
  }

  private storeAlbumArt(loadingState: LoadingState, album: Album[]): void {
    const albums: { [key: string]: string } = album.reduce((map, album) => {
      map[album.name] = album.image[3]['#text'];
      return map;
    }, {} as { [key: string]: string });
    
    // for (const key in albums) {
    //   console.log(key + ": " + albums[key]);
    // }

    loadingState.albumPage!--;
    loadingState.storage.addAlbumPage(albums);
  }

  private getScrobbles(loadingState: LoadingState): Observable<RecentTracks> {
    //this.log('getting Scrobbles...Current Page:' + loadingState.page);
    const params = new HttpParams()
      .append('method', 'user.getrecenttracks')
      .append('user', loadingState.username)
      .append('page', String(loadingState.trackPage))
      .append('format', 'json')
      .append('limit', 200)
      .append('api_key', this.API_KEY);

    return this.http.get<{recenttracks: RecentTracks}>(this.URL, {params}).pipe(
      map(response => response.recenttracks)
    );
  }

  private getAlbums(loadingState: LoadingState): Observable<TopAlbums> {
    const params = new HttpParams()
      .append('method', 'user.gettopalbums')
      .append('user', loadingState.username)
      .append('page', String(loadingState.albumPage))
      .append('format', 'json')
      .append('limit', 200)
      .append('api_key', this.API_KEY);

    return this.http.get<{topalbums: TopAlbums}>(this.URL, {params}).pipe(
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
