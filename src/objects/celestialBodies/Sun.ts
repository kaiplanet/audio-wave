import { Power1 } from "gsap/all";
import * as THREE from "three";

import CelestialBody from "./CelestialBody";

export default class Sun extends CelestialBody {
    protected static textureResolution = 512;

    constructor(position: THREE.Vector3, risePosition: THREE.Vector3, setPosition: THREE.Vector3) {
        super(position, risePosition, setPosition);

        this.init();
    }

    protected generateTexture() {
        const resolution = Sun.textureResolution;

        const textureData = new Uint8Array(resolution * resolution * 4).map((value, index) => {
            const distance = Math.sqrt(Math.pow(Math.floor(index / 4 / resolution) - resolution / 2, 2)
                + Math.pow(Math.abs(index / 4 % resolution - resolution / 2), 2));

            if (distance >= resolution * .15) {
                switch (index % 4) {
                    case 0:
                        return Math.max(254 - 8 * (distance - resolution * .15) / (resolution * .35), 0);
                    case 1:
                        return Math.max(254 - 102 * (distance - resolution * .15) / (resolution * .35), 0);
                    case 2:
                        return Math.max(95 - 41 * (distance - resolution * .15) / (resolution * .35), 0);
                    case 3:
                        return Math.max(255 - 255 * (distance - resolution * .15) / (resolution * .35), 0);
                    default:
                        return 0;
                }
            }

            return 255;
        });

        this.texture = new THREE.DataTexture(textureData, resolution, resolution);
        this.texture.generateMipmaps = true;
        this.texture.needsUpdate = true;
    }

    protected init() {
        const light = new THREE.DirectionalLight(0xff9e3a, 20);

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
