import { TweenLite } from "gsap/all";
import * as THREE from "three";

function animate(target: THREE.Vector3, vars: THREE.Vector3, duration: number, options: object);
function animate(target: any, vars: any, duration: number, options: object) {
    if (target instanceof THREE.Vector3) {
        const direction = {
            x: target.x,
            y: target.y,
            z: target.z,
        };

        TweenLite.to(direction, duration, {
            x: vars.x,
            y: vars.y,
            z: vars.z,

            onUpdate: () => {
                target.setX(direction.x);
                target.setY(direction.y);
                target.setZ(direction.z);
            },
            ...options,
        });
    }
}

export { animate };
