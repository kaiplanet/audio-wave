import AudioWaves from "../src/AudioWaves";

const audioWaves = new AudioWaves();

audioWaves.init(window.innerWidth, window.innerHeight);
audioWaves.mount(document.body);
// audioWaves.mountWaterTexture(document.body); // TODO: remove later

const toolBar = document.querySelector("#tool-bar");

toolBar.querySelector(".start").addEventListener("click", () => {
    audioWaves.start();
});

toolBar.querySelector(".stop").addEventListener("click", () => {
    audioWaves.stop();
});

toolBar.querySelector(".switch-to-day").addEventListener("click", () => {
    audioWaves.switchToDay();
});

toolBar.querySelector(".switch-to-night").addEventListener("click", () => {
    audioWaves.switchToNight();
});

toolBar.querySelector(".generate-wave").addEventListener("click", () => {
    const textureData = new Uint8ClampedArray(64 * 64 * 4).map((value, index) => {
        if (index % 4 === 0) {
            const distance = Math.sqrt(Math.pow(Math.abs(Math.floor(index / 4 / 64) - 32.5), 2)
                + Math.pow(Math.abs(index / 4 % 64 - 32.5), 2));

            if (distance <= 30) {
                return 188 + 60 * Math.cos(Math.PI * distance / 60);
            }

            return 128;
        }

        return 0;
    });

    audioWaves.generateWave(new ImageData(textureData, 64, 64), { x: 0, y: -.5 });
});
