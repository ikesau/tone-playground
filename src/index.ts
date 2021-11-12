import * as Tone from "tone";
import * as d3 from "d3";

if (module.hot) {
  module.hot.dispose(() => {
    d3.select("body").html("");
  });
}

const synth = new Tone.MonoSynth({
  oscillator: {
    type: "sine",
  },
  envelope: {
    attack: 0,
  },
}).toDestination();

d3.select("body")
  .append("button")
  .text("hello")
  .on("click", () => synth.triggerAttackRelease("C4", "8n"));
