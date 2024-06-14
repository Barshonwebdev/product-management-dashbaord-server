// server node packages

const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.PAYMENT_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

// jwt token creation function 
function createToken(user){
  const token=jwt.sign(
    {
      email:user.email,
    },
    `${process.env.JWT_SECRET}`,
    {
      expiresIn: "10d"
    }
  );

  return token;
}

// jwt token verify function
function verifyToken(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  const verify = jwt.verify(token, `${process.env.JWT_SECRET}`);
  if (!verify?.email) {
    return res.send("You are not authorized");
  }
  req.user = verify.email;
  console.log(verify);
  next();
}


// routes
app.get("/", (req, res) => {
  res.send("running");
});

app.listen(port, () => {
  console.log(`listening at port: ${port}`);
});

// mongoDB
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}${process.env.DB_CLUSTER_URL}`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {

    const productManagementDb=client.db('product-management-dashboard-db');
    const productsCollection=productManagementDb.collection('all-products');
    const usersCollection=productManagementDb.collection('all-users');
    const paymentCollection=productManagementDb.collection('payments');
   
    // user api 
    app.post('/user',async(req,res)=>{
      const user=req.body;
      const token=createToken(user);
      const isUserExist=await usersCollection.findOne({email:user.email});
      if (isUserExist){
        return res.send({
          message: 'user already exists',
          token
        });
      }
      const result=await usersCollection.insertOne(user);
      res.send({token});
    })

    app.get('/user/:email',async(req,res)=>{
      const email=req.params.email;
      const query={
        email:email
      };
      const matchedUser=await usersCollection.findOne(query);
      res.send(matchedUser);
    })

    // products api 
    app.get('/products',async(req,res)=>{
      const result=await productsCollection.find().toArray();
      res.send(result);
    })
    
    app.get('/products/:email',async(req,res)=>{
      const email=req.params.email;
      const query={
        seller_email:email
      }
      const result=await productsCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/products/edit/:id', async (req, res) => {
      const id=req.params.id;
      const result = await productsCollection.findOne({_id:new ObjectId(id)});
      res.send(result);
    });
    app.post('/productadd', verifyToken, async (req, res) => {
      const productData = req.body;
      const result = await productsCollection.insertOne(productData);
      res.send(result);
    });
    app.patch("/editproduct/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;

      const filter = {
        _id: new ObjectId(id),
      };

      const updateDoc = {
        $set: updatedProduct,
      };

      const result = await productsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.delete('/products/:id',verifyToken,async(req,res)=>{
      const id=req.params.id;
      const result=await productsCollection.deleteOne({_id:new ObjectId(id)});
      res.send(result);
    })

    // buy product 
    app.get('/buyproduct/:id', async (req, res) => {
      const id=req.params.id;
      const result = await productsCollection.findOne({_id:new ObjectId(id)});
      res.send(result);
    });

    // payment api 


    // payment intent api
    app.post('/create-payment-intent', async (req,res)=>{
      const {price}=req.body;
      const amount=price*100;
            console.log(price,amount);

      const paymentIntent= await stripe.paymentIntents.create({
        amount:amount,
        currency: 'usd',
        payment_method_types: ['card'],
      });

      res.send({
        clientSecret:paymentIntent.client_secret
      })
      
    })

    
    app.post('/payment',async (req,res)=>{
      const payment=req.body;
      const insertedResult=await paymentCollection.insertOne(payment);
      const stockUpdateQuery={_id:{$in:payment.product_id.find(id=>new ObjectId(id))}};
      console.log(classSeatUpdateQuery);
      const updatedstock=await productsCollection.updateOne(stockUpdateQuery,{$inc:{stock:-1}});
      
      res.send(insertedResult);
    })
    
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);
