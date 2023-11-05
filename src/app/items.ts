export interface User {
    name: string;
    playcount: string;
    url: string;
}

export interface Scrobble {
    track: string;
    album: string;
    artist: string;
    date: Date;
}

export interface LoadingStats {
    scrobblesFetched: number,
    pageNumber: number,
    totalPages: number
}

export interface ChartStats {
    artists: {
        [key: string]: Artist
    },
    albums: {
        [key: string]: Album
    },
    tracks: {
        [key: string]: Track
    }
}

export interface Artist {
    tracks: String[],
    scrobbles: number[], //holds the date values of each scrobble
    name: string
}

export interface Album {
    artist: string,
    scrobbles: number[],
    name: string
}

export interface Track {
    artist: string,
    scrobbles: number[],
    name: string
}