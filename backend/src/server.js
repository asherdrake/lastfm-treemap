const express = require('express');
const path = require('path');
const { getImageURL } = require('./imageFetcher.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../../frontend/dist/lastfm-data-visualizer')));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
})

app.get('/api/artist-image/:artistName', async (req, res) => {
    const { artistName } = req.params;
    getImageURL(artistName)
        .then(imageUrl => {
            res.json({ imageUrl });
        })
        .catch(error => {
            console.error(error);
            res.status(500).send('Server error');
        });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/lastfm-data-visualizer/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
})
