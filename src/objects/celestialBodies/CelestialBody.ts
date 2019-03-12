import { Power1 } from "gsap/all";
import * as THREE from "three";

import Background from "../Background";
import Object from "../Object";

import { animate } from "../../utils";

const SPRITE_DISTANCE = 1;
const TEXTURE_RESOLUTION = 256;

const getRotationAxis = (a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 => {
    const crosssProduct =  a.clone().cross(b);

    if (crosssProduct.y < 0) {
        crosssProduct.multiplyScalar(-1);
    }

    return crosssProduct.normalize();
};

const getAngle = (a: THREE.Vector3, b: THREE.Vector3): number => {
    if (a.clone().cross(b).y > 0) {
        return a.angleTo(b);
    } else {
        return 2 * Math.PI - a.angleTo(b);
    }
};

export default abstract class CelestialBody extends Object {
    protected static textureResolution = TEXTURE_RESOLUTION;
    private static spriteDistance = SPRITE_DISTANCE;

    protected sprite: THREE.Sprite;
    protected light: THREE.Light;
    protected originDirection: THREE.Vector3;
    protected riseDirection: THREE.Vector3;
    protected downDirection: THREE.Vector3;
    protected texture: THREE.Texture;
    protected background: Background;

    public set opacity(opacity: number) {
        this.sprite.material.opacity = opacity;
    }

    protected constructor(position: THREE.Vector3, risePosition: THREE.Vector3, setPosition: THREE.Vector3) {
        super();

        this.originDirection = position.clone().normalize();
        this.riseDirection = risePosition.clone().normalize();
        this.downDirection = setPosition.clone().normalize();
    }

    public setDirection(direction: THREE.Vector3) {
        const normalizedDirection = direction.clone().normalize();

        if (this.light) {
            this.light.position.set(normalizedDirection.x, normalizedDirection.y, normalizedDirection.z);
        }

        if (this.sprite) {
            this.sprite.position.set(normalizedDirection.x, normalizedDirection.y, normalizedDirection.z);
        }
    }

    public rise(duration: number, delay: number): this {
        this.setDirection(this.riseDirection);
        this.sprite.material.opacity = 0;

        const currentDirection = this.riseDirection.clone();
        const rotationAxis = getRotationAxis(currentDirection, this.originDirection);
        const varsObj = { angle: 0, opacity: 0 };

        animate(varsObj, { angle: -getAngle(this.originDirection, currentDirection), opacity: 1 }, duration, {
            delay,
            ease: Power1.easeOut,
            onUpdate: () => {
                this.setDirection(currentDirection.clone().applyAxisAngle(rotationAxis, varsObj.angle));
                this.opacity = varsObj.opacity;
            },
        });

        return this;
    }

    public set(duration: number, delay: number): this {
        const currentDirection = this.sprite.position.clone();
        const rotationAxis = getRotationAxis(currentDirection, this.downDirection);
        const varsObj = { angle: 0, opacity: this.sprite.material.opacity };

        animate(varsObj, { angle: -getAngle(this.downDirection, currentDirection), opacity: 0 }, duration, {
            delay,
            ease: Power1.easeIn,
            onUpdate: () => {
                this.setDirection(currentDirection.clone().applyAxisAngle(rotationAxis, varsObj.angle));
                this.opacity = varsObj.opacity;
            },
        });

        return this;
    }

    public startSimulation() {
        return this;
    }

    public stopSimulation() {
        return this;
    }

    public addTo(scene: THREE.Scene) {
        scene.add(this.light);

        if (process.env.NODE_ENV === "development" && this.light && this.light instanceof THREE.DirectionalLight) {
            scene.add(new THREE.DirectionalLightHelper(this.light));
        }

        return this;
    }

    public setBackground(background: Background): this {
        background.scene.add(this.sprite);
        this.background = background;

        return this;
    }

    protected abstract generateTexture();

    protected init(light: THREE.Light) {
        light.position.set(this.originDirection.x, this.originDirection.y, this.originDirection.z);
        this.light = light;
        this.objects.push(light);

        this.generateTexture();
        this.initSprite();

        return this;
    }

    protected initSprite() {
        const material = new THREE.SpriteMaterial({ map: this.texture });

        (material as any).sizeAttenuation = false;
        this.sprite = new THREE.Sprite(material);

        const position = this.originDirection.clone().normalize().multiplyScalar(CelestialBody.spriteDistance);

        this.sprite.scale.set(.1, .1, 1);
        this.sprite.position.set(position.x, position.y, position.z);
    }
}
