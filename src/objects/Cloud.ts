import * as THREE from "three";

import Object from "./Object";

import { cloudInitShaderLib, cloudShaderLib, cloudSimulationShaderLib } from "../shaders/ShaderLib";

import { cleanUpRendererContext, restoreRendererContext } from "../utils";

const getFloatString = (input: number) => {
    if (input < 1) {
        return String(input);
    }

    return String(input) + ".0";
};

export default class Cloud extends Object {
    private static TEXTURE_WIDTH = 128;
    private static TEXTURE_HEIGHT = 128;
    private static TEXTURE_DEPTH = 128;
    private static CONDENSE_HEAT_THRESHOLD = .2;

    public set lights(lights: THREE.Light[]) {
        const directionalLights = lights.filter((light) => light instanceof THREE.DirectionalLight);

        if (this.directionLightNumber !== directionalLights.length) {
            this.directionLightNumber = directionalLights.length;
            this.initSimulationBufferScene();
            this.initRenderingBufferScene();
            this.spriteMaterial.map = this.renderingBufferTarget.texture;
        }

        this.simulationShaderMaterial.uniforms.directionalLights.value = directionalLights;
        this.renderingShaderMaterial.uniforms.directionalLights.value = directionalLights;
    }

    private readonly renderer;
    private directionLightNumber = 0;
    private sprite: THREE.Sprite;
    private spriteMaterial: THREE.SpriteMaterial;
    private spriteMatrixWorldInverse = new THREE.Matrix4();
    private activeSimulationBufferTargetIndex = 0;
    private renderingBufferTarget: THREE.WebGLRenderTarget;
    private renderingScene: THREE.Scene;
    private renderingSceneCamera: THREE.Camera;
    private renderingShaderMaterial: THREE.ShaderMaterial;
    private simulationBufferTargets: THREE.WebGLRenderTarget[];
    private simulationScene: THREE.Scene;
    private simulationSceneCamera: THREE.Camera;
    private simulationScenePlane: THREE.Mesh;
    private simulationShaderMaterial: THREE.ShaderMaterial;

    private get activeSimulationBufferTarget() {
        return this.simulationBufferTargets[this.activeSimulationBufferTargetIndex];
    }

    private get simulationBufferMapIndex() {
        if (this.activeSimulationBufferTargetIndex === 0) {
            return this.simulationBufferTargets.length - 1;
        }

        return this.activeSimulationBufferTargetIndex - 1;
    }

    private get simulationBufferMap() {
        return this.simulationBufferTargets[this.simulationBufferMapIndex].texture;
    }

    private get simulationBufferMapLastIndex() {
        if (this.simulationBufferMapIndex === 0) {
            return this.simulationBufferTargets.length - 1;
        }

        return this.simulationBufferMapIndex - 1;
    }

    private get simulationBufferMapLast() {
        return this.simulationBufferTargets[this.simulationBufferMapLastIndex].texture;
    }

    private active = false;

    constructor(renderer: THREE.WebGLRenderer) {
        super();

        this.renderer = renderer;
        this.initSprite();
        this.initSimulationBufferScene();
        this.initRenderingBufferScene();
        this.spriteMaterial.map = this.renderingBufferTarget.texture;
    }

    public startSimulation() {
        if (this.active) {
            return;
        }

        const simulationTick = () => {
            this.simulationShaderMaterial.uniforms.bufferMap.value = this.simulationBufferMap;
            this.simulationShaderMaterial.uniforms.bufferMapLast.value = this.simulationBufferMapLast;

            const rendererContext = cleanUpRendererContext(this.renderer);

            this.renderer.render(this.simulationScene, this.simulationSceneCamera, this.activeSimulationBufferTarget);
            this.renderingShaderMaterial.uniforms.flattened3DMap.value = this.activeSimulationBufferTarget.texture;
            this.swapActiveSimulationBufferTargets();
            this.renderer.render(this.renderingScene, this.renderingSceneCamera, this.renderingBufferTarget);
            restoreRendererContext(this.renderer, rendererContext);
        };

        const tick = () => {
            if (this.active) {
                simulationTick();
                requestAnimationFrame(tick);
            }
        };

        this.active = true;
        requestAnimationFrame(tick);

        return this;
    }

    public stopSimulation() {
        this.active = false;

        return this;
    }

    private initSprite(): void {
        const material = new THREE.SpriteMaterial({ map: null });

        if (Reflect.has(material, "sizeAttenuation")) {
            (material as any).sizeAttenuation = false;
        }

        this.spriteMaterial = material;
        this.sprite = new THREE.Sprite(material);
        this.sprite.scale.set(.3, .1, .3);
        this.objects.push(this.sprite);
        this.spriteMatrixWorldInverse.getInverse(this.sprite.matrixWorld);
    }

    private initRenderingBufferScene(): this {
        this.renderingBufferTarget = new THREE.WebGLRenderTarget(Cloud.TEXTURE_WIDTH, Cloud.TEXTURE_HEIGHT);
        this.renderingScene = new THREE.Scene();

        this.renderingSceneCamera = new THREE.OrthographicCamera(
            Cloud.TEXTURE_WIDTH / -2, Cloud.TEXTURE_WIDTH / 2,
            Cloud.TEXTURE_HEIGHT / 2, Cloud.TEXTURE_HEIGHT / -2,
            0.1, 2);

        this.renderingSceneCamera.position.set(0, 1, 0);
        this.renderingSceneCamera.lookAt(this.renderingScene.position);

        const geometry = new THREE.PlaneGeometry(Cloud.TEXTURE_WIDTH, Cloud.TEXTURE_HEIGHT, 1, 1);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                ...cloudShaderLib.uniforms,
                directionalLights: {
                    properties: {
                        color: {},
                        intensity: 0,
                        position: {},
                    },

                    value: new Array(this.directionLightNumber).fill(null).map(() => ({
                        color: new THREE.Color(),
                        intensity: 1,
                        position: new THREE.Vector3(),
                    })),
                },
                flattened3DMap: { type: "t", value: null },
                matrixWorldInverse: { type: "m4", value: this.spriteMatrixWorldInverse },
            },

            vertexShader: cloudShaderLib.vertexShader.replace(/TEXTURE_DEPTH/g, getFloatString(Cloud.TEXTURE_DEPTH)),

            fragmentShader: cloudShaderLib.fragmentShader
                .replace(/TEXTURE_DEPTH/g, getFloatString(Cloud.TEXTURE_DEPTH))
                .replace(/NUM_DIR_LIGHTS/g, String(this.directionLightNumber))
                .replace(/CONDENSE_HEAT_THRESHOLD/g, getFloatString(Cloud.CONDENSE_HEAT_THRESHOLD)),
        });

        this.renderingShaderMaterial = material;

        const plane = new THREE.Mesh(geometry, material);

        plane.position.set(0, 0, 0);
        plane.rotation.set(-Math.PI / 2, 0, 0);
        this.renderingScene.add(plane);

        return this;
    }

    private initSimulationBufferScene(): this {
        const textureWidth = Cloud.TEXTURE_WIDTH * Cloud.TEXTURE_DEPTH;
        const ctx = this.renderer.context;

        this.simulationBufferTargets = new Array(3)
            .fill(null)
            .map(() => new THREE.WebGLRenderTarget(textureWidth, Cloud.TEXTURE_HEIGHT));

        this.simulationScene = new THREE.Scene();

        this.simulationSceneCamera = new THREE.OrthographicCamera(
            textureWidth / -2, textureWidth / 2,
            Cloud.TEXTURE_HEIGHT / 2, Cloud.TEXTURE_HEIGHT / -2,
            0.1, 2);

        this.simulationSceneCamera.position.set(0, 1, 0);
        this.simulationSceneCamera.lookAt(this.simulationScene.position);

        const geometry = new THREE.PlaneGeometry(textureWidth, Cloud.TEXTURE_HEIGHT, 1, 1);
        const texture = this.initBufferMap();

        texture.needsUpdate = true;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                ...cloudSimulationShaderLib.uniforms,
                bufferMap: { type: "t", value: texture },
                bufferMapLast: { type: "t", value: texture },
                directionalLights: {
                    properties: {
                        color: {},
                        intensity: 0,
                        position: {},
                    },
                    value: new Array(this.directionLightNumber).fill(null).map(() => ({
                        color: new THREE.Color(),
                        intensity: 1,
                        position: new THREE.Vector3(),
                    })),
                },
                matrixWorldInverse: { type: "m4", value: this.spriteMatrixWorldInverse },
            },

            vertexShader: cloudSimulationShaderLib.vertexShader,

            fragmentShader: cloudSimulationShaderLib.fragmentShader
                .replace(/TEXTURE_DEPTH/g, getFloatString(Cloud.TEXTURE_DEPTH))
                .replace(/TEXTURE_WIDTH/g, getFloatString(Cloud.TEXTURE_WIDTH))
                .replace(/TEXTURE_HEIGHT/g, getFloatString(Cloud.TEXTURE_HEIGHT))
                .replace(/NUM_DIR_LIGHTS/g, String(this.directionLightNumber))
                .replace(/CONDENSE_HEAT_THRESHOLD/g, getFloatString(Cloud.CONDENSE_HEAT_THRESHOLD)),
        });

        this.simulationShaderMaterial = material;

        const plane = this.simulationScenePlane = new THREE.Mesh(geometry, material);

        plane.position.set(0, 0, 0);
        plane.rotation.set(-Math.PI / 2, 0, 0);
        this.simulationScene.add(plane);

        const rendererContext = cleanUpRendererContext(this.renderer);

        this.simulationBufferTargets.forEach((target: THREE.WebGLRenderTarget) => {
            this.renderer.render(this.simulationScene, this.simulationSceneCamera, target);
        });

        restoreRendererContext(this.renderer, rendererContext);

        return this;
    }

    private swapActiveSimulationBufferTargets() {
        if (this.activeSimulationBufferTargetIndex === this.simulationBufferTargets.length - 1) {
            this.activeSimulationBufferTargetIndex = 0;
        } else {
            this.activeSimulationBufferTargetIndex += 1;
        }

        return this;
    }

    private initBufferMap(): THREE.Texture {
        const textureWidth = Cloud.TEXTURE_WIDTH * Cloud.TEXTURE_DEPTH;
        const scene = new THREE.Scene();

        const camera = new THREE.OrthographicCamera(
            textureWidth / -2, textureWidth / 2,
            Cloud.TEXTURE_HEIGHT / 2, Cloud.TEXTURE_HEIGHT / -2,
            0.1, 2);

        camera.position.set(0, 1, 0);
        camera.lookAt(scene.position);

        const geometry = new THREE.PlaneGeometry(textureWidth, Cloud.TEXTURE_HEIGHT, 1, 1);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                ...cloudInitShaderLib.uniforms,
            },

            vertexShader: cloudInitShaderLib.vertexShader,

            fragmentShader: cloudInitShaderLib.fragmentShader
                .replace(/TEXTURE_DEPTH/g, getFloatString(Cloud.TEXTURE_DEPTH))
                .replace(/CONDENSE_HEAT_THRESHOLD/g, getFloatString(Cloud.CONDENSE_HEAT_THRESHOLD)),
        });

        const plane = new THREE.Mesh(geometry, material);

        plane.position.set(0, 0, 0);
        plane.rotation.set(-Math.PI / 2, 0, 0);
        scene.add(plane);

        const renderTarget = new THREE.WebGLRenderTarget(textureWidth, Cloud.TEXTURE_HEIGHT);
        const rendererContext = cleanUpRendererContext(this.renderer);

        this.renderer.render(scene, camera, renderTarget);
        restoreRendererContext(this.renderer, rendererContext);

        return renderTarget.texture;
    }
}
