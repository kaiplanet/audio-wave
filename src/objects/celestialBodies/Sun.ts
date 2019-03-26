import { Sine } from "gsap/all";
import * as THREE from "three";

import CelestialBody from "./CelestialBody";

export default class Sun extends CelestialBody {
    protected static textureResolution = 512;

    constructor(position: THREE.Vector3, risePosition: THREE.Vector3, setPosition: THREE.Vector3, options) {
        super(position, risePosition, setPosition, options);

        this.init(options);
    }

    protected loadTexture() {
        const resolution = Sun.textureResolution;
        const radianceStart = resolution * .15;
        const radianceEnd = resolution * .35;
        const ease = Sine.easeOut;

        const textureData = new Uint8Array(resolution * resolution * 4).map((value, index) => {
            const distance = Math.sqrt(Math.pow(Math.floor(index / 4 / resolution) - resolution / 2, 2)
                + Math.pow(Math.abs(index / 4 % resolution - resolution / 2), 2));

            if (distance >= radianceStart) {
                switch (index % 4) {
                    case 0:
                        return 254 - 8 * ease.getRatio(Math.min((distance - radianceStart) / radianceEnd, 1));
                    case 1:
                        return 254 - 102 * ease.getRatio(Math.min((distance - radianceStart) / radianceEnd, 1));
                    case 2:
                        return 95 - 41 * ease.getRatio(Math.min((distance - radianceStart) / radianceEnd, 1));
                    case 3:
                        return 255 - 255 * ease.getRatio(Math.min((distance - radianceStart) / radianceEnd, 1));
                    default:
                        return 0;
                }
            }

            return 255;
        });

        const texture = new THREE.DataTexture(textureData, resolution, resolution);

        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        this.spriteMaterial.map = texture;
    }

    protected init({ intensity }) {
        const light = new THREE.DirectionalLight(0xff9e3a, intensity);

        light.castShadow = true;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500;
        light.shadow.camera.left = -500;
        light.shadow.camera.right = 500;
        light.shadow.camera.top = 500;
        light.shadow.camera.bottom = -500;

        super.init(light);

        return this;
    }

    protected initSprite() {
        super.initSprite();
        this.sprite.scale.set(.2, .2, 1);
    }
}
