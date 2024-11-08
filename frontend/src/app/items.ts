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
    artistCombinations: ArtistCombo[],
    albumCombinations: AlbumCombo[]
}

export interface TreeNode {
    name: string;
    value?: number;
    children?: TreeNode[];
    image?: string;
    color?: string;
    artist?: string;
    //isCombo: boolean;
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
    scrobbles: number[] //holds the date values of each scrobble
    name: string
    image_url?: string
    color?: string
    isCombo: boolean
}

export interface Album {
    tracks: {
        [key: string]: Track
    }
    scrobbles: number[]
    name: string
    image_url?: string
    color?: string
    isCombo: boolean
    artistName: string
}

export interface Track {
    //artist: string,
    //album: string,
    scrobbles: number[],
    name: string
}


export interface ArtistCombo {
    name: string,
    children: Artist[]
}

export interface AlbumCombo {
    name: string,
    children: Album[]
}

export interface TopAlbum {
    name: string,
    playcount: number,
    artist: string,
    image: Image[],
    color?: string,
}

export interface TopArtist {
    name: string,
    playcount: number,
    image: string,
    color?: string,
}

export interface Image {
    size: string;
    '#text': string;
}

export type TreemapViewType = 'Artists' | 'Albums' | 'Tracks'

export type PeriodType = 'overall' | '7day' | '1month' | '3month' | '6month' | '12month'