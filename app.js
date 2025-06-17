const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const path = require('path');
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;
const routes = require('./routes/routeWrapper');

const connectDB = require('./config/db/mongoDB');

// Connect to MongoDB
connectDB();

app.use(cookieParser());

// Middleware for parsing JSON and URL-encoded form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  res.send('Hello, Welcome to my Node.js app running on VPS!');
});

app.use("/", routes.authRoute);

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
});