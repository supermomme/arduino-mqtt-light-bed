/*pixel = require("node-pixel")
five = require("johnny-five")
var mqtt = require('mqtt')

var board = new five.Board()
var strip = null

board.on("ready", function() {
  strip = new pixel.Strip({
    board: this,
    controller: "FIRMATA",
    strips: [
      {pin: 6, length: 60},
      {pin: 7, length: 60}
    ],
    gamma: 2.8
  })

  strip.on("ready", function() {
    var SEQUENZ = "FULL_RED"
    console.log("Strip ready connecting to mqtt...")
/*    var client  = mqtt.connect('mqtt://10.0.100.10')
    client.on('connect', function () {
      console.log("Connected")
      client.subscribe(['home/room/momme/light/bed', 'home/room/momme/light/bed/#'], function (err) {
        if (!err) {
          client.publish('home/room/momme/light/bed', { val: "FULL_GREEN", connected: true })
        }
      })
    })

    client.on('message', function (topic, message) {
      if ()
      console.log(message.toString())
      client.end()
    })

    setInterval(() => {
      if (SEQUENZ === "FULL_RED") {
        strip
      }
    }, 1000/20);
*
  })
})
*/
pixel = require("node-pixel");
var firmata = require('firmata');

var board = new firmata.Board('/dev/ttyACM0',function(){
  strip = new pixel.Strip({
    firmata: board,
    controller: "FIRMATA",
    strips: [
      {pin: 6, length: 60},
      {pin: 7, length: 60}
    ],
    gamma: 2.8
  })
  strip.on("ready", function() {
    console.log("READY")
    strip.pixel(0).color([0,0,0])
    strip.pixel(1).color([255,255,255])
    strip.show()
    setInterval(() => {
      strip.shift(1, pixel.FORWARD, true)
/      strip.show()
    }, 1000/20)
  });
});

