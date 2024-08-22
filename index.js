const express = require('express');
const connectDB = require('./config/db');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

// Connect to Database
connectDB();

// Initialize Middleware
app.use(express.json({ extended: false }));
app.use(cors());  // Allow CORS if you need cross-origin requests

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/location', require('./routes/location'));
app.use('/api/attendance', require('./routes/attendance'));

// Set the Port
const PORT = process.env.PORT || 5000;

// Start the Server
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
