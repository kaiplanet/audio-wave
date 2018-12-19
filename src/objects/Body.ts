import * as THREE from "three";

export default abstract class {
    protected objects: THREE.Object3D[] = [];

    protected constructor() {
        this.init();
    }

    public addTo(scene: THREE.Scene, position: THREE.Vector3): this {
        this.objects.forEach((object) => {
            object.position.set(position.x, position.y, position.z);
            scene.add(object);
        });

        return this;
    }

    public abstract startSimulation(): this;
    public abstract stopSimulation(): this;

    protected abstract init(): this;
}
