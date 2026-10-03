require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/public', express.static(`${process.cwd()}/public`));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// URL Schema
const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: Number,
    required: true,
    unique: true
  }
});

const Url = mongoose.model('Url', urlSchema);

// Home page
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// API hello
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Create short URL
app.post('/api/shorturl', async function(req, res) {
  const originalUrl = req.body.url;

  // Check that URL exists
  if (!originalUrl) {
    return res.json({ error: 'invalid url' });
  }

  let url;

  try {
    url = new URL(originalUrl);
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  // Only allow http and https
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return res.json({ error: 'invalid url' });
  }

  // Verify that the hostname exists
  const dns = require('dns');

  dns.lookup(url.hostname, async function(err) {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    try {
      const existingUrl = await Url.findOne({
        original_url: originalUrl
      });

      if (existingUrl) {
        return res.json({
          original_url: existingUrl.original_url,
          short_url: existingUrl.short_url
        });
      }

      const lastUrl = await Url.findOne().sort({ short_url: -1 });

      const newShortUrl = lastUrl ? lastUrl.short_url + 1 : 1;

      const newUrl = new Url({
        original_url: originalUrl,
        short_url: newShortUrl
      });

      const savedUrl = await newUrl.save();

      res.json({
        original_url: savedUrl.original_url,
        short_url: savedUrl.short_url
      });
    } catch (err) {
      res.status(500).json({ error: 'server error' });
    }
  });
});

// Redirect short URL
app.get('/api/shorturl/:short_url', async function(req, res) {
  try {
    const shortUrl = parseInt(req.params.short_url);

    const url = await Url.findOne({
      short_url: shortUrl
    });

    if (!url) {
      return res.json({ error: 'No short URL found' });
    }

    res.redirect(url.original_url);
  } catch (err) {
    res.json({ error: 'No short URL found' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});