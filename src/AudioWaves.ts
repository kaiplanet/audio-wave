import { Power1 } from "gsap/all";
import * as THREE from "three";

import Controls from "./Controls";
import Background from "./objects/Background";
import Moon from "./objects/celestialBodies/Moon";
import Sun from "./objects/celestialBodies/Sun";
import Grass from "./objects/Grass";
import Water from "./objects/Water";

import { animate } from "./utils";

const DAY_BRIGHTNESS = .5;
const NIGHT_BRIGHTNESS = .15;
const SUN_DIRECTION = new THREE.Vector3(-2, 1.2, -8);
const SUN_RISE_DIRECTION = new THREE.Vector3(-3, 0, -5);
const SUN_SET_DIRECTION = new THREE.Vector3(3, 0, -5);
const SUN_INTENSITY = 3;
const MOON_DIRECTION = new THREE.Vector3(0, 1, -8);
const MOON_RISE_DIRECTION = new THREE.Vector3(-3, 0, -5);
const MOON_SET_DIRECTION = new THREE.Vector3(3, 0, -5);
const MOON_INTENSITY = .8;

interface IAudioWaves {
    init(width: number, height: number): Promise<this>;
    mount(mountPoint: HTMLElement): HTMLElement;
    start(): this;
    stop(): this;
    generateWave(sourceTexture: ImageData, position: { x: number, y: number }): this;
    switchToDay(): this;
    switchToNight(): this;
}

export default class implements IAudioWaves {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private water: Water;
    private background: Background;
    private sun: Sun;
    private moon: Moon;
    private hemisphereLight: THREE.HemisphereLight;
    private active: boolean;

    public async init(width: number, height: number) {
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();

        if (process.env.NODE_ENV === "development") {
            this.scene.add(new THREE.AxesHelper(20));
        }

        this.camera = new THREE.PerspectiveCamera(45, width / height, .1, 2000);
        this.camera.position.set(0, 50, 430);
        this.camera.lookAt(this.scene.position);

        this.hemisphereLight = new THREE.HemisphereLight(0xfff2e4, 0x080820, .2);
        this.scene.add(this.hemisphereLight);

        this.sun = new Sun(SUN_DIRECTION, SUN_RISE_DIRECTION, SUN_SET_DIRECTION, { intensity: SUN_INTENSITY });
        this.sun.setDirection(SUN_RISE_DIRECTION);
        this.sun.opacity = 0;
        this.sun.addTo(this.scene);
        this.moon = new Moon(MOON_DIRECTION, MOON_RISE_DIRECTION, MOON_SET_DIRECTION, { intensity: MOON_INTENSITY });
        this.moon.addTo(this.scene);

        this.background = new Background(this.renderer);
        this.background.alpha = 0;
        this.background.addTo(this.scene);
        this.background.load();
        this.sun.setBackground(this.background);
        this.moon.setBackground(this.background);
        this.background.update();

        this.water = new Water(this.renderer, { brightness: NIGHT_BRIGHTNESS });
        this.water.addTo(this.scene, new THREE.Vector3(0, 0, 0), this.camera);

        const grass = new Grass();

        grass.addTo(this.scene, new THREE.Vector3(60, 0, 250));

        const controls = new Controls({ rotateSpeed: .03, zoomSpeed: .01 });

        controls.connect(this.camera);
        controls.listen(window);

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
        if (this.active) {
            return;
        }

        this.active = true;

        const render = () => {
            if (this.active) {
                requestAnimationFrame(render);
            }

            this.renderer.render(this.scene, this.camera);
        };

        requestAnimationFrame(() => {
            render();
            this.water.startSimulation();
        });

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
        animate(this.background, { alpha: 1 }, 2, { delay: 1, ease: Power1.easeOut });
        this.sun.rise(2, 1);
        animate(this.hemisphereLight, { intensity: DAY_BRIGHTNESS }, 2, { delay: 1, ease: Power1.easeOut });
        animate(this.water, { brightness: DAY_BRIGHTNESS }, 2, { delay: 1, ease: Power1.easeOut });

        this.moon.set(3, 0);

        animate({}, {}, 3, { onUpdate: () => this.background.update() });

        return this;
    }

    public switchToNight() {
        animate(this.background, { alpha: 0 }, 2, { ease: Power1.easeOut });
        this.sun.set(2, 0);
        animate(this.hemisphereLight, { intensity: NIGHT_BRIGHTNESS }, 2, { ease: Power1.easeOut });
        animate(this.water, { brightness: NIGHT_BRIGHTNESS }, 2, { ease: Power1.easeOut });

        this.moon.rise(3, 1);

        animate({}, {}, 4, { onUpdate: () => this.background.update() });

        return this;
    }
}
