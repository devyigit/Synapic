const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

const googleApiKey = 'AIzaSyCXcO_MuQ0sjzLzlI3DeMaYeMSIPptxHEQ';
const googleCx = '14186417efcac49f0';
const ipinfoToken = 'c621d5706831cd';

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));

app.get('/', async (req, res) => {
  let countryCode = "N/A";

  try {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const response = await axios.get(`https://ipinfo.io/${ip}?token=${ipinfoToken}`);
    countryCode = response.data.country;
  } catch (error) {
    console.error("Ülke kodu alınırken bir hata oluştu:", error);
  }

  res.render('index', { countryCode });
});

app.get('/search', async (req, res) => {
  const query = req.query.query;
  if (!query) return res.send('Arama sorgusu eksik!');

  let countryCode = "N/A";
  try {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
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
      rating: Math.floor(Math.random() * 10) + 1
    }));

    res.render('result', { results, countryCode });
  } catch (error) {
    console.error("API çağrısı sırasında hata oluştu:", error);
    res.send('Bir hata oluştu.');
  }
});

app.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
