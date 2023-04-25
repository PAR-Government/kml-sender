import * as dotenv from 'dotenv'
import fs, { access } from 'fs';
import path from 'path';
import request from 'request';
import WebSocket from 'ws';
import { parseString } from 'xml2js';
import * as uuid from 'uuid';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';


dotenv.config()
let accessKey = process.env.ACCESSKEY;
let secret = process.env.SECRETKEY;
let accessScope = process.env.SCOPE;
let streamingURL = process.env.STREAMING;
let authURL = process.env.AUTH;
const KML_DIRECTORY = 'kml-files';

async function parseAndSendKmlData(socket) {

  try {
    if (isMainThread) {
      const files = await fs.promises.readdir(KML_DIRECTORY);

      const threadCount = files.length;
      const threads = new Set();

      for (const file of files) {
        const filePath = path.join(KML_DIRECTORY, file);
        if (!filePath.endsWith(".kml")) {
          console.log(`Skipping ${filePath}`)
          continue;
        }
        const kmlString = await fs.promises.readFile(filePath, 'utf8');
  
        let result;
        try {
          result = await new Promise((resolve, reject) => {
            parseString(kmlString, (err, result) => {
              if (err) {
                reject(err);
              }
              else { 
                resolve(result);
              }
            });
          });
        } catch (err) {
          console.error(err);
          continue;
        }
  
        if (!result.kml.Document[0]?.Placemark) {
          continue;
        }
  
        // Persist the UID to provide the appearance of a moving object
        const uid = uuid.v4();
        console.log(uid);
        const callsign = path.parse(file).name;
        const timeOut = (Math.random() * 100) + 1500;
        console.log(timeOut);

        const worker = new Worker("./worker.js", { workerData: { uid, callsign, result, timeOut }})
        worker.on('error', (err) => { throw err; });
        worker.on('exit', () => {
          threads.delete(worker);
          console.log(`Thread exiting, ${threads.size} running...`);
        })
        worker.on('message', (msg) => {
          if (socket) {
            socket.send(msg);
          }          
        });
        
        threads.add(worker);
      }
    } 
    
  } catch (err) {
    console.error(err);
  }
}




async function connectToSitX(callback) {
  let accessToken = null;
  let url = authURL;
  let scope = accessScope;
  let form = {
    grant_type: "client_credentials",
    client_id: accessKey,
    client_secret: secret,
    scope: scope
  };
  let options = {
    url: url,
    form: form,
    json: true
  };
  await request.post(options,
    function (err, response, body) {
      if (err) {
        callback(err, null);
      } else {
        accessToken = body['access_token'];
        callback(null, accessToken);
      };
    }
  );
}

async function go() {
  var token = "";
  var socket = null;

  if (isMainThread) {
    await connectToSitX(async (err, accessToken) => {
      if (!err) {
        token = accessToken;
        let url = streamingURL;
        let authHeader = `Bearer ${token}`;
        socket = new WebSocket(url, [], { 'headers': { 'Authorization': authHeader } });
        socket.on('open', () => {
          parseAndSendKmlData(socket);
        })
      }
    });
  }
}

go();