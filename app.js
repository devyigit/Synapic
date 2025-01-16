const express = require('express');
const axios = require('axios');
const ejs = require('ejs');
const app = express();
const PORT = 3000;

const googleApiKey = 'AIzaSyDJsSgqZNQtWE1HH-RIRFZWIETuskgVVXo';
const googleCx = '14186417efcac49f0';
const ipinfoToken = 'c621d5706831cd';

const validApiKeys = ["synapicsearch"];

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));

function apiKeyMiddleware(req, res, next) {
  const apiKey = req.query.apikey;
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    return res.status(403).json({ error: "Geçersiz veya eksik API anahtarı" });
  }
  next();
}

const kodlar = require('./views/json/ApiKeys.json');

const checkApiKey = (req, res, next) => {
  const apiKey = req.query.apikey;
  if (!apiKey || !kodlar.includes(apiKey)) {
    return res.status(401).json({ error: 'API Key girmelisiniz.' });
  }
  next();
};

app.get('/borsa', (req, res) => {
  res.render('borsa');
});

app.get('/api', (req, res) => {
  res.render('api');
});

app.get('/api/dolar', checkApiKey, async (req, res) => {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    const dolar = response.data.rates.TRY;
    const zaman = response.data.time_last_updated;
    res.json({ dolar, zaman });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.get('/api/sterlin', checkApiKey, async (req, res) => {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/GBP');
    const sterlin = response.data.rates.TRY;
    const zaman = response.data.time_last_updated;
    res.json({ sterlin, zaman });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.get('/api/euro', async (req, res) => {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/EUR');
    const euro = response.data.rates.TRY;
    const zaman = response.data.time_last_updated;
    res.json({ euro, zaman });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.get('/shop', (req, res) => {
  res.render('shop');
});

app.get('/search', async (req, res) => {
  const startTime = Date.now();
  const query = req.query.query;
  if (!query) return res.send('Arama sorgusu eksik!');

  let countryCode = 'N/A';
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || '8.8.8.8';
    const response = await axios.get(`https://ipinfo.io/${ip}?token=${ipinfoToken}`);
    countryCode = response.data.country || 'N/A';
  } catch (error) {
    console.error('Ülke kodu alınırken bir hata oluştu:', error.message);
  }

  try {
    const searchResponse = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: googleApiKey, cx: googleCx, q: query },
    });

    const results = (searchResponse.data.items || []).map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      rating: Math.floor(Math.random() * 10) + 1,
    }));

    const images = (searchResponse.data.items || [])
      .filter(item => item.pagemap?.cse_image)
      .map(item => ({
        link: item.link,
        image: item.pagemap.cse_image[0].src,
      }));

    const shoppingResults = (searchResponse.data.items || [])
      .map(item => ({
        product: item.pagemap?.product?.[0]?.name || null,
        link: item.link,
        image: item.pagemap?.cse_image?.[0]?.src || null,
      }))
      .filter(item => item.product);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    res.render('result', { results, images, shoppingResults, countryCode, elapsedTime });
  } catch (error) {
    console.error('API çağrısı sırasında hata oluştu:', error.message);
    res.send('Bir hata oluştu.');
  }
});

app.get('/api/search', apiKeyMiddleware, async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Arama sorgusu eksik!" });

  try {
    const searchResponse = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: googleApiKey, cx: googleCx, q: query },
    });

    const results = searchResponse.data.items.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      rating: Math.floor(Math.random() * 10) + 1,
    }));

    const images = searchResponse.data.items
      .filter(item => item.pagemap?.cse_image)
      .map(item => ({
        link: item.link,
        image: item.pagemap.cse_image[0].src,
      }));

    const shoppingResults = searchResponse.data.items
      .map(item => ({
        product: item.pagemap?.product?.[0]?.name || null,
        link: item.link,
        image: item.pagemap?.cse_image?.[0]?.src || null,
      }))
      .filter(item => item.product);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    res.json({ results, images, shoppingResults, elapsedTime });
  } catch (error) {
    console.error('API çağrısı sırasında hata oluştu:', error.message);
    res.status(500).json({ error: "Bir hata oluştu." });
  }
});

app.get('/', async (req, res) => {
  const theme = req.query.theme || "default";
  let countryCode = "N/A";

  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
    const response = await axios.get(`https://ipinfo.io/${ip}?token=${ipinfoToken}`);
    countryCode = response.data.country;
  } catch (error) {
    console.error("Ülke kodu alınırken bir hata oluştu:", error);
  }

  res.render(theme === "green" ? 'index' : `theme/${theme}`, { countryCode, theme });
});

app.get('/bagis', (req, res) => {
  res.redirect('https://buymeacoffee.com/yigitkabak');
});

app.get('/gizlilik-politikasi', (req, res) => {
  res.render('gizlilik-politikasi');
});

app.get('/hizmet-sartlari', (req, res) => {
  res.render('hizmet-sartlari');
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});