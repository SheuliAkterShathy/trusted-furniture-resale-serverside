const express = require('express');
const cors = require('cors');

// const jwt = require('jsonwebtoken');
require('dotenv').config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());


app.get('/', async (req, res) => {
    res.send('Trusted Furniture server is running');
})

app.listen(port, () => console.log(`Trusted Furniture running on ${port}`))
