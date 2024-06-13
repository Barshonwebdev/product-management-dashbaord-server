// server node packages

const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
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

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);
