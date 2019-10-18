pixel = require("node-pixel");
five = require("johnny-five");

var board = new five.Board();
var strip = null;

board.on("ready", function() {
  strip = new pixel.Strip({
    board: this,
    controller: "FIRMATA",
    strips: [
      {pin: 6, length: 60},
      {pin: 7, length: 60}
    ],
    gamma: 2.8
  });

  strip.on("ready", function() {
    // do stuff with the strip here.
  });
});