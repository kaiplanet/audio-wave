import * as THREE from "three";

import Object from "./Object";

import { loadTexture } from "../utils";

import * as assets from "../assets/assets";
import { backgroundShaderLib } from "../shaders/ShaderLib";

interface IOptions {
    alpha?: number;
    brightness?: number;
}

export default class extends Object {
    public scene: THREE.Scene;

    public get alpha() {
        return this.cube.material[0].uniforms.alpha.value;
    }

    public set alpha(alpha: number) {
        if (this.cube.material instanceof Array) {
            this.cube.material.forEach((material: THREE.ShaderMaterial) => {
                material.uniforms.alpha.value = alpha;
            });
        }
    }

    public get brightness() {
        return this.cube.material[0].uniforms.brightness.value;
    }

    public set brightness(brightness: number) {
        if (this.cube.material instanceof Array) {
            this.cube.material.forEach((material) => {
                (material as any).uniforms.brightness.value = brightness;
            });
        }
    }

    private renderer: THREE.WebGLRenderer;
    private camera: THREE.CubeCamera;
    private cube: THREE.Mesh;

    constructor(renderer: THREE.WebGLRenderer, options = {}) {
        super();

        this.init(renderer, options);
    }

    public addTo(scene: THREE.Scene) {
        (scene.background as any) = this.camera.renderTarget;

        return this;
    }

    public startSimulation() {
        return this;
    }

    public stopSimulation() {
        return this;
    }

    public async load() {
        await Promise.all([[
            assets.BACKGROUND_DAY_PX, assets.BACKGROUND_DAY_NX,
            assets.BACKGROUND_DAY_PY, assets.BACKGROUND_DAY_NY,
            assets.BACKGROUND_DAY_PZ, assets.BACKGROUND_DAY_NZ,
        ], [
            assets.BACKGROUND_NIGHT_PX, assets.BACKGROUND_NIGHT_NX,
            assets.BACKGROUND_NIGHT_PY, assets.BACKGROUND_NIGHT_NY,
            assets.BACKGROUND_NIGHT_PZ, assets.BACKGROUND_NIGHT_NZ,
        ]].map(async (set, setIndex) => {
            await Promise.all(set.map(async (path, textureIndex) => {
                this.cube.material[textureIndex].uniforms[`map${setIndex}`].value = await loadTexture(path);
            }));
        }));

        this.update();
    }

    public update() {
        this.camera.update(this.renderer, this.scene);
    }

    protected init(renderer: THREE.WebGLRenderer, { alpha = 1, brightness = 1 }: IOptions) {
        this.renderer = renderer;
        this.scene = new THREE.Scene();

        this.camera = new THREE.CubeCamera(.1, 10, 1280);
        this.camera.position.set(0, 0, 0);

        const geometry = new THREE.BoxGeometry(10, 10, 10);

        const materialArray = new Array(6).fill(null).map(() => new THREE.ShaderMaterial({
            uniforms: {
                ...backgroundShaderLib.uniforms,
                alpha: { type: "f", value: alpha },
                brightness: { type: "f", value: brightness },
                map0: { type: "t", value: null },
                map1: { type: "t", value: null },
            },

            vertexShader: backgroundShaderLib.vertexShader,

            fragmentShader: backgroundShaderLib.fragmentShader,

            side: THREE.BackSide,
        }));

        this.cube = new THREE.Mesh(geometry, materialArray);
        this.cube.position.set(0, 0, 0);
        this.cube.rotation.set(0, Math.PI * -.1, 0);
        this.scene.add(this.cube);
    }
}
