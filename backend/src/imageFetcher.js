const axios = require('axios');
const cheerio = require('cheerio');


module.exports.getImageURL = async function(artistName) {
    const url = `https://last.fm/music/${artistName}/+images`;

    return axios.get(url, { responseType: 'text' })
        .then(response => {
            const imageUrl = `https://lastfm.freetls.fastly.net/i/u/300x300/${parseHtmlForImageId(response.data, artistName)}`;
            return imageUrl;
        })
        .catch(error => {
            console.error('Error fetching artist image:', error);
            return '';
        });
}

function parseHtmlForImageId(html, artistName) {
    const $ = cheerio.load(html);

    const anchor = $('.image-list-item-wrapper a').attr('href');
    if (anchor) {
        const parts = anchor.split('/');
        console.log("Parse successful: " + artistName)
        return parts[parts.length - 1];
    } else {
        console.error("Anchor not created: " + artistName)
    }

    return '';
}
