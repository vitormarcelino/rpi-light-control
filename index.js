#!/usr/bin/env node

const axios = require('axios');
const moment = require('moment');
const cron = require('node-cron');
const config = require('./config');
const fs = require('fs');
const Gpio = require('onoff').Gpio;

const relay = new Gpio(17, 'out');

var program = require('commander');

program.option('--dev', 'Development Mode (Fake API)').parse(process.argv);

var sunsetTime = 0;
var turnOffTime = 0;
var state = false;

start();

async function start() {
  await requestSunsetTime();
  await configure();
  handleLamp();
}

function configure() {
  return new Promise(resolve => {
    sunsetTime = (typeof config.cache.sunset !== 'undefined') ? moment(config.cache.sunset, 'h:mm:ss a').format('X') : 0;
    turnOffTime = moment(config.turnOffTime, 'h:mm:ss a').local().format('X');
    state = false;

    setTimeout(() => {
      console.log("Configuration: OK");
      resolve("Ok");
    }, 500);

  });
}

cron.schedule("0 6 * * *", () => {
  //Every day at 6:00 AM, request Sunset time of the day
  configure();
});

cron.schedule("* * * * *", () => {
  //At every minute verify current time with Sunset Time and Turn off Time
  handleLamp();
});

var express = require('express');

var app = express();

app.get('/light', function (req, res) {
  state = !state;
  turnLamp(state);

  let response = (state) ? "Luzes Acesas" : "Luzes Apagadas";
  res.send(response);
});

var server = app.listen(3001, function () {
  var host = server.address().address;
  var port = server.address().port;
});


function requestSunsetTime() {
  return new Promise((resolve, reject) => {
    const api = program.dev ? config.api.dev : config.api.prod;
    const params = `?lat=${config.latitude}&lng=${config.longitude}`;

    axios.get(`${api}${params}`)
    .then(function (response) {
        var date = response.data.results.sunset;
        var m = moment.utc(date, 'h:mm:ss a');

        sunsetTime = m.local().format('X');
        writeCache('sunset', m.local().format('h:mm:ss a'));

        console.log("Resquest: OK");
        resolve();

    }).catch(function (error) {
      console.log("Reject");
      reject();
    });
  });
}

function handleLamp() {
  let now = {
    hour: moment().format("HH"),
    minutes: moment().format("mm")
  };

  let sunset = {
    hour: moment.unix(sunsetTime).format("HH"),
    minutes: moment.unix(sunsetTime).format("mm")
  };

  let turnoff = {
    hour: moment.unix(turnOffTime).format("HH"),
    minutes: moment.unix(turnOffTime).format("mm")
  };

  if (now.hour >= sunset.hour && now.minutes >= sunset.minutes 
      && now.hour <= turnoff.hour && now.minutes <= turnoff.minutes && !state) {
    state = turnLamp(true);
  }

  if (now.hour == turnoff.hour && now.minutes == turnoff.minutes && state) {
    state = turnLamp(false);
  }

}

function turnLamp(state) {
  let relayVal = state ? 1 : 0;
  let log = state ? 'Turn On' : 'Turn Off';
  console.log(log);
  relay.writeSync(relayVal);
  return state;
}

function writeCache(key, value) {
  let cache = config.cache ? config.cache : {} ;
  cache[key] = value;
  config.cache = cache;
  fs.writeFile('config.json', JSON.stringify(config, null, 4), (err) => {
    if(err) {
      console.log(err);
    } else {
    }
  });
}


