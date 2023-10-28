const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
     cors({
          origin: ["http://localhost:5173"],
          credentials: true,
     })
);
app.use(express.json());
app.use(cookieParser());

// console.log(process.env.DB_USER);
// console.log(process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pz6rkt0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
     serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
     },
});

// my middleware
const logger = async (req, res, next) => {
     console.log("middlewares", req.host, req.originalUrl);
     next();
};

const verifyToken = async (req, res, next) => {
     const token = req.cookies?.token;
     console.log("verified token", token);
     if (!token) {
          return res.status(401).send({ message: "unauthorized" });
     }
     jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
          if (err) {
               return res.status(401).send({ message: "unauthorized" });
          }
          // console.log("value in the token", decoded);
          req.user = decoded;
          next();
     });
};

async function run() {
     try {
          // Connect the client to the server (optional starting in v4.7)
          await client.connect();

          const serviceCollection = client
               .db("carProject")
               .collection("services");
          const serviceBookingCollection = client
               .db("carProject")
               .collection("bookings");

          // auth related api
          app.post("/jwt", logger, async (req, res) => {
               const user = req.body;
               console.log(user);
               const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
                    expiresIn: "1h",
               });
               res.cookie("token", token, {
                    httpOnly: true,
                    secure: false,
                    // sameSite:'none'
               }).send({ success: true });
          });

          // service related api
          app.get("/services", logger, async (req, res) => {
               const curser = await serviceCollection.find().toArray();
               res.send(curser);
          });

          app.get("/services/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               const options = {
                    // Sort matched documents in descending order by rating
                    // sort: { "imdb.rating": -1 },
                    // Include only the `title` and `imdb` fields in the returned document
                    projection: { title: 1, price: 1, img: 1, service_id: 1 },
               };
               result = await serviceCollection.findOne(query, options);
               res.send(result);
          });
          // app.post("/bookings", logger, async (req, res) => {
          //      const booking = req.body;
          //      console.log(booking);
          //      // console.log("email1", req.body.email);
          //      // console.log("query1", req.query?.email);
          //      const result = await serviceBookingCollection.insertOne(booking);
          //      res.send(result);
          // });
          app.post('/services',async(req,res) => {
               const services = req.body;
               console.log(services)
          })

          // bookings

          app.get("/bookings", verifyToken, async (req, res) => {
               console.log("email", req.query?.email);
               console.log("user from valid token", req.user);
               // console.log("token", req.cookies?.token);
               if(req.query?.email!==req.user.email){
                    return res.status(403).send({message: 'forbidden access'});
               }
               let query = {};
               if (req.query?.email) {
                    query = { email: req.query.email };
               }
               const result = await serviceBookingCollection.find(query).toArray();
               res.send(result);
          });

          // app.get("/bookings", logger, verifyToken, async (req, res) => {
          //      // console.log("query", req.body);
          //      console.log("user from valid token:", req.user);
          //      console.log("my query::", req.query?.email);
          //      let query = {};
          //      if (req.query?.email) {
          //           query = { email: req.query.email };
          //      }
          //      const result = await serviceBookingCollection.find(query).toArray();

          //      // console.log("email", req.body.email);
          //      // console.log("my cookie", req.cookies.token);
          //      // console.log(result);
          //      res.send(result);
          // });

          app.post("/bookings", logger, async (req, res) => {
               const booking = req.body;
               console.log(booking);
               // console.log("email1", req.body.email);
               // console.log("query1", req.query?.email);
               const result = await serviceBookingCollection.insertOne(booking);
               res.send(result);
          });

          app.patch("/bookings/:id", async (req, res) => {
               const updateService = req.body;
               const id = req.params.id;
               const filter = { _id: new ObjectId(id) };
               const updateDoc = {
                    $set: {
                         status: updateService.status,
                    },
               };
               console.log(updateService);
               const result = await serviceBookingCollection.updateOne(
                    filter,
                    updateDoc
               );
               res.send(result);
          });

          app.delete("/bookings/:id", async (req, res) => {
               const id = req.params.id;
               const query = { _id: new ObjectId(id) };
               const result = await serviceBookingCollection.deleteOne(query);
               res.send(result);
          });

          // Send a ping to confirm a successful connection
          await client.db("admin").command({ ping: 1 });
          console.log(
               "Pinged your deployment. You successfully connected to MongoDB!"
          );
     } finally {
          // Ensures that the client will close when you finish/error
          //     await client.close();
     }
}
run().catch(console.dir);

app.get("/", (req, res) => {
     res.send("server is running");
});

app.listen(port, () => {
     console.log(`server is standing on ${port}`);
});
