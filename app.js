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
  const apiKey = req.query.api_key; // API key'yi sorgu parametresinden al
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    return res.status(403).json({ error: "Geçersiz veya eksik API anahtarı" });
  }
  next(); // API key geçerli, devam et
}

app.get('/shop', async (req, res) => {
  res.render('shop');
});
// Sistem için kullanılan arama rotası (kullanıcılar için)
app.get('/search', async (req, res) => {
  const query = req.query.query;
  if (!query) return res.send('Arama sorgusu eksik!');

  let countryCode = "N/A";
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
    const response = await axios.get(`https://ipinfo.io/${ip}?token=${ipinfoToken}`);
    countryCode = response.data.country;
  } catch (error) {
    console.error("Ülke kodu alınırken bir hata oluştu:", error);
  }

  try {
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

    res.render('result', { results, images, shoppingResults, countryCode });
  } catch (error) {
    console.error("API çağrısı sırasında hata oluştu:", error);
    res.send('Bir hata oluştu.');
  }
});

// API Key doğrulaması ile çalışan kullanıcı arama rotası
app.get('/api/search', apiKeyMiddleware, async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Arama sorgusu eksik!" });

  try {
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

    res.json({ results, images, shoppingResults });
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