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

const waveSourceTextureData = new Uint8ClampedArray(64 * 64 * 4).map((value, index) => {
    if (index % 4 === 0) {
        const distance = Math.sqrt(Math.pow(Math.abs(Math.floor(index / 4 / 64) - 32.5), 2)
            + Math.pow(Math.abs(index / 4 % 64 - 32.5), 2));

        if (distance <= 30) {
            return 188 + 60 * Math.cos(Math.PI * distance / 30);
        }

        return 128;
    }

    return 0;
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

const demo = () => {
    audioWaves.start();
    setTimeout(() => audioWaves.generateWave(new ImageData(waveSourceTextureData, 64, 64), { x: 0, y: .5 }), 0);
    setTimeout(() => audioWaves.generateWave(new ImageData(waveSourceTextureData, 64, 64), { x: 0, y: -.5 }), 1000);
    setTimeout(() => audioWaves.generateWave(new ImageData(waveSourceTextureData, 64, 64), { x: .3, y: .5 }), 2000);
    setTimeout(() => audioWaves.generateWave(new ImageData(waveSourceTextureData, 64, 64), { x: -.3, y: .5 }), 3000);
    setTimeout(() => audioWaves.generateWave(new ImageData(waveSourceTextureData, 64, 64), { x: .3, y: 0 }), 4000);
    setTimeout(() => audioWaves.generateWave(new ImageData(waveSourceTextureData, 64, 64), { x: -.3, y: 0 }), 5000);
    setTimeout(() => audioWaves.generateWave(new ImageData(waveSourceTextureData, 64, 64), { x: 0, y: -.5 }), 6000);
    setTimeout(() => audioWaves.switchToDay(), 8000);
    setTimeout(() => audioWaves.generateWave(new ImageData(waveSourceTextureData, 64, 64), { x: 0, y: -.5 }), 12000);
};

setTimeout(demo, 3000);
