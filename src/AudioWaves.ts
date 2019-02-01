import { Power1 } from "gsap/all";
import * as THREE from "three";

import Water from "./objects/Water";

import { animate } from "./utils";

import * as assets from "./assets/assets";

interface IAudioWaves {
    init(width: number, height: number): this;
    mount(mountPoint: HTMLElement): HTMLElement;
    start(): this;
    stop(): this;
    generateWave(sourceTexture: ImageData, position: { x: number, y: number }): this;
    switchToDay(): this;
}

const SUN_DIRECTION = new THREE.Vector3(-1, 1, -5);
const SUN_RISE_DIRECTION = new THREE.Vector3(-3, 0, -5);
const SUN_SET_DIRECTION = new THREE.Vector3(3, 0, -5);
const MOON_DIRECTION = new THREE.Vector3(0, 1, -5);
const MOON_RISE_DIRECTION = new THREE.Vector3(-3, 0, -5);
const MOON_SET_DIRECTION = new THREE.Vector3(3, 0, -5);

export default class implements IAudioWaves {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private sunLight: THREE.DirectionalLight;
    private moonLight: THREE.DirectionalLight;
    private active: boolean;

    private water: Water;

    public init(width: number, height: number) {
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();

        if (process.env.NODE_ENV === "development") {
            this.scene.add(new THREE.AxesHelper(20));
        }

        const loader = new THREE.CubeTextureLoader();

        this.scene.background = loader.load([
            assets.BACKGROUND_PX, assets.BACKGROUND_NX,
            assets.BACKGROUND_PY, assets.BACKGROUND_NY,
            assets.BACKGROUND_PZ, assets.BACKGROUND_NZ,
        ]);

        this.camera = new THREE.PerspectiveCamera(45, width / height, .1, 1000);
        this.camera.position.set(0, 60, 430);
        this.camera.lookAt(this.scene.position);

        this.scene.add(new THREE.AmbientLight(0x404040));

        this.initSunLight(SUN_RISE_DIRECTION);
        this.initMoonLight(MOON_DIRECTION);

        const water = new Water();

        water.addTo(this.scene, new THREE.Vector3(0, 0, 0));
        this.water = water;

        return this;
    }

    public mount(mountPoint: HTMLElement) {
        mountPoint.appendChild(this.renderer.domElement);

        return mountPoint;
    }

    public mountWaterTexture(mountPoint: HTMLElement) {
        return this.water.mountTexture(mountPoint);
    }

    public start() {
        this.active = true;
        this.water.startSimulation();

        const render = () => {
            if (this.active) {
                requestAnimationFrame(render);
            }

            this.renderer.render(this.scene, this.camera);
        };

        requestAnimationFrame(render);

        return this;
    }

    public stop() {
        this.water.stopSimulation();
        this.active = false;

        return this;
    }

    public generateWave(sourceTexture: ImageData, { x, y }: { x: number, y: number }) {
        this.water.generateWave(sourceTexture, new THREE.Vector2(x, y));

        return this;
    }

    public switchToDay() {
        this.riseSun();
        this.setMoon();

        return this;
    }

    public switchToNight() {
        this.setSun();
        this.riseMoon();

        return this;
    }

    private initSunLight(direction: THREE.Vector3): this {
        this.sunLight = new THREE.DirectionalLight(0xffe6cc, 1.5);
        this.sunLight.position.set(direction.x, direction.y, direction.z);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -500;
        this.sunLight.shadow.camera.right = 500;
        this.sunLight.shadow.camera.top = 500;
        this.sunLight.shadow.camera.bottom = -500;
        this.scene.add(this.sunLight);

        if (process.env.NODE_ENV === "development") {
            this.scene.add(new THREE.DirectionalLightHelper(this.sunLight));
        }

        return this;
    }

    private initMoonLight(direction: THREE.Vector3): this {
        this.moonLight = new THREE.DirectionalLight(0xe6f5ff, 10);
        this.moonLight.position.set(direction.x, direction.y, direction.z);
        this.moonLight.castShadow = true;
        this.moonLight.shadow.camera.near = 0.5;
        this.moonLight.shadow.camera.far = 500;
        this.moonLight.shadow.camera.left = -500;
        this.moonLight.shadow.camera.right = 500;
        this.moonLight.shadow.camera.top = 500;
        this.moonLight.shadow.camera.bottom = -500;
        this.scene.add(this.moonLight);

        if (process.env.NODE_ENV === "development") {
            this.scene.add(new THREE.DirectionalLightHelper(this.moonLight));
        }

        return this;
    }

    private riseSun(): this {
        this.sunLight.position.set(SUN_RISE_DIRECTION.x, SUN_RISE_DIRECTION.y, SUN_RISE_DIRECTION.z);
        animate(this.sunLight.position, SUN_DIRECTION, 2, Power1.easeOut);

        return this;
    }

    private setSun(): this {
        animate(this.sunLight.position, SUN_SET_DIRECTION, 4, Power1.easeIn);

        return this;
    }

    private riseMoon(): this {
        this.moonLight.position.set(MOON_RISE_DIRECTION.x, MOON_RISE_DIRECTION.y, MOON_RISE_DIRECTION.z);
        animate(this.moonLight.position, MOON_DIRECTION, 3, Power1.easeOut);

        return this;
    }

    private setMoon(): this {
        animate(this.moonLight.position, MOON_SET_DIRECTION, 3, Power1.easeIn);

        return this;
    }
}
