const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors'); // add this at the top
const bodyParser = require('body-parser');
const urlService = require('./config/utils/asyncurl.min');
const port = process.env.PORT || 3000;
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
  res.send('Hello, Welcome to my Node.js app running on VPS!');
});

app.get('/api/proxy-sports', async (req, res) => {
  try {
    const { type, sportId } = req.query;
    let url = '';

    switch (type) {
      case 'sport-list':
        url = 'https://apidiamond.online/sports/api/v2/api/sport-list';
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

    const response = await axios.get(url);
    res.status(200).json(response.data);

  } catch (err) {
    console.error('Error fetching data:', err.message);
    res.status(500).json({ message: 'Proxy fetch failed', error: err.message });
  }
});

app.use("/", routes.authRoute);
app.use("/api/dashboard", routes.dashboardRoute);
app.use("/api", routes.workerRoute);
app.use("/api/partner", routes.partnerRoute);
app.use("/api/score", routes.scoreApiRoute);
app.use("/api/sport", routes.sportRoute);
app.use("/api/matches", routes.matchRoute);
app.use("/api/market", routes.marketRoute);
app.use("/api/website", routes.websiteRoute);

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