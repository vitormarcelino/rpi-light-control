var express = require('express');

var app = express();

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

app.get('/fake', function (req, res) {
    let data = {
        "results": {
          "sunrise": "8:39:12 AM",
          "sunset": "17:48:46 PM",
          "solar_noon": "2:35:29 PM",
          "day_length": "11:52:34",
          "civil_twilight_begin": "8:17:53 AM",
          "civil_twilight_end": "8:53:05 PM",
          "nautical_twilight_begin": "7:53:07 AM",
          "nautical_twilight_end": "9:17:51 PM",
          "astronomical_twilight_begin": "7:28:24 AM",
          "astronomical_twilight_end": "9:42:34 PM"
        },
        "status": "OK"
      }
    res.json(data);
});

var server = app.listen(3002, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);

});
