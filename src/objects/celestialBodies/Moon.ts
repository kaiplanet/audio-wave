import { Power1 } from "gsap/all";
import * as THREE from "three";

import CelestialBody from "./CelestialBody";

export default class Moon extends CelestialBody {
    constructor(position: THREE.Vector3, risePosition: THREE.Vector3, setPosition: THREE.Vector3) {
        super(position, risePosition, setPosition);

        this.init();
    }

    protected generateTexture() {
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

        this.texture = new THREE.DataTexture(textureData, resolution, resolution);
        this.texture.generateMipmaps = true;
        this.texture.needsUpdate = true;
    }

    protected init() {
        const light = new THREE.DirectionalLight(0xe6f5ff, 10);

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
}
