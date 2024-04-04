export interface User {
    name: string;
    playcount: string;
    url: string;
}

export interface Scrobble {
    track: string;
    album: string;
    artistName: string;
    albumImage?: string;
    date: Date;
}

export interface ScrobblesJSON {
    username: string;
    scrobbles: {
        track: string;
        album: string;
        artist: string;
        albumImage: string;
        date: number;
    }[]
    artistImages: {
        [key: string]: [string, string]
    }
    albumImages: {
        artists: {
            [key: string]: {
              [key: string]: string
            }
        }
    }
}

export interface AlbumImages {
    artists: {
      [key: string]: {
        [key: string]: string
      }
    }
  }
  

export interface LoadingStats {
    scrobblesFetched: number,
    pageNumber: number,
    totalPages: number
}

export interface ChartStats {
    artists: {
        [key: string]: Artist
    }
}

export interface Artist {
    //tracks: String[],
    albums: {
        [key: string]: Album
    }
    scrobbles: number[], //holds the date values of each scrobble
    name: string,
    image_url?: string
    color?: string
}

export interface Album {    
    //artist: string,
    tracks: {
        [key: string]: Track
    },
    scrobbles: number[],
    name: string
    image_url?: string
    color?: string
}

export interface Track {
    //artist: string,
    //album: string,
    scrobbles: number[],
    name: string
}

export interface Combination {
    name: string,
    artists: string[]
}
