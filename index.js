var mqtt = require('mqtt')
var pixel = require("node-pixel")
var firmata = require('firmata')

const fps = 20
const hostname = process.env.MQTT_HOSTNAME
const password = process.env.MQTT_PASSWORD
const username = process.env.MQTT_USERNAME

let sequenzes = {
  "FULL_RED": {
    "SEQUENZ": [
      { "cmd": "strip", "r": 255, "g": 0, "b": 0 },
      { "cmd": "show" }
    ]
  },
  "FULL_WHITE": {
    "SEQUENZ": [
      { "cmd": "strip", "r": 255, "g": 255, "b": 255 },
      { "cmd": "show" }
    ]
  },
  "RUNNING_WHITE": {
    "INIT": [
      { "cmd": "pixel", "pixel": 0, "r": 255, "g": 255, "b": 255 },
      { "cmd": "pixel", "pixel": 1, "r": 255, "g": 255, "b": 255 },
      { "cmd": "show" }
    ],
    "SEQUENZ": [
      { "cmd": "shift", "amt": 2, "dir": "FORWARD", "wrap": true },
      { "cmd": "show" }
    ]
  }
}

let currentSequenz = {
  name: "FULL_RED",
  fullInitialized: true,
  currentFrame: 0
}

console.log(`${username}@${hostname}`)
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
    var SEQUENZ = "FULL_RED"
    console.log("Strip ready connecting to mqtt...")

    var client  = mqtt.connect(`mqtt://${hostname}`, {
      clientId: 'mommes-bett',
      username,
      password,
      will: {
        topic: 'home/room/momme/light/bed',
        payload: JSON.stringify({ connected: false }),
        retain: true,
        qos: 0
      }
    })
    client.on('connect', function () {
      console.log("Connected")
      client.subscribe(['home/room/momme/light/bed/+'], function (err) {
        if (!err) {
          client.publish('home/room/momme/light/bed', JSON.stringify({ val: "FULL_GREEN", connected: true }))
        }
      })
    })

    client.on('message', function (topic, message) {
      try {
        let doc = JSON.parse(message)
        console.log(`${topic}: ${JSON.stringify(doc)}`)
        if (topic === 'home/room/momme/light/bed') {
          SEQUENZ = doc.val
        } else {
          // SET SEQ
        }
      } catch (error) {
        console.log(error)
      }
    })

    setInterval(() => {
      /*if (SEQUENZ === "FULL_RED") strip.color([255,0,0])
      else if (SEQUENZ === "FULL_GREEN") strip.color([0,255,0])
      else if (SEQUENZ === "FULL_WHITE") strip.color([255,255,255])
      else if (SEQUENZ === "BLACK") strip.off()
      else {
        sequenzes[RUNNING_WHITE]
      }
      strip.show()*/

      let SEQUENZ = sequenzes[currentSequenz]

      if (SEQUENZ == undefined) {
        strip.off()
        strip.show()
        return
      }

      if (currentSequenz.fullInitialized) {
        runCmd(strip, currentSequenz.SEQUENZ[currentSequenz.currentFrame])
        if (currentSequenz.currentFrame === currentSequenz.SEQUENZ.length-1) currentSequenz.currentFrame = 0
        else currentSequenz.currentFrame++
      } else {
        
      }
    }, 1000/fps)
  })
})

function runCmd(strip, cmd) {
  console.log(cmd)
  switch (cmd.cmd.toUpperCase()) {
    case "STRIP":
      strip.color([cmd.r || 0, cmd.g || 0, cmd.b || 0])
      break;
    case "SHOW":
      strip.show()
      break;
  
    default:
      break;
  }
}
