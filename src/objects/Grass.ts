import * as THREE from "three";

import Object from "./Object";

import { GRASS_MATERIAL, GRASS_OBJECT, GRASS_TEXTURE } from "../assets/assets";

import { grassShaderLib } from "../shaders/ShaderLib";
import { loadDDSTexture, loadOBJMTLModel } from "../utils";

const OFFSET_Y = 10;

export default class extends Object {
    private mesh: THREE.Mesh;
    private scene: THREE.Scene;
    private position: THREE.Vector3;

    constructor() {
        super();

        this.init();
    }

    public addTo(scene: THREE.Scene, position?: THREE.Vector3) {
        if (position) {
            position.setComponent(1, position.y + OFFSET_Y);
        }

        if (this.objects.length) {
            return super.addTo(scene, position);
        }

        this.scene = scene;
        this.position = position;

        return this;
    }

    public startSimulation() {
        return this;
    }

    public stopSimulation() {
        return this;
    }

    protected async init() {
        const grassTexturePromise  = loadDDSTexture(GRASS_TEXTURE);
        const grassModelPromise = loadOBJMTLModel(GRASS_OBJECT, GRASS_MATERIAL);
        const grassModel = ((await grassModelPromise).children[1] as THREE.Mesh);

        const grassMaterial = new THREE.ShaderMaterial({
            uniforms: {
                ...grassShaderLib.uniforms,
                map: { type: "t", value: await grassTexturePromise },
                specular: { type: "c", value: (grassModel.material as THREE.MeshPhongMaterial).specular },
            },

            fragmentShader: grassShaderLib.fragmentShader,

            vertexShader: grassShaderLib.vertexShader,

            lights: true,
        });

        grassMaterial.transparent = true;
        grassMaterial.alphaTest = .1;
        grassMaterial.side = THREE.DoubleSide;
        grassMaterial.uniforms.map.value.needsUpdate = true;
        grassMaterial.needsUpdate = true;

        const mesh = new THREE.Mesh(grassModel.geometry, grassMaterial);

        this.mesh = mesh;
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.rotation.set(Math.PI, 0, 0);
        this.mesh.scale.set(.2, .2, .2);
        this.objects.push(mesh);

        if (this.scene && this.position) {
            super.addTo(this.scene, this.position);
        }

        return this;
    }
}
