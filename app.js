const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

const googleApiKey = 'AIzaSyDJsSgqZNQtWE1HH-RIRFZWIETuskgVVXo';
const googleCx = '14186417efcac49f0';
const ipinfoToken = 'c621d5706831cd';

// Geçerli API anahtarları listesi
const validApiKeys = ["synapicsearch"];

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));

// API Key doğrulama middleware
function apiKeyMiddleware(req, res, next) {
  const apiKey = req.query.apikey; // API key'yi sorgu parametresinden al
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    return res.status(403).json({ error: "Geçersiz veya eksik API anahtarı" });
  }
  next(); // API key geçerli, devam et
}

const kodlar = require('./views/json/ApiKeys.json');

// Middleware to check API key
const checkApiKey = (req, res, next) => {
  const apiKey = req.query.apikey; // Get API key from query parameter
  if (!apiKey || !kodlar.includes(apiKey)) {
    return res.status(401).json({ error: 'API Key girmelisiniz.' });
  }
  next();
};


app.get('/dino', function(req, res) {
  res.render('dino');
});

app.get('/api', function(req, res) {
  res.render('api');
});

app.get('/api/dolar', checkApiKey, async (req, res) => {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    const dolar = response.data.rates.TRY;
    const zaman = response.data.time_last_updated;
    const duzen = {
      dolar: dolar,
      zaman: zaman
    };
    res.json(duzen); // Send JSON response with exchange rate and last update time
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.get('/api/euro', async (req, res) => {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/EUR');
    const euro = response.data.rates.TRY;
    const zaman = response.data.time_last_updated;
    const duzen = {
      euro: euro,
      zaman: zaman
    };
    res.json(duzen); // Send JSON response with exchange rate and last update time
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.get('/shop', async (req, res) => {
  res.render('shop');
});
// Sistem için kullanılan arama rotası (kullanıcılar için)
app.get('/search', async (req, res) => {
  const startTime = Date.now(); // Zaman ölçümünü başlat
  const query = req.query.query;
  if (!query) return res.send('Arama sorgusu eksik!');

  // Ülke kodunu almak için
  let countryCode = 'N/A';
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || '8.8.8.8';
    const response = await axios.get(`https://ipinfo.io/${ip}?token=${ipinfoToken}`);
    countryCode = response.data.country || 'N/A';
  } catch (error) {
    console.error('Ülke kodu alınırken bir hata oluştu:', error.message);
  }

  try {
    // Google Custom Search API ile arama
    const searchResponse = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: googleApiKey, cx: googleCx, q: query },
    });

    // Sonuçları işle
    const results = (searchResponse.data.items || []).map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      rating: Math.floor(Math.random() * 10) + 1, // Rastgele bir puan
    }));

    // Görseller
    const images = (searchResponse.data.items || [])
      .filter(item => item.pagemap?.cse_image)
      .map(item => ({
        link: item.link,
        image: item.pagemap.cse_image[0].src,
      }));

    // Alışveriş Sonuçları
    const shoppingResults = (searchResponse.data.items || [])
      .map(item => ({
        product: item.pagemap?.product?.[0]?.name || null,
        link: item.link,
        image: item.pagemap?.cse_image?.[0]?.src || null,
      }))
      .filter(item => item.product); // Ürünü olmayanları filtrele

    const endTime = Date.now(); // Zaman ölçümünü bitir
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(2); // Süreyi saniye cinsine çevir

    // Sonuçları render et
    res.render('result', { results, images, shoppingResults, countryCode, elapsedTime });
  } catch (error) {
    console.error('API çağrısı sırasında hata oluştu:', error.message);
    res.send('Bir hata oluştu.');
  }
});
// API Key doğrulaması ile çalışan kullanıcı arama rotası
app.get('/api/search', apiKeyMiddleware, async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Arama sorgusu eksik!" });

  try {

    const endTime = Date.now(); // Zaman ölçümünü bitir
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(2); // Süreyi saniye cinsine çevir
    
    const searchResponse = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: googleApiKey, cx: googleCx, q: query }
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
        image: item.pagemap?.cse_image?.[0]?.src || null
      }))
      .filter(item => item.product);

    res.json({ results, images, shoppingResults, elapsedTime });
  } catch (error) {
    console.error("API çağrısı sırasında hata oluştu:", error);
    res.status(500).json({ error: "Bir hata oluştu." });
  }
});

// Ana sayfa rotası
app.get('/', async (req, res) => {
  const theme = req.query.theme || "default"; // Varsayılan tema "default"

  let countryCode = "N/A";

  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
    const response = await axios.get(`https://ipinfo.io/${ip}?token=${ipinfoToken}`);
    countryCode = response.data.country;
  } catch (error) {
    console.error("Ülke kodu alınırken bir hata oluştu:", error);
  }

  // Temaya göre parametre ile dosyaları render et
  if (theme === "green") {
    res.render('index', { countryCode, theme: "green" });
  } else if (theme === "red") {
    res.render('theme/red', { countryCode, theme: "red" });
  } else if (theme === "blue") {
    res.render('theme/blue', { countryCode, theme: "blue" });
  } else {
    res.render('index', { countryCode, theme: "default" });
  }
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