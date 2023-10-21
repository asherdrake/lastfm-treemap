import { Injectable } from '@angular/core';
import { User } from './items';
import { Observable, of} from 'rxjs';
import { HttpParams, HttpClient } from '@angular/common/http'
import { map, tap, catchError } from 'rxjs/operators'
import { MessageService } from './message.service';

@Injectable({
  providedIn: 'root'
})
export class ScrobbleGetterService {
  private readonly API_KEY = '2a9fa20cf72cff44d62d98800ec93aaf';
  private readonly URL = 'https://ws.audioscrobbler.com/2.0/';
  constructor(private http: HttpClient, private messageService: MessageService) { }

  getScrobbles() {

  }

  getUser(username: string): Observable<User> {
    this.log('getting User...');
    const params = new HttpParams()
      .append('method', 'user.getinfo')
      .append('user', username)
      .append('format', 'json')
      .append('api_key', this.API_KEY);

    return this.http.get<{user: User}>(this.URL, {params}).pipe(map(u => u.user));
        // tap(user => this.log(`fetched hero id=${user.name}`)))
        // catchError(this.handleError<User>(`getUser`)));
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
