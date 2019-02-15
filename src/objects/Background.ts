import * as THREE from "three";

import Object from "./Object";

import * as assets from "../assets/assets";
import { backgroundShaderLib } from "../shaders/ShaderLib";

export default class extends Object {
    public get brightness() {
        return this.cube.material[0].uniforms.brightness.value;
    }

    public set brightness(brightness: number) {
        this.cube.material.forEach((material) => {
            material.uniforms.brightness.value = brightness;
        });

        this.camera.update(this.renderer, this.scene);
    }

    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.CubeCamera;
    private cube: THREE.Mesh;

    constructor(renderer: THREE.WebGLRenderer, options) {
        super();

        this.init(renderer, options);
    }

    public addTo(scene: THREE.Scene) {
        scene.background = this.camera.renderTarget;

        return this;
    }

    public startSimulation() {
        return this;
    }

    public stopSimulation() {
        return this;
    }

    public async load() {
        const textureLoader = new THREE.TextureLoader();

        const loadTexture = (path: string) => {
            return new Promise((resolve, reject) => {
                textureLoader.load(path, (texture: THREE.Texture) => {
                    resolve(texture);
                }, null, (err) => {
                    reject(err);
                });

            });
        };

        await Promise.all([
            assets.BACKGROUND_PX, assets.BACKGROUND_NX,
            assets.BACKGROUND_PY, assets.BACKGROUND_NY,
            assets.BACKGROUND_PZ, assets.BACKGROUND_NZ,
        ].map(async (path, index) => {
            this.cube.material[index].uniforms.map.value = await loadTexture(path);
        }));

        this.camera.update(this.renderer, this.scene);
    }

    protected init(renderer: THREE.WebGLRenderer, { brightness }: { brightness: number }) {
        this.renderer = renderer;
        this.scene = new THREE.Scene();

        this.camera = new THREE.CubeCamera(.1, 1, 1280);
        this.camera.position.set(0, 0, 0);

        const geometry = new THREE.BoxGeometry(1, 1, 1);

        const materialArray = new Array(6).fill(null).map(() => new THREE.ShaderMaterial({
            uniforms: {
                ...backgroundShaderLib.uniforms,
                brightness: { type: "f", value: brightness },
                map: { type: "t", value: null },
            },

            vertexShader: backgroundShaderLib.vertexShader,

            fragmentShader: backgroundShaderLib.fragmentShader,

            side: THREE.BackSide,
        }));

        this.cube = new THREE.Mesh(geometry, materialArray);
        this.cube.position.set(0, 0, 0);
        this.scene.add(this.cube);

        return this;
    }
}
