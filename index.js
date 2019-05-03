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

var sunset = 0;
var turnoff = 0;
var state = false;

start();

async function start() {
  await requestSunsetTime();
  turnoff = moment(config.turnOffTime, 'h:mm:ss a').format('X');
  handleLamp(true);
}

cron.schedule("0 5 * * *", () => {
  //Every day at 5:00 AM, request Sunset time of the day
  start();
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
    let today = moment().format('YYYY-MM-DD')
    const api = program.dev ? config.api.dev : config.api.prod;
    const params = `?lat=${config.latitude}&lng=${config.longitude}&date=${today}&formatted=0`;

    axios.get(`${api}${params}`)
    .then(function (response) {
        var date = response.data.results.sunset;
        var m = moment(date);

        sunset = m.local().format('X');
        writeCache('sunset', m.local().format('h:mm:ss a'));

        console.log("Resquest: OK");
        resolve();

    }).catch(function (error) {
      sunset = moment(config.cache.sunset, 'h:mm:ss a').format('X');
      resolve();
    });
  });
}

async function handleLamp(print = false) {

  let now = moment().format('X');
  
  if(print === true) {
    console.log("==== SUNSET ====")
    console.log(moment.unix(sunset).format("lll"));

    console.log("==== NOW ====")
    console.log(moment.unix(now).format("lll"));

    console.log("==== TURNOFF ====")
    console.log(moment.unix(turnoff).format("lll"));
  }

  if (now > sunset && now < turnoff && !state) {
    state = turnLamp(true);
  }

  if (now >= turnoff && state) {
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


