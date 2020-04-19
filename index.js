const express = require("express");
const app = express();
const tmi = require("tmi.js");
const port = process.env.PORT || 3000;
const bodyParser = require("body-parser");
const moment = require("moment");
const cors = require("cors");

require("dotenv").config();

//MONGODB
const MongoClient = require("mongodb").MongoClient;
const uri = `mongodb+srv://${process.env.MONGODB_NICKNAME}:${process.env.MONGODB_PASSWORD}@mongodatabase-tt40v.mongodb.net/test?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect(async () => {
  const collection = await client.db("test").collection("messages");
  console.log("connected to database!");

  const opts = {
    identity: {
      username: process.env.TWITCH_NICKNAME,
      password: process.env.TWITCH_AUTH,
    },
    channels: ["summarek"],
  };

  const twitchClient = new tmi.client(opts);

  twitchClient.on("message", onMessageHandler);
  twitchClient.on("connected", onConnectedHandler);

  twitchClient.connect();

  async function onMessageHandler(target, user, msg) {
    const commandName = msg.trim();
    let author = user["display-name"];
    let messageChannel = target.slice(1);
    await collection.insertOne({
      twitchChannel: messageChannel,
      twitchAuthor: author,
      twitchMessage: commandName,
      time: moment().format("L") + " " + moment().format("LT"),
    });
  }

  function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
  }
  app.use(cors());
  app.use(
    bodyParser.urlencoded({
      extended: true,
    })
  );

  app.get("/:channel/:nickname", async (req, res) => {
    await collection
      .find({
        twitchChannel: req.params.channel,
        twitchAuthor: req.params.nickname,
      })
      .toArray(function (error, documents) {
        if (error) throw error;

        res.send(documents);
      });
  });

  app.listen(port, () => console.log(`Example app listening on port ${port}!`));
});
