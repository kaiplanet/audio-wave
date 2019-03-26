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

interface ICelestialBody {
    opacity: number;
    setDirection(direction: THREE.Vector3): this;
    rise(duration: number, delay: number): this;
    set(duration: number, delay: number): this;
    setBackground(background: Background): this;
}

interface IOptions {
    intensity?: number;
}

export default abstract class CelestialBody extends Object implements ICelestialBody {
    protected static textureResolution = TEXTURE_RESOLUTION;
    private static spriteDistance = SPRITE_DISTANCE;
    protected intensity: number;
    protected sprite: THREE.Sprite;
    protected spriteMaterial: THREE.SpriteMaterial;
    protected light: THREE.Light;
    protected originDirection: THREE.Vector3;
    protected riseDirection: THREE.Vector3;
    protected downDirection: THREE.Vector3;
    protected background: Background;

    public set opacity(opacity) {
        this.sprite.material.opacity = opacity;

        if (this.light) {
            this.light.intensity = this.intensity * opacity;
        }
    }

    public get opacity() {
        return this.sprite.material.opacity;
    }

    protected constructor(position: THREE.Vector3, risePosition: THREE.Vector3, setPosition: THREE.Vector3,
                          { intensity = 1 }: IOptions = {}) {
        super();

        this.originDirection = position.clone().normalize();
        this.riseDirection = risePosition.clone().normalize();
        this.downDirection = setPosition.clone().normalize();
        this.intensity = intensity;
    }

    public setDirection(direction) {
        const normalizedDirection = direction.clone().normalize();

        if (this.light) {
            this.light.position.set(normalizedDirection.x, normalizedDirection.y, normalizedDirection.z);
        }

        if (this.sprite) {
            this.sprite.position.set(normalizedDirection.x, normalizedDirection.y, normalizedDirection.z);
        }

        return this;
    }

    public rise(duration, delay) {
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

    public set(duration, delay) {
        const currentDirection = this.sprite.position.clone();
        const rotationAxis = getRotationAxis(currentDirection, this.downDirection);
        const varsObj = { angle: 0, opacity: this.opacity };

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

    public addTo(scene) {
        scene.add(this.light);

        if (process.env.NODE_ENV === "development" && this.light && this.light instanceof THREE.DirectionalLight) {
            scene.add(new THREE.DirectionalLightHelper(this.light));
        }

        return this;
    }

    public setBackground(background) {
        background.scene.add(this.sprite);
        this.background = background;

        return this;
    }

    protected abstract loadTexture();

    protected init(light: THREE.Light) {
        light.position.set(this.originDirection.x, this.originDirection.y, this.originDirection.z);
        light.intensity = this.intensity;
        this.light = light;
        this.objects.push(light);

        this.initSprite();
        this.loadTexture();

        return this;
    }

    protected initSprite() {
        const material = new THREE.SpriteMaterial({ map: null });

        (material as any).sizeAttenuation = false;
        this.spriteMaterial = material;
        this.sprite = new THREE.Sprite(material);

        const position = this.originDirection.clone().normalize().multiplyScalar(CelestialBody.spriteDistance);

        this.sprite.scale.set(.1, .1, 1);
        this.sprite.position.set(position.x, position.y, position.z);
    }
}
