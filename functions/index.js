const debug = require("debug")("nat-firebase");
let {
  constructReplyMessage,
  publishMqtt,
  textMapping
} = require("./utils");

//let console = { log: debug };
let counter = 0;
let f = require("firebase-functions");
let firestoreCache = {};

const line = require("@line/bot-sdk");
const admin = require("firebase-admin");

const { get, post } = require("./utils");
const { flex1 } = require("./flex.messages");
const moment = require("moment-timezone");
const request = require("request-promise");

const insertRows = require("./db/cmmc-bq-no-partition");

process.env.LOG_LEVEL = "error";

let db = initializeApp();
const configs = f.config();
//asia-northeast1
const functions = ((f) => f.region("asia-east2").runWith({
  timeoutSeconds: 4, memory: "256MB"
}))(f);

//const { Logging } = require("@google-cloud/logging");
//// ...
//// Instantiate the StackDriver Logging SDK. The project ID will
//// be automatically inferred from the Cloud Functions environment.
//const logging = new Logging();
//const log = logging.log("my-custom-log-name");

function initializeApp() {
  //process.env.GCLOUD_PROJECT = "firestorebeta1test2";
  // [START initialize_app]
  console.log("initializeApp has been called.");

  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });

  const db = admin.firestore();
  // [START_EXCLUDE]
  const settings = { timestampsInSnapshots: true };
  db.settings(settings);
  // [END_EXCLUDE]

  // [END initialize_app]
  return db;
}

//const httpEndpoint = configs.iot.http.endpoint;
//let topic = `CMMC/PLUG-002/$/command`;

const postToDialogflow = (req, body) => {
  req.headers.host = "bots.dialogflow.com";
  return request.post({
    uri: `${configs.nat.dialogflow}`,
    headers: req.headers,
    body: JSON.stringify(body)
  });
};

exports.line_nat_chatbot_webhook = functions.https.onRequest(
  (req, res) => {
    if (req.method === "POST") {
      const body = Object.assign(req.body);
      res.status(200).send("post ok");
    } else if (req.method === "GET") {
      res.status(200).send("line_nat_chatbot_webhook GET OK " +
        JSON.stringify(req));
    } else {
      res.status(500).send("Forbidden!");
    }
  });
exports.nat_chatbot = functions.https.onRequest(
  require("./fn/rocket"));
exports.pps_rocket_bot = functions.https.onRequest(
  require("./fn/rocket"));
exports.pps_pants_bot = functions.https.onRequest(
  require("./fn/pants"));
exports.pps_arrow_bot = functions.https.onRequest(
  require("./fn/arrow"));
exports.pps_countdown_bot = functions.https.onRequest(
  require("./fn/countdown"));
exports.pps_stretch_bot = functions.https.onRequest(
  require("./fn/stretch"));
exports.wave_function = functions.https.onRequest(
  require("./fn/wave_funtion"));

exports.nat_insert_bq = functions.https.onRequest(
  (req, res) => {
    const responseJson = {
      recv_date: moment().format("YYYY-MM-DD HH:mm:ss"),
      recv_body_len: req.body.length
    };

    console.log("xxxxxxxx ");

    if (req.method === "POST") {
      if (Array.isArray(req.body)) {
        console.log("req is array");
        console.log("body = ", JSON.stringify(req.body));
        insertRows(req.body, (err, data) => {
          console.log("error = ", err, "data=", data);
        });
      } else {
        console.log("..... data is an object.");
        const body = Object.assign({}, req.body);
        console.log("body = ", JSON.stringify(body));
        insertRows([req.body], (err, data) => {
          console.log("error = ", err, "data=", data);
        });
      }
      res.status(200).send(JSON.stringify(responseJson));
    } else if (req.method === "GET") {
      let data = db.collection("").doc("1").get() // collection ของ DB ที่มี Document ที่ชื่อว่า 1
        .then(c => {
          console.log(c);
        });
    } else if (req.method === "PUT") {
      res.status(403).send("Forbidden!");
    } else {
      res.status(403).send("Forbidden!");
    }

  });

exports.myFunctionName = f.firestore
  .document("users/nat").onWrite((change, context) => {
    // ... Your code here
    consle.log("users/nat onWrite!");
  });

function handleImageEvent(event, client) {
  var message = event.message;
  var chunks = [];
  client.getMessageContent(message.id)
    .then((stream) => {
      stream.on("data", (chunk) => {
        chunks.push(chunk);
        // console.log(chunks);
      });

      stream.on("end", () => {
        var body = Buffer.concat(chunks);

        var msg = {
          type: "text",
          text: "อ่านรูปแล้วนะ กำลังส่งไปปริ้นแหล่ะ"
        };
        var string_data = body.toString("base64");
        console.log(string_data);
        //currentImage = body;
        //var messageSend = [];
        //messageSend.push(msg);
        //request.post(printUrl, { form: { image_64: string_data } },
        //  function(err, httpResponse, body) {
        //    var readingMessage = {
        //      type: "text",
        //      text: "ปริ้นรูปแล้วน้าา"
        //    };
        //
        //    var errorMessage = {
        //      type: "text",
        //      text: "เหมือนจะปริ้นไม่ไ้ดนะ"
        //    };
        //
        //    if (!err) {
        //      messageSend.push(readingMessage);
        //      return client.replyMessage(event.replyToken, messageSend);
        //    } else {
        //      messageSend.push(errorMessage);
        //      return client.replyMessage(event.replyToken, messageSend);
        //    }
        //
        //  });

      });

      stream.on("error", (err) => {
        // error handling
      });
    });
}

exports.line_cmmc_chatbot_webhook = functions.https.onRequest((
  req, res) => {
  const config = {
    channelAccessToken: configs.nat.line.bot1["channel-access-token"],
    channelSecret: configs.nat.line.bot1["channel-secret-token"]
  };

  console.log("line_cmmc_chatbot_webhook", config);

  const client = new line.Client(config);
  if (req.method === "POST") {
    const body = Object.assign(req.body);
    body.events.map(event => {
      console.log(event);
      if (event.type === "message" && event.message.type === "text") {
        console.log("-----------------------------------------");
        console.log(`source type = ${event.source.type}`);
        console.log(`message text = ${event.message.text}`);
        console.log(`replyToken = ${event.replyToken}`);
        console.log(JSON.stringify(event));
        const body = Object.assign({}, req.body);
        postToDialogflow(req, body);
      } else {
        handleImageEvent(event, client);
        console.log(event.message.type);
        console.log(JSON.stringify(event));
        res.status(200).send("GET OK " + JSON.stringify(event));
        //let data = constructReplyMessage(event.message.text);
        //data.text = JSON.stringify(req.body);
        //try {
        //  console.log(data);
        //  client.replyMessage(event.replyToken, data).then(res => {
        //    console.log(`[] reply result = `, res);
        //  });
        //} catch (e) {
        //  console.log("error", e);
        //}
        //
        //if (event.type == "image") {
        //  console.log(">> [1] image <<");
        //  console.log(">> [2] image <<");
        //  console.log(">> [3] image <<");
        //  console.log(">> [4] image <<");
        //  console.log(">> [5] image <<");
        //  handleImage(event.message, event.replyToken);
        //  res.status(200).send("post ok");
        //} else {
        //  res.status(200).send("post ok");
        //}
        //
        //// calling mqtt bridge
        ////get(`${httpEndpoint}?topic=${topic}&command=${event.message.text}`);
        //console.log("/-----------------------------------------");
      }
    });
  } else if (req.method === "GET") {
    res.status(200).send("GET OK " + JSON.stringify(req));
  } else {

  }
});

function downloadContent(messageId, downloadPath) {
  return client.getMessageContent(messageId)
    .then((stream) => new Promise((resolve, reject) => {
      const writable = fs.createWriteStream(downloadPath);
      stream.pipe(writable);
      stream.on("end", () => resolve(downloadPath));
      stream.on("error", reject);
    }));
}

//const cookieParser = require("cookie-parser")();
//const bodyParser = require("body-parser");
function handleImage(message, replyToken) {
  let getContent;
  if (message.contentProvider.type === "line") {
    const downloadPath = path.join(__dirname,
      "downloaded",
      `${message.id}.jpg`);
    const previewPath = path.join(__dirname,
      "downloaded",
      `${message.id}-preview.jpg`);

    getContent = downloadContent(message.id, downloadPath)
      .then((downloadPath) => {
        // ImageMagick is needed here to run 'convert'
        // Please consider about security and performance by yourself
        cp.execSync(`convert -resize 240x jpeg:${downloadPath} jpeg:${previewPath}`);

        return {
          originalContentUrl: baseURL + "/downloaded/" +
            path.basename(downloadPath),
          previewImageUrl: baseURL + "/downloaded/" +
            path.basename(previewPath)
        };
      });
  } else if (message.contentProvider.type === "external") {
    getContent = Promise.resolve(message.contentProvider);
  }

  return getContent
    .then(({ originalContentUrl, previewImageUrl }) => {
      return client.replyMessage(
        replyToken,
        {
          type: "image",
          originalContentUrl,
          previewImageUrl
        }
      );
    });
}

const express = require("express");
const cors = require("cors")({ origin: true });
const app = express();
const router = express.Router();

app.use(cors);
app.use("/", router);

//app.use(cookieParser);
//app.use(validateFirebaseIdToken);
//app.use(cookieParser);
//app.use(validateFirebaseIdToken);

router.get("/hello", (req, res) => {
  res.status(200).send(`Hello /hello`);
});

router.get("/xyz", (req, res) => {
  console.log("xyz");
  //const formattedDate = moment().format(format);
  //console.log('Sending Formatted date:', formattedDate);
  res.status(200).send(`/xyz`);
});

router.post("/firestore", (req, res) => {
  console.log(`req.query=`, req.query);
  let ret = Object.assign({}, req.query);
  if (!req.query.collection) {
    console.log(`no collection, no doc.`);
    ret.status = 500;
    res.status(ret.status).send(JSON.stringify(ret));
    return;
  }

  let output = {};
  var docRef = db
    .doc(req.query.collection);

  let req2 = Object.assign({}, req);
  docRef
    .get()
    .then((doc) => {
      if (doc.exists) {
        let data = Object.assign({}, doc.data());
        console.log("Document data:", doc.data(), `id=${doc.id}`);
        firestoreCache[doc.id] = Object.assign({}, data);
        firestoreCache[doc.id].token = "hidden";

        req2.headers = {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Bearer ${data.token}`
        };
        console.log(`being posted.`);

        let message;
        if (isNaN(parseInt(req2.query.message))) {
          message = req2.query.message;
        } else {
          message = data.messages[req2.query.message];
        }

        post(
          "https://notify-api.line.me/api/notify",
          `message=${message}`,
          req2).then(() => {
          counter += 2;
          ret = {
            ...ret, counter,
            status: 200,
            firestoreCache
          };
          res.status(ret.status).send(JSON.stringify(ret));
        });
        console.log(`posted.`);
      } else {
        console.log("No such document!");
      }
    }).catch((error) => {
    console.log("Error getting document:", error);
  });

});

app.get("/", (req, res) => {
  res.send("This is GET.");
  console.log("widget/ has been called.");
  db.collection("users").get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        console.log(doc.id, "=>", doc.data());
      });
    })
    .catch((err) => {
      console.log("Error getting documents", err);
    });

  res.end();
});

//exports.cronSyntax = functions.pubsub
//  .schedule("* * * * *")
//  .timeZone("Asia/Bangkok")
//  .onRun(context => {
//    console.log("triggered every 1 minutes ", context, counter);
//    counter++;
//    return 3;
//  });

//exports.scheduledFunction = functions.pubsub
//  .schedule("every midnight")
//  .timeZone("Asia/Bangkok")
//  .onRun((context) => {
//    console.log("This will be run every midnight", context);
//    return null;
//  });

const widget = functions.https.onRequest(app);

module.exports = {
  ...module.exports,
  widget
};
