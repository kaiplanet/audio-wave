import { Power1 } from "gsap/all";
import * as THREE from "three";

import CelestialBody from "./CelestialBody";

import { animate } from "../../utils";

export default class extends CelestialBody {
    constructor(position: THREE.Vector3, risePosition: THREE.Vector3, setPosition: THREE.Vector3) {
        super(position, risePosition, setPosition);

        this.init();
    }

    public rise() {
        if (this.light) {
            this.light.position.set(this.riseDirection.x, this.riseDirection.y, this.riseDirection.z);
            animate(this.light.position, this.originDirection, 2, { delay: 1, ease: Power1.easeOut });
        }

        return this;
    }

    public set() {
        if (this.light) {
            animate(this.light.position, this.setDirection, 4, { ease: Power1.easeIn });
        }

        return this;
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
}
