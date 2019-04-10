const axios = require('axios');
const moment = require('moment');
const cron = require('node-cron');
const config = require('./config');
// const Gpio = require('onoff').Gpio;

// const relay = new Gpio(17, 'out');

var program = require('commander');

program.option('--dev', 'Development Mode (Fake API)').parse(process.argv);

var sunset = 0;
var turnOffTime = moment(config.turnOffTime, 'h:mm:ss a').format('X');
var state = false;

requestSunsetTime();

cron.schedule("* * * * *", () => {
  requestSunsetTime();
});

cron.schedule("* * * * *", () => {
  handleLamp();
});


function requestSunsetTime() {

  const api = program.dev ? "http://localhost:3001/fake" : "https://api.sunrise-sunset.org/json";
  const params = `?lat=${config.latitude}&lng=${config.longitude}`;

  axios.get(`${api}${params}`)
  .then(function (response) {
      var date = response.data.results.sunset;
      var m = moment.utc(date, 'h:mm:ss a');

      sunset = m.local().format('X');
      handleLamp();

  }).catch(function (error) {
    console.log(error);
  }).then(function () {

  });
}

function handleLamp() {
  var now = moment().format("X");

  if (now >= sunset && now < turnOffTime && !state) {
    state = true;
    // relay.writeSync(state);
    console.log('Ligando a lampada ');
  }

  if (now >= turnOffTime && state) {
    state = false;
    // relay.writeSync(state);
    console.log('Desligando a lampada');
  }

}


