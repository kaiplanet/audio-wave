import * as THREE from "three";

import CelestialBody from "./CelestialBody";

export default class extends CelestialBody {
    constructor(position: THREE.Vector3, risePosition: THREE.Vector3, setPosition: THREE.Vector3) {
        super(position, risePosition, setPosition);

        this.init();
    }

    protected init() {
        const light = new THREE.DirectionalLight(0xffe6cc, 20);

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
