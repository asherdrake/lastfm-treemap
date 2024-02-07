const axios = require('axios');
const cheerio = require('cheerio');

function getImageURL(artistName) {
    const url = `https://last.fm/music/${artistName}/+images`;

    return axios.get(url, { responseType: 'text' })
        .then(response => {
            const imageUrl = `https://lastfm.freetls.fastly.net/i/u/300x300/${parseHtmlForImageId(response.data)}`;
            return imageUrl;
        })
        .catch(error => {
            console.error('Error fetching artist image:', error);
            return '';
        });
}

function parseHtmlForImageId(html) {
    const $ = cheerio.load(html);

    const anchor = $('.image-list-item-wrapper a').attr('href');
    if (anchor) {
        const parts = anchor.split('/');
        return parts[parts.length - 1];
    }

    return '';
}
