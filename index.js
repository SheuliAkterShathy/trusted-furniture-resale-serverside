const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
 const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_TEST_KEY);
const port = process.env.PORT || 5000;
const app = express();



// middleware
const corsConfig = {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
    app.use(cors(corsConfig))

// app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7czv3fq.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}
async function run(){
    try{
        const categoriesCollection = client.db('trustedFurniture').collection('categories');
        const productsCollection = client.db('trustedFurniture').collection('products');
        const usersCollection = client.db('trustedFurniture').collection('users');
        const bookingsCollection = client.db('trustedFurniture').collection('bookings');
        const wishlistsCollection = client.db('trustedFurniture').collection('wishlists');
         const paymentsCollection = client.db('trustedFurniture').collection('payments');

        //  verifyadmin
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.get('/categories', async (req, res) => {
            const query = {}
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        })

        // jwt
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });
        // users
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });


        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' });
        })
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'buyer' });
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })

        //  bookings
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        app.get('/bookings',verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingsCollection.findOne(query);
            res.send(booking);
        })

        // wishlist
        app.post('/wishlist', async (req, res) => {
            const wishlist = req.body;
            const result = await wishlistsCollection.insertOne(wishlist);
            console.log(wishlist)
            res.send(result);
        });

        app.get('/wishlists', verifyJWT,  async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email:email };
            const wishlists = await wishlistsCollection.find(query).toArray();
            console.log(wishlists)
            res.send(wishlists);
        });


        app.put("/users", verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
              return res.status(403).send({ message: "forbidden access" });
            }
            const id = req.query.userid;
            console.log(id);
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
              $set: {
                verified: true,
              },
            };
      
            const result = await usersCollection.updateOne(
              filter,
              updateDoc,
              options
            );
            res.send(result);
          });

        app.get('/user', async (req,res)=>{
            const email = req.query.email
            const query = {email:email}
            const result = await usersCollection.findOne(query)
            res.send(result)
        })

       
       

        // advertise
        app.put('/advertise/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const product = await productsCollection.findOne(filter);
            const advertise = product.isAdvertised;
            if(advertise){
                return res.send({acknowledged: false, message: " You already added"})
            }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    isAdvertised: true
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

       app.get('/advertise', async (req, res) => {
            const result = await productsCollection.find({ isAdvertised: true }).toArray();
          
            res.send(result);
        })

        //  payment
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = parseInt(booking.price);
            const amount = price * 100;
            console.log(amount)

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) =>{
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = {_id: ObjectId(id)}
            const updatedDoc = {
                $set: {
                   
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })
       
       
   
        // my products
        app.get('/myProducts', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email: email };
            const bookings = await productsCollection.find(query).toArray();
            res.send(bookings);
        });

        app.delete('/myProducts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result);
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

       

        app.get('/allSellers',verifyJWT,verifyAdmin,  async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = {role:'seller'}
            const seller = await usersCollection.find(query).toArray();
            res.send(seller);
        });






        app.delete('/allSellers/:id',async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        });

        // allBuyers
        app.get('/allBuyers', verifyJWT,verifyAdmin, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = {role:'buyer'}
            const seller = await usersCollection.find(query).toArray();
            res.send(seller);
        });

        app.delete('/allBuyers/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
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
