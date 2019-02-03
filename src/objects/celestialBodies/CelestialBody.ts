import * as THREE from "three";

import Body from "../Body";

export default abstract class extends Body {
    protected light: THREE.Light;
    protected originDirection: THREE.Vector3;
    protected riseDirection: THREE.Vector3;
    protected setDirection: THREE.Vector3;

    protected constructor(position: THREE.Vector3, risePosition: THREE.Vector3, setPosition: THREE.Vector3) {
        super();

        this.originDirection = position.clone().normalize();
        this.riseDirection = risePosition.clone().normalize();
        this.setDirection = setPosition.clone().normalize();
    }

    public setPosition(position: THREE.Vector3) {
        const lightDirection = position.clone().normalize();

        this.light.position.set(lightDirection.x, lightDirection.y, lightDirection.z);
    }

    public abstract rise();
    public abstract set();

    public startSimulation() {
        return this;
    }

    public stopSimulation() {
        return this;
    }

    public addTo(scene: THREE.Scene) {
        super.addTo(scene);

        if (process.env.NODE_ENV === "development" && this.light) {
            scene.add(new THREE.DirectionalLightHelper(this.light));
        }

        return this;
    }

    protected init(light: THREE.Light) {
        light.position.set(this.originDirection.x, this.originDirection.y, this.originDirection.z);
        this.light = light;
        this.objects.push(light);

        return this;
    }
}
