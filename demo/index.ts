import AudioWaves from "../src/AudioWaves";

const audioWaves = new AudioWaves();

audioWaves.init(window.innerWidth, window.innerHeight);
audioWaves.mount(document.body);
audioWaves.start();
