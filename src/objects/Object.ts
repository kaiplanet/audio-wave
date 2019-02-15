import * as THREE from "three";

export default abstract class {
    protected objects: THREE.Object3D[] = [];

    protected constructor() { }

    public addTo(scene: THREE.Scene, position?: THREE.Vector3, ...params: any): this {
        this.objects.forEach((object) => {
            if (position) {
                object.position.set(position.x, position.y, position.z);
            }

            scene.add(object);
        });

        return this;
    }

    public abstract startSimulation(): this;
    public abstract stopSimulation(): this;

    protected abstract init(...params: any): this;
}
