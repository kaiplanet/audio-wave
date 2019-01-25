import AudioWaves from "../src/AudioWaves";

const audioWaves = new AudioWaves();

audioWaves.init(window.innerWidth, window.innerHeight);
audioWaves.mount(document.body);
// audioWaves.mountWaterTexture(document.body);

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

    const textureData = new Uint8ClampedArray(61 * 61 * 4).map((value, index) => {
        if (index % 4 === 3) {
            const distance = Math.sqrt(Math.pow(Math.abs(Math.floor(index / 4 / 61) - 31), 2)
                + Math.pow(Math.abs(index / 4 % 61 - 31), 2));

            if (distance <= 30) {
                return 138 + 10 * Math.cos(Math.PI * distance / 30);
            }

            return 128;
        }

        return 0;
    });

    audioWaves.generateWave(new ImageData(textureData, 61, 61), { x: 0, y: 0 });
});
