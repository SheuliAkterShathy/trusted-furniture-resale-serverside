const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const jwt = require('jsonwebtoken');
require('dotenv').config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7czv3fq.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try{
        const categoriesCollection = client.db('trustedFurniture').collection('categories');
        const productsCollection = client.db('trustedFurniture').collection('products');
        const usersCollection = client.db('trustedFurniture').collection('users');
        const bookingsCollection = client.db('trustedFurniture').collection('bookings');

        app.get('/categories', async (req, res) => {
            const query = {}
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });


        //  bookings
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/bookings',  async (req, res) => {
            const email = req.query.email;
            // const decodedEmail = req.decoded.email;

            // if (email !== decodedEmail) {
            //     return res.status(403).send({ message: 'forbidden access' });
            // }

            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });


        app.post('/products',  async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const category = await categoriesCollection.findOne(query);
            res.send(category);
        })
        
        app.get("/products", async (req, res) => {
            let query= {}
            if(req.query.categoryName)
             query = {
                categoryName:req.query.categoryName
             }
            
            const products = await productsCollection
              .find(query)
              
              .toArray();
            res.send(products);
          });

    }
    finally{

    }
}
run().catch(console.log);

app.get('/', async (req, res) => {
    res.send('Trusted Furniture server is running');
})

app.listen(port, () => console.log(`Trusted Furniture running on ${port}`))
