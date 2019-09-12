function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
function clampTempo(t) {
  return clamp(t, 30, 300);
}
function getTempo() {
  return clampTempo(parseFloat($("input").value));
}
$ = document.querySelector.bind(document);
var ac = new AudioContext();
function setup() {
  var buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  var channel = buf.getChannelData(0);
  var phase = 0;
  var amp = 1;
  var duration_frames = ac.sampleRate / 50;
  const f = 330;
  for (var i = 0; i < duration_frames; i++) {
    channel[i] = Math.sin(phase) * amp;
    phase += 2 * Math.PI * f / ac.sampleRate;
    if (phase > 2 * Math.PI) {
      phase -= 2 * Math.PI;
    }
    amp -= 1 / duration_frames;
  }
  source = ac.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  source.loopEnd = 1 / (getTempo() / 60);
  source.connect(ac.destination);
  source.start(0);
}
var input = document.createElement("input");
input.type = "number";
input.min = 30;
input.max = 300;
input.step = 0.1;
input.value = 133;
var button = document.createElement("button");
button.innerText = "start";
window.onload = function() {
  document.body.appendChild(input);
  document.body.appendChild(button);
  for (e of [input, button]) {
    /* CSS-in-js is trendy */
    e.style = "font-size: 3em; display: block; margin: 1em auto;";
  }
  button.onclick = function() {
    if (ac.state == "running") {
      ac.suspend();
      button.innerText = "start";
    } else {
      ac.resume();
      button.innerText = "stop";
    }
  }
  input.onchange = function() {
      setTimeout(function() {
          input.value = getTempo();
      }, 0);
  }
  input.oninput = function() {
    source.loopEnd = 1 / (getTempo() / 60);
  }
  setup();
}
