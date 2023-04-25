'use strict'

import { parentPort, workerData } from 'worker_threads';
import builder from 'xmlbuilder';
import { setTimeout } from "timers/promises";


async function process() {
    var length = workerData.result.kml.Document[0].Placemark.length;
    var cnt = 0;
    while(cnt < length) {
        const placemark = workerData.result.kml.Document[0].Placemark[cnt];
        const cotData = {
            uid: workerData.uid,
            name: workerData.callsign,
            lon: placemark?.Point?.[0]?.coordinates?.[0]?.trim()?.split(",")?.[0],
            lat: placemark?.Point?.[0]?.coordinates?.[0]?.trim()?.split(",")?.[1],
        };
        await setTimeout(workerData.timeOut);

        createCotWithBuilder(cotData, (cotMsg) => {
            parentPort.postMessage(cotMsg);
        });
        cnt += 1;
        // Loop back from teh beginning
        if (cnt +1 === length) {
            cnt = 0;
        }
    }
}

function createCotWithBuilder(cotData, callback) {
    var start = new Date();
    var stale = new Date();
    stale.setMinutes(stale.getMinutes() + 2);
  
    callback(builder.create({
      event: {
        '@uid': cotData.uid,
        '@version': '2.0',
        '@type': 'a-f-G-U-C-I',
        '@how': 'h-e',
        '@start': start.toISOString(),
        '@time': start.toISOString(),
        '@stale': stale.toISOString(),
        point: {
          '@lat': cotData.lat,
          '@lon': cotData.lon,
          '@hae': '9999999.0',
          '@le': '9999999.0',
          '@ce': '9999999.0'
        },
        detail: {
          contact: {
            '@callsign': cotData.name,
            '@endpoint': "1",
          },
          __group: {
            '@name': 'Red',
            '@role': 'Victim'
          },
          track: {
            '@course': '0',
            '@speed': '0'
          }
        },
  
      }
    }, { encoding: 'UTF-8', standalone: 'yes' }).end());
  }

process();