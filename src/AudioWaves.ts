import * as THREE from "three";

import Water from "./objects/Water";

interface IAudioWaves {
    init(width: number, height: number): IAudioWaves;
    mount(mountPoint: HTMLElement): HTMLElement;
    start(): IAudioWaves;
}

export default class implements IAudioWaves {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private light: THREE.DirectionalLight;
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

        this.scene.add(new THREE.AmbientLight(0x404040));

        this.light = new THREE.DirectionalLight(0xffe6cc, 1.5);
        this.light.position.set(0, 2, -10);
        this.light.castShadow = true;
        this.light.shadow.camera.near = 0.5;
        this.light.shadow.camera.far = 500;
        this.light.shadow.camera.left = -500;
        this.light.shadow.camera.right = 500;
        this.light.shadow.camera.top = 500;
        this.light.shadow.camera.bottom = -500;
        this.scene.add(this.light);

        if (process.env.NODE_ENV === "development") {
            this.scene.add(new THREE.DirectionalLightHelper(this.light));
        }

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
    }

    public generateWave(sourceTexture: ImageData, { x, y }: { x: number, y: number }) {
        this.water.generateWave(sourceTexture, new THREE.Vector2(x, y));
    }
}
