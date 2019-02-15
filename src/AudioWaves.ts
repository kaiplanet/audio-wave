import { Power1 } from "gsap/all";
import * as THREE from "three";

import Background from "./objects/Background";
import Moon from "./objects/celestialBodies/Moon";
import Sun from "./objects/celestialBodies/Sun";
import Water from "./objects/Water";

import { animate } from "./utils";

interface IAudioWaves {
    init(width: number, height: number): this;
    mount(mountPoint: HTMLElement): HTMLElement;
    start(): this;
    stop(): this;
    generateWave(sourceTexture: ImageData, position: { x: number, y: number }): this;
    switchToDay(): this;
    switchToNight(): this;
}

const NIGHT_BRIGHTNESS = .2;
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
    private background: Background;
    private sun: Sun;
    private moon: Moon;
    private hemisphereLight: THREE.HemisphereLight;
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

        this.camera = new THREE.PerspectiveCamera(45, width / height, .1, 1000);
        this.camera.position.set(0, 60, 430);
        this.camera.lookAt(this.scene.position);

        this.hemisphereLight = new THREE.HemisphereLight( 0xfff2e4, 0x080820, .2);
        this.scene.add(this.hemisphereLight);

        this.background = new Background(this.renderer, { brightness: NIGHT_BRIGHTNESS });
        this.background.addTo(this.scene);
        this.background.load();

        this.sun = new Sun(SUN_DIRECTION, SUN_RISE_DIRECTION, SUN_SET_DIRECTION);
        this.sun.setPosition(SUN_RISE_DIRECTION);
        this.sun.addTo(this.scene);
        this.moon = new Moon(MOON_DIRECTION, MOON_RISE_DIRECTION, MOON_SET_DIRECTION);
        this.moon.addTo(this.scene);

        this.water = new Water(this.renderer);
        this.water.addTo(this.scene, new THREE.Vector3(0, 0, 0), this.camera);

        return this;
    }

    public mount(mountPoint: HTMLElement) {
        mountPoint.appendChild(this.renderer.domElement);

        return mountPoint;
    }

    // TODO: remove later
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
        animate(this.background, { brightness: 1 }, 2, { delay: 1, ease: Power1.easeOut });
        this.sun.rise();
        this.moon.set();
        animate(this.hemisphereLight, { intensity: 1 }, 2, { delay: 1, ease: Power1.easeOut });

        return this;
    }

    public switchToNight() {
        animate(this.background, { brightness: NIGHT_BRIGHTNESS }, 2, { delay: 1, ease: Power1.easeOut });
        this.sun.set();
        this.moon.rise();
        animate(this.hemisphereLight, { intensity: NIGHT_BRIGHTNESS }, 4, { ease: Power1.easeIn });

        return this;
    }
}
