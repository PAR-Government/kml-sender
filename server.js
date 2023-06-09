import * as dotenv from 'dotenv'
import fs, { access } from 'fs';
import path from 'path';
import request from 'request';
import WebSocket from 'ws';
import { parseString } from 'xml2js';
import builder from 'xmlbuilder';
import { setTimeout } from "timers/promises";

dotenv.config()
let accessKey = process.env.ACCESSKEY;
let secret = process.env.SECRETKEY;
let accessScope = process.env.SCOPE;
let streamingURL = process.env.STREAMING;
const KML_DIRECTORY = 'kml-files';
const SEND_TIMEOUT = 2000;

async function parseAndSendKmlData(socket) {

  try {
    const files = await fs.promises.readdir(KML_DIRECTORY);

    for (const file of files) {
      const filePath = path.join(KML_DIRECTORY, file);
      const kmlString = await fs.promises.readFile(filePath, 'utf8');

      let result;
      try {
        result = await new Promise((resolve, reject) => {
          parseString(kmlString, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      } catch (err) {
        console.error(err);
        continue;
      }

      if (!result.kml.Document[0]?.Placemark) {
        continue;
      }

      for (const placemark of result.kml.Document[0].Placemark) {
        const cotData = {
          name: placemark?.name?.[0]?.trim(),
          lon: placemark?.Point?.[0]?.coordinates?.[0]?.trim()?.split(",")?.[0],
          lat: placemark?.Point?.[0]?.coordinates?.[0]?.trim()?.split(",")?.[1],
        };

        await setTimeout(SEND_TIMEOUT);

        createCotWithBuilder(cotData, (cotMsg) => {
          if (socket) {
            socket.send(cotMsg);
          }
        });
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function createCotWithBuilder(cotData, callback) {
  var start = new Date();
  var stale = new Date();
  stale.setMinutes(stale.getMinutes() + 2);

  callback(builder.create({
    event: {
      '@uid': `KML SENDER - ${Date.now()}`,
      '@version': '2.0',
      '@type': 'a-f-G-U-C-I',
      '@how': 'h-e',
      '@start': start.toISOString(),
      '@time': start.toISOString(),
      '@stale': stale.toISOString(),
      point: {
        '@lat': cotData.lat,
        '@lon': cotData.lon,
        '@hae': Math.random() * 10000,
        '@le': '9999999.0',
        '@ce': '9999999.0'
      },
      detail: {
        contact: {
          '@callsign': `KML SENDER - ${Date.now()}`,
          '@endpoint': "1",
        },
        __group: {
          '@name': 'Red',
          '@role': 'Victim'
        },
        track: {
          '@course': '0',
          '@speed': '0'
        },
        _takconnect_: {
          '@uid': `KML SENDER - ${Date.now()}`,
          '@processCount': '1',
          '@ackRequired': '0',
          '@Subdomain': `KML SENDER - ${Date.now()}`,
          '@TakGroup': `KML SENDER - ${Date.now()}`

        }
      },

    }
  }, { encoding: 'UTF-8', standalone: 'yes' }).end());
}


async function connectToSitX(callback) {
  let accessToken = null;
  let url = `https://pardemo.parteamconnect.com/api/v1/client_auth/token`;
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

  await connectToSitX(async (err, accessToken) => {
    if (!err) {
      token = accessToken;
      let url = streamingURL;
      let authHeader = `Bearer ${token}`;
      socket = new WebSocket(url, [], { 'headers': { 'Authorization': authHeader } });
      socket.on('connection', (client) => {
        client.send('hello');
      })
      socket.on('connect', (client) => {
        client.send('hello');
      })
      socket.on('open', () => {
        parseAndSendKmlData(socket);
      })
    }
  });
}

go();