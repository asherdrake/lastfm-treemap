const axios = require('axios');
// const cheerio = require('cheerio');
const qs = require('qs');
require('dotenv').config();

// module.exports.getImageURL = async function (artistName) {
//     const url = `https://last.fm/music/${artistName}/+images`;

//     return axios.get(url, { responseType: 'text' })
//         .then(response => {
//             const imageUrl = `https://lastfm.freetls.fastly.net/i/u/300x300/${parseHtmlForImageId(response.data, artistName)}`;
//             return imageUrl;
//         })
//         .catch(error => {
//             console.error('Error fetching artist image:', error);
//             return '';
//         });
// }

// function parseHtmlForImageId(html, artistName) {
//     const $ = cheerio.load(html);

//     const anchor = $('.image-list-item-wrapper a').attr('href');
//     if (anchor) {
//         const parts = anchor.split('/');
//         console.log("Parse successful: " + artistName)
//         return parts[parts.length - 1];
//     } else {
//         console.error("Anchor not created: " + artistName)
//     }

//     return '';
// }

var clientId = process.env.CLIENT_ID;
var clientSecret = process.env.CLIENT_SECRET;
var authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

let accessToken = null;
let tokenExpiresAt = null;

async function getAccessToken() {
    try {
        //returns existing accessToken if yet to expire
        if (accessToken && tokenExpiresAt && new Date() < tokenExpiresAt) {
            return accessToken;
        }

        tokenUrl = 'https://accounts.spotify.com/api/token';
        const data = qs.stringify({ 'grant_type': 'client_credentials' });
        const headers = {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        const response = await axios.post(tokenUrl, data, { headers: headers });

        accessToken = response.data.access_token;
        tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);

        return accessToken;
    }
    catch (e) {
        console.error(e);
    }
}

async function fetchWithRetry(url, options, retries = 3) {
    try {
        const response = await axios.get(url, options);
        return response;
    } catch (e) {
        if (e.response && e.response.status === 429 && retries > 0) {
            const retryAfter = parseInt(e.response.headers['retry-after'], 10) * 1000; // Convert seconds to milliseconds
            console.log(`Rate limited. Retrying after ${retryAfter / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryAfter)); // Wait for the specified time
            return fetchWithRetry(url, options, retries - 1); // Retry the request
        } else if (e.response && e.response.status === 429) {
            console.error('Rate limit reached and retries exhausted.');
            throw e; // Throw the error if retries are exhausted
        } else {
            console.error(`Request failed: ${e.message}`);
            throw e; // Rethrow other errors
        }
    }
}

module.exports.getImageURL = async function (artistName) {
    const token = await getAccessToken();
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;
    const options = {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }

    const response = await fetchWithRetry(searchUrl, options);

    const artists = response.data.artists.items;

    if (artists.length > 0) {
        const artist = artists[0]
        console.log(`${artist.name} images num: ${artist.images.length}`);
        return artist.images.length > 0 ? artist.images[0].url : null;
    } else {
        console.error(`Artist ${artistName} not found on Spotify`);
        return null;
    }
}

