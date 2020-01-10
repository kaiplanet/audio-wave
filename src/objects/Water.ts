import * as THREE from "three";

import Object from "./Object";

import { WATER_OBSTACLE_MAP } from "../assets/assets";
import { waterNormalMapShaderLib, waterShaderLib } from "../shaders/ShaderLib";

import { cleanUpRendererContext, loadTexture, restoreRendererContext } from "../utils";

const WAVE_SPEED = 60 * .637731533050537209295072216; // Pixel per millisecond.
const RESISTANCE_FACTOR = 0.01;
const BOTTOM_HEIGHT = 6000;

const TEXTURE_WIDTH = 512;
const TEXTURE_HEIGHT = 512;
const EXTERNAL_COORDS_ORIGIN_X = TEXTURE_WIDTH / 2;
const EXTERNAL_COORDS_ORIGIN_Y = TEXTURE_HEIGHT / 2;

const WIDTH = 600;
const HEIGHT = 600;
const RESOLUTION = 512;
const PLANE_NORMAL = new THREE.Vector3(0, 1, 0);
const FRESNEL_REFLECTION_RATE = .36;
const DEFAULT_WATER_COLOR = new THREE.Color(0x002c4c);

let updateMirrorTextureSetting: (event?: Event) => void;

interface IOptions {
    color?: THREE.Color;
    brightness?: number;
}

export default class extends Object {
    public color: THREE.Color;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.Camera;
    private plane: THREE.Mesh;
    private planeMaterial: THREE.ShaderMaterial;
    private active = false;
    private bufferTargets: THREE.WebGLRenderTarget[];
    private activeBufferTargetIndex: number;
    private bufferContext: WebGLRenderingContext;
    private bufferScene: THREE.Scene;
    private bufferSceneCamera: THREE.Camera;
    private bufferMaterial: THREE.ShaderMaterial;
    private mirrorScene: THREE.Scene;
    private mirrorTarget: THREE.WebGLRenderTarget;
    private mirrorCamera: THREE.Camera;
    private privateBrightness: number;
    private readonly mirrorTextureMatrix: THREE.Matrix4;

    public get brightness() {
        return this.privateBrightness;
    }

    public set brightness(brightness: number) {
        this.privateBrightness = brightness;
        this.planeMaterial.uniforms.waterColor.value = this.color.clone().multiplyScalar(brightness);
    }

    constructor(renderer: THREE.WebGLRenderer, { color = DEFAULT_WATER_COLOR, brightness = 1 }: IOptions = {}) {
        super();

        this.color = color;
        this.mirrorTextureMatrix = new THREE.Matrix4();
        this.init(renderer, { brightness });
    }

    public addTo(scene: THREE.Scene, position: THREE.Vector3, camera: THREE.Camera) {
        this.mirrorScene = scene;
        this.camera = camera;
        this.mirrorCamera = camera.clone();

        const distanceToOrigin = position.y;
        const n = PLANE_NORMAL;
        const reflectMatrix = new THREE.Matrix4();

        reflectMatrix.set(
            1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, -2 * distanceToOrigin * n.x,
            -2 * n.x * n.y, 1 - 2 * n.y * n.y, -2 * n.y * n.z, -2 * distanceToOrigin * n.y,
            -2 * n.x * n.z, -2 * n.y * n.z, 1 - 2 * n.z * n.z, -2 * distanceToOrigin * n.z,
            0, 0, 0, 1,
        );

        if (updateMirrorTextureSetting) {
            this.camera.removeEventListener("move", updateMirrorTextureSetting);
        }

        updateMirrorTextureSetting = () => {
            this.mirrorCamera.matrix = this.camera.matrix.clone();
            this.mirrorCamera.applyMatrix(reflectMatrix);
            this.mirrorCamera.dispatchEvent({ type: "move" });

            // Update the texture matrix
            this.mirrorTextureMatrix.set(
                0.5, 0.0, 0.0, 0.5,
                0.0, 0.5, 0.0, 0.5,
                0.0, 0.0, 0.5, 0.5,
                0.0, 0.0, 0.0, 1.0,
            );

            this.mirrorTextureMatrix.multiply(this.mirrorCamera.projectionMatrix);
            this.mirrorTextureMatrix.multiply(this.mirrorCamera.matrixWorldInverse);
            this.mirrorTextureMatrix.multiply(this.plane.matrixWorld);
        };

        this.camera.addEventListener("move", updateMirrorTextureSetting);

        return super.addTo(scene, position);
    }

    public startSimulation() {
        if (this.active) {
            return;
        }

        const MAX_DELTA = 1 / 60;

        updateMirrorTextureSetting();

        const waveSimulationTick = (clockDelta) => {
            // const delta = clockDelta > MAX_DELTA ? MAX_DELTA : clockDelta;
            const delta = MAX_DELTA;

            const f1 = WAVE_SPEED * WAVE_SPEED * delta * delta;
            const f2 = 1 / (RESISTANCE_FACTOR * delta + 2);
            const k1 = (4 - 8 * f1) * f2;
            const k2 = (RESISTANCE_FACTOR * delta - 2) * f2;
            const k3 = 2 * f1 * f2;

            this.bufferMaterial.uniforms.k1.value = k1;
            this.bufferMaterial.uniforms.k2.value = k2;
            this.bufferMaterial.uniforms.k3.value = k3;
            this.bufferMaterial.uniforms.bufferMap.value = this.getBufferMap();
            this.bufferMaterial.uniforms.bufferMapLast.value = this.getBufferMapLast();

            const rendererContext = cleanUpRendererContext(this.renderer);

            this.renderer.render(this.bufferScene, this.bufferSceneCamera, this.getActiveBufferTarget());
            restoreRendererContext(this.renderer, rendererContext);
            this.planeMaterial.uniforms.normalMap.value = this.getActiveBufferTarget().texture;
            this.swapActiveBufferTargets();
        };

        const clock = new THREE.Clock();

        const tick = () => {
            const delta = clock.getDelta();

            waveSimulationTick(delta);

            if (this.active) {
                requestAnimationFrame(tick);
            }
        };

        this.active = true;
        tick();

        return this;
    }

    public stopSimulation() {
        this.active = false;

        return this;
    }

    /**
     * Generate a wave on the water face.
     * @param {ImageData} sourceTexture - The texture describing the shape of the wave source.
     * @param {THREE.Vector2} position - The position of wave source.
     *      Waves are generate on the water surface, use THREE.Vector2.
     *      The range of each component is from -1 to 1.
     */
    public generateWave(sourceTexture: ImageData, position: THREE.Vector2) {
        const width = sourceTexture.width;
        const height = sourceTexture.height;
        const texture = new THREE.DataTexture(Uint8Array.from(sourceTexture.data), width, height);

        texture.needsUpdate = true;
        this.bufferMaterial.uniforms.waveSourceMap.value = texture;

        const matrix = new THREE.Matrix3();

        matrix.set(
            TEXTURE_WIDTH / width, 0, 0,
            0, TEXTURE_HEIGHT / height, 0,
            0, 0, 1,
        );

        const translateMatrix = new THREE.Matrix3();

        translateMatrix.set(
            1, 0, (.5 + .5 * position.x) * (1 - TEXTURE_WIDTH / width),
            0, 1, (.5 + .5 * position.y) * (1 - TEXTURE_HEIGHT / height),
            0, 0, 1,
        );

        matrix.premultiply(translateMatrix);

        this.bufferMaterial.uniforms.waveSourceMatrix.value = matrix;
        this.bufferMaterial.uniforms.renderWaveSource.value = true;
        requestAnimationFrame(() => this.bufferMaterial.uniforms.renderWaveSource.value = false);
    }

    protected init(renderer: THREE.WebGLRenderer, { brightness }: { brightness: number }) {
        this.renderer = renderer;
        this.activeBufferTargetIndex = 0;

        const ctx = this.renderer.context;

        this.mirrorTarget = new THREE.WebGLRenderTarget(ctx.drawingBufferWidth, ctx.drawingBufferHeight, {
            format: THREE.RGBAFormat,
        });

        this.createPlane();
        this.brightness = brightness;
        this.initBufferScene();
        this.planeMaterial.uniforms.normalMap.value = this.getActiveBufferTarget().texture;
    }

    private createPlane(): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, RESOLUTION, RESOLUTION);

        const eta = (1 + Math.sqrt(FRESNEL_REFLECTION_RATE)) / (1 - Math.sqrt(FRESNEL_REFLECTION_RATE));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                ...waterShaderLib.uniforms,
                eta: { type: "f", value: eta },
                map: { type: "t", value: this.mirrorTarget.texture },
                matrixWorldInverse: { type: "m4", value: new THREE.Matrix4() },
                normalMap: { type: "t", value: null },
                textureMatrix: { type: "m4", value: this.mirrorTextureMatrix },
                vertexDistance: { type: "f", value: Math.max(WIDTH, HEIGHT) / RESOLUTION },
                waterColor: { type: "c", value: null },
            },

            vertexShader: waterShaderLib.vertexShader,

            fragmentShader: waterShaderLib.fragmentShader,

            lights: true,
        });

        const plane = new THREE.Mesh(geometry, material);

        plane.rotation.set(Math.PI / -2, 0, 0);
        plane.updateMatrixWorld(false);
        material.uniforms.matrixWorldInverse.value.getInverse(plane.matrixWorld);
        plane.receiveShadow = true;

        plane.onBeforeRender = () => {
            if (this.mirrorScene && this.mirrorCamera && this.mirrorTarget) {
                plane.visible = false;

                const rendererContext = cleanUpRendererContext(this.renderer);

                this.mirrorScene.dispatchEvent({ type: "beforeRender", currentTarget: this.mirrorCamera});
                this.renderer.render(this.mirrorScene, this.mirrorCamera, this.mirrorTarget, true);
                this.mirrorScene.dispatchEvent({ type: "beforeRender", currentTarget: this.camera });
                restoreRendererContext(this.renderer, rendererContext);
                plane.visible = true;
            }
        };

        this.plane = plane;
        this.planeMaterial = material;
        this.objects.push(plane);

        return plane;
    }

    private initBufferScene(): this {
        const ctx = this.bufferContext = this.renderer.context;

        this.bufferTargets = new Array(3)
            .fill(null)
            .map(() => new THREE.WebGLRenderTarget(TEXTURE_WIDTH, TEXTURE_HEIGHT));

        this.bufferScene = new THREE.Scene();

        this.bufferSceneCamera = new THREE.OrthographicCamera(
            TEXTURE_WIDTH / -2, TEXTURE_WIDTH / 2,
            TEXTURE_HEIGHT / 2, TEXTURE_HEIGHT / -2,
            0.1, 2);

        this.bufferSceneCamera.position.set(0, 1, 0);
        this.bufferSceneCamera.lookAt(this.bufferScene.position);

        const geometry = new THREE.PlaneGeometry(TEXTURE_WIDTH, TEXTURE_HEIGHT, 1, 1);

        const textureData = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4).map((el, index) => {
            if (index % 4 === 3) {
                return 128;
            }

            return 0;
        });

        const texture = new THREE.DataTexture(
            textureData,
            TEXTURE_WIDTH,
            TEXTURE_HEIGHT,
            THREE.RGBAFormat,
            THREE.UnsignedByteType,
            THREE.UVMapping,
            THREE.ClampToEdgeWrapping,
            THREE.ClampToEdgeWrapping,
            THREE.NearestFilter,
            THREE.NearestFilter,
        );

        texture.needsUpdate = true;

        const textureClone = texture.clone();

        textureClone.needsUpdate = true;

        const delta = 1 / 60;
        const f1 = WAVE_SPEED * WAVE_SPEED * delta * delta;
        const f2 = 1 / (RESISTANCE_FACTOR * delta + 2);
        const k1 = (4 - 8 * f1) * f2;
        const k2 = (RESISTANCE_FACTOR * delta - 2) * f2;
        const k3 = 2 * f1 * f2;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                ...waterNormalMapShaderLib.uniforms,
                bufferMap: { type: "t", value: texture },
                bufferMapLast: { type: "t", value: textureClone },
                height: { type: "f", value: BOTTOM_HEIGHT },
                k1: { type: "f", value: k1 },
                k2: {type: "f", value: k2 },
                k3: { type: "f", value: k3 },
                obstacleMap: { type: "t", value: null },
                renderWaveSource: { type: "b", value: false },
                waveSourceMap: { type: "t", value: null },
                waveSourceMatrix: { type: "m3", value: new THREE.Matrix3() },
            },

            vertexShader: waterNormalMapShaderLib.vertexShader,

            fragmentShader: waterNormalMapShaderLib.fragmentShader,
        });

        this.bufferMaterial = material;

        const plane = new THREE.Mesh(geometry, material);

        plane.position.set(0, 0, 0);
        plane.rotation.set(-Math.PI / 2, 0, 0);
        this.bufferScene.add(plane);

        const rendererContext = cleanUpRendererContext(this.renderer);

        this.bufferTargets.forEach((target: THREE.WebGLRenderTarget) => {
            this.renderer.render(this.bufferScene, this.bufferSceneCamera, target);
        });

        const textureUnit = this.renderer.properties.get(this.getBufferMap()).__webglTexture;
        const activeTextureUnit = ctx.getParameter(ctx.TEXTURE_BINDING_2D);

        ctx.bindTexture(ctx.TEXTURE_2D, textureUnit);

        ctx.texImage2D(
            ctx.TEXTURE_2D,
            0,
            ctx.RGBA,
            TEXTURE_WIDTH,
            TEXTURE_HEIGHT,
            0,
            ctx.RGBA,
            ctx.UNSIGNED_BYTE,
            null,
        );

        ctx.bindTexture(ctx.TEXTURE_2D, activeTextureUnit);

        this.bufferTargets.forEach((target: THREE.WebGLRenderTarget) => {
            this.renderer.render(this.bufferScene, this.bufferSceneCamera, target);
        });

        restoreRendererContext(this.renderer, rendererContext);
        this.loadObstacleMap();

        return this;
    }

    private swapActiveBufferTargets() {
        if (this.activeBufferTargetIndex === this.bufferTargets.length - 1) {
            this.activeBufferTargetIndex = 0;
        } else {
            this.activeBufferTargetIndex += 1;
        }

        return this;
    }

    private getActiveBufferTarget() {
        return this.bufferTargets[this.activeBufferTargetIndex];
    }

    private getBufferMapIndex() {
        if (this.activeBufferTargetIndex === 0) {
            return this.bufferTargets.length - 1;
        }

        return this.activeBufferTargetIndex - 1;
    }

    private getBufferMap() {
        return this.bufferTargets[this.getBufferMapIndex()].texture;
    }

    private getBufferMapLastIndex() {
        const bufferMapIndex = this.getBufferMapIndex();

        if (bufferMapIndex === 0) {
            return this.bufferTargets.length - 1;
        }

        return bufferMapIndex - 1;
    }

    private getBufferMapLast() {
        return this.bufferTargets[this.getBufferMapLastIndex()].texture;
    }

    private async loadObstacleMap() {
        this.bufferMaterial.uniforms.obstacleMap.value = await loadTexture(WATER_OBSTACLE_MAP);
    }
}
