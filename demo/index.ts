import AudioWaves from "../src/AudioWaves";

const audioWaves = new AudioWaves();

audioWaves.init(window.innerWidth, window.innerHeight);
audioWaves.mount(document.body);

const toolBar = document.querySelector("#tool-bar");

toolBar.querySelector(".start").addEventListener("click", () => {
    audioWaves.start();
});

toolBar.querySelector(".stop").addEventListener("click", () => {
    audioWaves.stop();
});

toolBar.querySelector(".generate-wave").addEventListener("click", () => {
    const x = +(toolBar.querySelector(".x") as HTMLInputElement).value;
    const y = +(toolBar.querySelector(".y") as HTMLInputElement).value;
    const height = +(toolBar.querySelector(".height") as HTMLInputElement).value;
    const period = +(toolBar.querySelector(".period") as HTMLInputElement).value;

    // audioWaves.generateWave();
});
