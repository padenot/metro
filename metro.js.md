Utility functions
-----------------

This utility functions allows us to convert a MIDI note number to a frequency
value. It'll be useful when we'll try to write melodies.

First we need a function to clamp between two values, JavaScript doesn't seem to
have one, so lets' make one:

    function clamp(v, min, max) {
      return Math.min(max, Math.max(min, v));
    }

Then we need to determine our tempo range. 30 to 300 seems wide enough.

    function clampTempo(t) {
      return clamp(t, 30, 300);
    }

And then a utility function to get the tempo value, clamped the pre-determined
range:

    function getTempo() {
      return clampTempo(parseFloat($("input").value));
    }

And then a little shortcut that I like to use, `$` to get DOM elements, like in
the old days:

    $ = document.querySelector.bind(document);

The metronome core
------------------

We need a sound that repeats at very precise intervals. No jitter is acceptable,
since this is the point of reference for a musician or a band. Looping a
`AudioBufferSourceNode` in the Web Audio API is guaranteed to be:

- *Very* precise, down to below a single sample of precision
- Not affected by the load of the machine, since everything is running on a
  real-time thread, on all OSes, on all browsers
- Not affected by the main thread load, since the main thread is not used,
  except when changing the tempo
- Portable: this works on any implementation of the Web Audio API that was ever
  released, regardless of the version of the implementation (I think? I haven't
  tried, but the objects this is using were in the first published draft of the
  spec)

If we loop a buffer of the right size, we can have a very precise metronome, the
rest of this document explains how.

First, as usual, let's get an `AudioContext`:

    var ac = new AudioContext();

Then, wrap all the setup in a function, that we'll call when the elements we use
for controlling the metronome will be ready.

    function setup() {

First thing we need to do when setting up is to get an `AudioBuffer`, which is
something that can hold audio data, in the form of a buffer of floats (or
multiple buffers of floats for a stereo `AudioBuffer`, one per channel).

We need to make it long enough for our tempo range: twice the sample-rate means
it can hold 2 seconds of audio data (since the sample-rate is the number of
samples per seconds), which is long enough for a metronome set at 30 beats per
minute. This is fairly slow, but very useful when practicing an instrument, to
really get a solid timing:

      var buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);

Get the internal float buffer on the first channel (we only have one anyways),
this gets us a regular `Float32Array`:

      var channel = buf.getChannelData(0);

Now, we could use a sample, we it's easier and more fun to just synthesize a
little tone.  Let's get a sine wave with a decaying envelope, with a pitch that
is not too low (so that it can be heard easily over a backing track), but not
too high (since it's likely to be playing for a long time, and high pitched
sound tend to be tiring over time).

In an oscillator, the phase is a number in [0; 2*π] that is the position of the
signal in the periodic waveform:

      var phase = 0;

The amp is simply a volume multiplier. It starts at full volume, and here we'll
make it linearly decrease over the length of the tone:

      var amp = 1;

We pick a duration of 20ms: `ac.sampleRate` samples is 1 seconds, so divided by
50 is 20ms. This is short enough to be precise:

      var duration_frames = ac.sampleRate / 50;

The frequency is set to be 330Hz, which is an E. It's often better to have two
tones, and to not use a sine, so that there are harmonics, allowing the
metronome sound to cut better in a busy mix, but here, simplicity is more
important:

      const f = 330;

Now, for each sample, for the duration of our tone, we compute the sine value,
increment the phase (and wrap it around if it goes over 2π, but this is probably
not necessary because the tone is so short anyways). Finally, we decrement our
amplitude value so that the sound volume decrease over time, and resembles a
percussive sound, like a percussionist hitting a clave of some sort:

      for (var i = 0; i < duration_frames; i++) {
        channel[i] = Math.sin(phase) * amp;
        phase += 2 * Math.PI * f / ac.sampleRate;
        if (phase > 2 * Math.PI) {
          phase -= 2 * Math.PI;
        }
        amp -= 1 / duration_frames;
      }

Now, back to Web Audio API code, we create an `AudioBufferSoureNode`, which is
the object that lets author play back the content of an `AudioBuffer`:

      source = ac.createBufferSource();

We set the buffer to play via its `buffer` attribute:

      source.buffer = buf;

Set it to loop, and set the loop end to exactly the right duration, for our
tempo: the duration between two beats is the tempo, divided by 60, which gets us
the frequency of the beats in Hertz. Inverting Hertz gets us seconds, and that's
what the `loopEnd` attribute uses:

      source.loop = true;
      source.loopEnd = 1 / (getTempo() / 60);

Finally, we connect this `AudioBufferSourceNode` to the `AudioContext`
destination, and start the playback of this `AudioNode`:

      source.connect(ac.destination);
      source.start(0);
    }

Now, we'de like this metronome to be startable and stoppable. A simple button
will do the job, and an input type number will allow to change the tempo.

The tool I'm using do do this doesn't seem to support mixed HTML and js source
code, so I'm writing everything in JavaScript, like an animal. I'm not happy
about this.

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

By default, the Web Audio API is prevented from playing, it's
going to be necessary to click the button to start playback. This is the
behaviour we want, having sound starting when a page is loaded is really really
bad. We only use one button for start and stop, so it's necessary to change the
label:

      button.onclick = function() {
        if (ac.state == "running") {
          ac.suspend();
          button.innerText = "start";
        } else {
          ac.resume();
          button.innerText = "stop";
        }
      }

Whenever the input value changes, it's necessary to change the `loopEnd`
attribute so it ticks at the right interval. We also want to update the value
displayed, to make it clear to the user that the supported tempo range is [30,
300]:

      input.oninput = function() {
        setTimeout(function() {
            input.value = getTempo();
        }, 0);
        source.loopEnd = 1 / (getTempo() / 60);
      }

      setup();
    }
