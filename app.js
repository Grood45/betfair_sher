const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors'); // add this at the top
const bodyParser = require('body-parser');
const urlService = require('./config/utils/asyncurl.min');
const port = process.env.PORT || 3007;
const routes = require('./routes/routeWrapper');
const fs = require('fs');
app.set('trust proxy', true);
const axios = require('axios');

const connectDB = require('./config/db/mongoDB');

// Connect to MongoDB
connectDB();



const uploadDir = path.join(__dirname, './', 'uploads', 'icons');
console.log(uploadDir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use(cookieParser());
app.use('/uploads/icons', express.static('uploads/icons'));

// Middleware for parsing JSON and URL-encoded form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  'https://sportmaindashboard.netlify.app',
  'https://sportuserwebsite.netlify.app',
  'https://sportbackoffice.netlify.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.get('/', (req, res) => {
  res.send('Hello, Welcome to Betfair & SportRadar app running');
});

app.post('/api/proxy-sports', async (req, res) => {
  try {
    const { type, sportId,eventId,marketId } = req.body; // use body for POST
    let url = '';
    let method = 'get';
    let payload = null;

    switch (type) {
      case 'sport-list':
        url = 'https://apidiamond.online/sports/api/v2/api/sport-list';
        method = 'post';
        payload = {}; // send empty body or required body if needed
        break;

          case 'exchange':
            url = 'https://apidiamond.online/sports/api/market-list';
            method = 'post';
            payload = {eventId:eventId}; // send empty body or required body if needed
            break;

            case 'fancy':
              if (!eventId) return res.status(400).json({ error: 'eventId is required for fancy' });
              url = `https://apidiamond.online/sports/api/v1/bm_fancy/${eventId}/1`;
              break;

              case 'bookmaker':
                if (!eventId) return res.status(400).json({ error: 'eventId is required for fancy' });
                url = `https://apidiamond.online/sports/api/v1/exchange/v1/player-operations/fancy/event/details/${eventId}`;
                break;

              case 'oddBymarketId':
                if (!marketId) return res.status(400).json({ error: 'marketId is required for odds' });
                url = `https://apidiamond.online/sports/api/v1/macthodds/?ids=${marketId}`;
                break;
      
              case 'premium':
                url = 'https://apidiamond.online/sports/api/v1/feed/betfair-market-in-sr';
                method = 'post';
                payload = {eventId:eventId,sportId:sportId}; // send empty body or required body if needed
                break;

            case 'premiumResult':
              url = 'https://apidiamond.online/sports/api/v2/result-sport-data';
              method = 'post';
              payload = {eventId:eventId}; // send empty body or required body if needed
              break;
  

      case 'listGames':
        if (!sportId) return res.status(400).json({ error: 'sportId is required for listGames' });
        url = `https://apidiamond.online/sports/api/v1/listGames/${sportId}/1`;
        break;

      case 'inplay':
        if (!sportId) return res.status(400).json({ error: 'sportId is required for inplay' });
        url = `https://apidiamond.online/sports/api/final-sport-list/${sportId}/true`;
        break;



      case 'upcoming':
        if (!sportId) return res.status(400).json({ error: 'sportId is required for upcoming' });
        url = `https://apidiamond.online/sports/api/final-sport-list/${sportId}/false`;
        break;

      case 'eventsBySport':
        if (!sportId) return res.status(400).json({ error: 'sportId is required for eventsBySport' });
        url = `https://apidiamond.online/sports/api/final-event-sport-list/${sportId}`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid type parameter' });
    }

    // Call the API using axios
    const response = await axios({
      url,
      method,
      data: payload
    });
    

    res.status(200).json(response.data);

  } catch (err) {
    console.error('Proxy API error:', err.message);
    res.status(500).json({ message: 'Proxy fetch failed', error: err.message });
  }
});

app.use("/", routes.authRoute);
app.use("/api/sync/sport", routes.sportRoute);
app.use("/api/betting/v1", routes.serviceRoute);


// 404 Error handling
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

// Global error handler
app.use((error, req, res, next) => {
  res.status(error.status || 500).json({
    error: { message: error.message },
  });
});


// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  urlService(port);  
});