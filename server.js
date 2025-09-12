require('dotenv').config();
require('./db/db');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');



const app = express();
const http = require('http').createServer(app);



const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: 'GET,POST,PUT,PATCH,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  exposedHeaders: 'Content-Length,X-Kuma-Revision',
  credentials: true,
  maxAge: 600
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.get('/', (req, res) => {
  res.send('api working!');
});

 app.use('/api/auth', require('./routes/authRoutes'));
 app.use('/api', require('./routes/addressRoutes'));




http.listen(port, () => {
  console.log(`Server running on ${process.env.PORT||3000}...`);
});

