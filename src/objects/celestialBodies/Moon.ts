import { Sine } from "gsap/all";
import * as THREE from "three";

import CelestialBody from "../CelestialBody";

import { MOON } from "../../assets/assets";
import { loadImageData } from "../../utils";

export default class Moon extends CelestialBody {
    constructor(position: THREE.Vector3, risePosition: THREE.Vector3, setPosition: THREE.Vector3, options) {
        super(position, risePosition, setPosition, options);

        this.init();
    }

    protected loadTexture() {
        const resolution = Moon.textureResolution;

        const textureData = new Uint8Array(resolution * resolution * 4).map((value, index) => {
            switch (index % 4) {
                case 0:
                    return 230;
                case 1:
                    return 245;
                case 2:
                    return 255;
                case 3:
                    const distance = Math.sqrt(Math.pow(Math.floor(index / 4 / resolution) - resolution / 2, 2)
                        + Math.pow(Math.abs(index / 4 % resolution - resolution / 2), 2));

                    if (distance >= resolution * .3) {
                        return Math.max(255 - 255 * (distance - resolution * .3) / (resolution * .2), 0);
                    }

                    return 255;
                default:
                    return 0;
            }
        });

        const texture = new THREE.DataTexture(textureData, resolution, resolution);

        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        this.spriteMaterial.map = texture;

        this.loadImageTexture();
    }

    protected init() {
        const light = new THREE.DirectionalLight(0xe6f5ff, this.intensity);

        light.castShadow = true;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500;
        light.shadow.camera.left = -500;
        light.shadow.camera.right = 500;
        light.shadow.camera.top = 500;
        light.shadow.camera.bottom = -500;
        this.light = light;

        super.init();
    }

    private async loadImageTexture() {
        const imageData = await loadImageData(MOON);
        const imageResolution = Math.min(imageData.width, imageData.height);
        const resolution = Math.ceil(imageResolution * 5 / 4);
        const offset = Math.round((resolution - imageResolution) / 2);
        const imageOffsetX = imageData.width - imageResolution;
        const imageOffsetY = imageData.height - imageResolution;
        const radianceStart = imageResolution * (.5 - .2);
        const radianceEnd = resolution * .5 - radianceStart;
        const ease = Sine.easeOut;

        const textureData = new Uint8Array(resolution * resolution * 4).map((value, index) => {
            const pixelIndex = Math.floor(index / 4);
            const componentIndex = index % 4;
            const x = pixelIndex % resolution;
            const y = Math.floor(pixelIndex / resolution);
            const distance = Math.sqrt(Math.pow(x - resolution / 2, 2) + Math.pow(Math.abs(y - resolution / 2), 2));
            const imagePixelIndex = (x - offset) + imageOffsetX + ((y - offset) + imageOffsetY) * imageResolution;

            if (distance > radianceStart) {
                const radianceComponent = (() => {
                    switch (componentIndex) {
                        case 0:
                            return 230;
                        case 1:
                            return 245;
                        case 2:
                            return 255;
                        case 3:
                            return (1 - ease.getRatio(Math.min((distance - radianceStart) / radianceEnd, 1))) * 255;
                        default:
                            return 0;
                    }
                })();

                if (x < offset || x > resolution - offset || y < offset || y > resolution - offset) {
                    return radianceComponent;
                }

                const texelAlpha = imageData.data[imagePixelIndex * 4 + 3] / 255;

                if (componentIndex === 3) {
                    const radianceAlpha = 1 - ease.getRatio(Math.min((distance - radianceStart) / radianceEnd, 1));

                    return Math.floor((1 - (1 - radianceAlpha) * (1 - texelAlpha)) * 255);
                }

                if (texelAlpha === 0) {
                    return radianceComponent;
                }

                const texelComponent = imageData.data[imagePixelIndex * 4 + componentIndex];

                return texelComponent + (radianceComponent - texelComponent) * (1 - texelAlpha);
            }

            return imageData.data[imagePixelIndex * 4 + componentIndex];
        });

        const texture = new THREE.DataTexture(textureData, resolution, resolution);

        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        this.spriteMaterial.map = texture;

        if (this.background) {
            this.background.update();
        }
    }
}
