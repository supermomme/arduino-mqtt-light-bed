const fs = require('fs')

const size = 1000
const file = __dirname + '/rainbow.json'

var rainbow = new Array(size)

for (var i=0; i<size; i++) {
  var red   = sin_to_val(i, 0 * Math.PI * 2/3) // 0   deg
  var blue  = sin_to_val(i, 1 * Math.PI * 2/3) // 120 deg
  var green = sin_to_val(i, 2 * Math.PI * 2/3) // 240 deg
  rainbow[i] = [red,green,blue]
}

function sin_to_val(i, phase) {
  var sin = Math.sin(Math.PI / size * 2 * i + phase)
  var int = Math.floor(sin * 127) + 128

  return int
}

let finalResult = {
  SEQUENZ: rainbow.reduce((prev, cur) => {
    prev.push({
      "cmd": "STRIP",
      "r": cur[0],
      "g": cur[1],
      "b": cur[2]
    })
    prev.push({ "cmd": "SHOW" })
    return prev
  }, [])
}

fs.writeFileSync(file, JSON.stringify(finalResult))
console.log(`Saved in ${file}. Just post it now to the http api.`)