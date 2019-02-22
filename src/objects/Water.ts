import * as THREE from "three";

import Object from "./Object";

import { WATER_OBSTACLE_MAP } from "../assets/assets";
import { waterNormalMapShaderLib, waterShaderLib } from "../shaders/ShaderLib";

import { loadTexture } from "../utils";

const WAVE_SPEED = 60 * .637731533050537209295072216; // Pixel per millisecond.
const RESISTANCE_FACTOR = 0.01;
const BOTTOM_HEIGHT = 6000;

const TEXTURE_WITDH = 512;
const TEXTURE_HEIGHT = 512;
const EXTERNAL_COORDS_ORIGIN_X = TEXTURE_WITDH / 2;
const EXTERNAL_COORDS_ORIGIN_Y = TEXTURE_HEIGHT / 2;

const WIDTH = 600;
const HEIGHT = 600;
const RESOLUTION = 512;
const PLANE_NORMAL = new THREE.Vector3(0, 1, 0);
const FRESNEL_REFLECTION_RATE = .5;
const DEFAULT_WATER_COLOR = new THREE.Color(0x002c4c);

interface IOptions {
    color?: THREE.Color;
    brightness?: number;
}

export default class extends Object {
    public color: THREE.Color;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.Camera;
    private plane: THREE.Mesh;
    private active = false;
    private bufferTargets: THREE.WebGLRenderTarget[];
    private activeBufferTargetIndex: number;
    private bufferContext: WebGLRenderingContext;
    private bufferRenderer: THREE.WebGLRenderer;
    private bufferScene: THREE.Scene;
    private bufferSceneCamera: THREE.Camera;
    private bufferMaterial: THREE.ShaderMaterial;
    private obstacleMap: THREE.Texture;
    private mirrorScene: THREE.Scene;
    private mirrorTarget: THREE.WebGLRenderTarget;
    private mirrorCamera: THREE.Camera;
    private readonly reflectMatrix: THREE.Matrix4;
    private readonly mirrorTextureMatrix: THREE.Matrix4;
    private clock: THREE.Clock;

    public set brightness(brightness: number) {
        this.plane.material.uniforms.waterColor.value = this.color.multiplyScalar(brightness);
    }

    constructor(renderer: THREE.WebGLRenderer, { color = DEFAULT_WATER_COLOR, brightness = 1 }: IOptions = {}) {
        super();

        this.color = color;
        this.reflectMatrix = new THREE.Matrix4();
        this.mirrorTextureMatrix = new THREE.Matrix4();
        this.init(renderer, { brightness });
    }

    public addTo(scene: THREE.Scene, position: THREE.Vector3, camera: THREE.Camera) {
        this.mirrorScene = scene;
        this.camera = camera;
        this.mirrorCamera = camera.clone();

        const distanceToOrigin = position.y;
        const n = PLANE_NORMAL;

        this.reflectMatrix.set(
            1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, -2 * distanceToOrigin * n.x,
            -2 * n.x * n.y, 1 - 2 * n.y * n.y, -2 * n.y * n.z, -2 * distanceToOrigin * n.y,
            -2 * n.x * n.z, -2 * n.y * n.z, 1 - 2 * n.z * n.z, -2 * distanceToOrigin * n.z,
            0, 0, 0, 1,
        );

        return super.addTo(scene, position);
    }

    public startSimulation() {
        if (this.active) {
            return;
        }

        const waveSimulationTick = (clockDelta) => {
            const MAX_DELTA = 1 / 60;

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

            this.bufferRenderer.render(this.bufferScene, this.bufferSceneCamera, this.getActiveBufferTarget());

            // TODO: Currently need canvas to pass texture between scenes,
            // remove from product env when better method found.
            // if (process.env.NODE_ENV === "development") {
            this.bufferRenderer.render(this.bufferScene, this.bufferSceneCamera);
            // }

            this.plane.material.uniforms.normalMap.value.needsUpdate = true;
            this.swapActiveBufferTargets();
        };

        const tick = () => {
            const delta = this.clock.getDelta();

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
        const textureUnit = this.bufferRenderer.properties.get(this.getBufferMap()).__webglTexture;

        if (!textureUnit) {
            return;
        }

        const buffer = new Uint8Array(sourceTexture.width * sourceTexture.height * 4);

        this.bufferRenderer.readRenderTargetPixels(
            this.bufferTargets[this.getBufferMapIndex()],
            TEXTURE_WITDH / 2 + TEXTURE_WITDH / 2 * position.x - sourceTexture.width / 2,
            TEXTURE_HEIGHT / 2 + TEXTURE_HEIGHT / 2 * position.y - sourceTexture.height / 2,
            sourceTexture.width,
            sourceTexture.height,
            buffer,
        );

        const texture = new ImageData(Uint8ClampedArray.from(buffer).map((value, index) => {
            if (index % 4 === 3) {
                return value + sourceTexture.data[index] - 128;
            }

            return value;
        }), sourceTexture.width, sourceTexture.height);

        const ctx = this.bufferContext;
        const activeTextureUnit = ctx.getParameter(ctx.TEXTURE_BINDING_2D);

        ctx.bindTexture(ctx.TEXTURE_2D, textureUnit);

        ctx.texSubImage2D(
            ctx.TEXTURE_2D,
            0,
            TEXTURE_WITDH / 2 + TEXTURE_WITDH / 2 * position.x - sourceTexture.width / 2,
            TEXTURE_HEIGHT / 2 + TEXTURE_HEIGHT / 2 * position.y - sourceTexture.height / 2,
            ctx.RGBA,
            ctx.UNSIGNED_BYTE,
            texture,
        );

        ctx.bindTexture(ctx.TEXTURE_2D, activeTextureUnit);
    }

    // TODO: remove later
    public mountTexture(mountPoint: HTMLElement) {
        mountPoint.appendChild(this.bufferRenderer.domElement);

        return mountPoint;
    }

    protected init(renderer: THREE.WebGLRenderer, { brightness }: { brightness: number }) {
        this.renderer = renderer;
        this.activeBufferTargetIndex = 0;

        const ctx = this.renderer.context;

        this.mirrorTarget = new THREE.WebGLRenderTarget(ctx.drawingBufferWidth, ctx.drawingBufferHeight, {
            format: THREE.RGBAFormat,
        });

        this.createPlane(brightness);
        this.initBufferScene();
        this.plane.material.uniforms.normalMap.value = new THREE.CanvasTexture(this.bufferRenderer.domElement);
        this.clock = new THREE.Clock();

        return this;
    }

    private createPlane(brightness: number): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, RESOLUTION, RESOLUTION);

        const eta = (1 + Math.sqrt(FRESNEL_REFLECTION_RATE)) / (1 - Math.sqrt(FRESNEL_REFLECTION_RATE));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                ...waterShaderLib.uniforms,
                eta: { type: "f", value: eta },
                map: { type: "t", value: this.mirrorTarget.texture },
                normalMap: { type: "t", value: null },
                textureMatrix: { type: "m4", value: this.mirrorTextureMatrix },
                waterColor: { type: "c", value: this.color.multiplyScalar(brightness) },
            },

            vertexShader: waterShaderLib.vertexShader,

            fragmentShader: waterShaderLib.fragmentShader,

            lights: true,
        });

        const plane = new THREE.Mesh(geometry, material);

        plane.rotation.set(Math.PI / -2, 0, 0);
        plane.receiveShadow = true;

        plane.onBeforeRender = () => {
            if (this.mirrorScene && this.mirrorCamera && this.mirrorTarget) {
                plane.visible = false;
                this.mirrorCamera.matrix = this.camera.matrix.clone();
                this.mirrorCamera.applyMatrix(this.reflectMatrix);

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

                const currentRenderTarget = this.renderer.getRenderTarget();
                const currentVrEnabled = this.renderer.vr.enabled;
                const currentShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;

                this.renderer.vr.enabled = false; // Avoid camera modification and recursion
                this.renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

                this.renderer.render(this.mirrorScene, this.mirrorCamera, this.mirrorTarget, true);

                this.renderer.vr.enabled = currentVrEnabled;
                this.renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
                this.renderer.setRenderTarget(currentRenderTarget);

                plane.visible = true;
            }
        };

        this.plane = plane;
        this.objects.push(plane);

        return plane;
    }

    private initBufferScene(): this {
        this.bufferRenderer = new THREE.WebGLRenderer({ alpha: true });
        this.bufferRenderer.setSize(TEXTURE_WITDH, TEXTURE_HEIGHT);

        const ctx = this.bufferContext = this.bufferRenderer.context;

        this.bufferTargets = new Array(3)
            .fill(null)
            .map(() => new THREE.WebGLRenderTarget(TEXTURE_WITDH, TEXTURE_HEIGHT, { format: THREE.RGBAFormat }));

        this.bufferScene = new THREE.Scene();

        this.bufferSceneCamera = new THREE.OrthographicCamera(
            TEXTURE_WITDH / -2, TEXTURE_WITDH / 2,
            TEXTURE_HEIGHT / 2, TEXTURE_HEIGHT / -2,
            0.1, 2);

        this.bufferSceneCamera.position.set(0, 1, 0);
        this.bufferSceneCamera.lookAt(this.bufferScene.position);

        const geometry = new THREE.PlaneGeometry(TEXTURE_WITDH, TEXTURE_HEIGHT, 1, 1);

        const textureData = new Uint8Array(TEXTURE_WITDH * TEXTURE_HEIGHT * 4).map((el, index) => {
            if (index % 4 === 3) {
                return 128;
            }

            return 0;
        });

        const texture = new THREE.DataTexture(
            textureData,
            TEXTURE_WITDH,
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
            },

            vertexShader: waterNormalMapShaderLib.vertexShader,

            fragmentShader: waterNormalMapShaderLib.fragmentShader,
        });

        this.bufferMaterial = material;

        const plane = new THREE.Mesh(geometry, material);

        plane.position.set(0, 0, 0);
        plane.rotation.set(-Math.PI / 2, 0, 0);
        this.bufferScene.add(plane);

        this.bufferTargets.forEach((target: THREE.WebGLRenderTarget) => {
            this.bufferRenderer.render(this.bufferScene, this.bufferSceneCamera, target);
        });

        const textureUnit = this.bufferRenderer.properties.get(this.getBufferMap()).__webglTexture;
        const activeTextureUnit = ctx.getParameter(ctx.TEXTURE_BINDING_2D);

        ctx.bindTexture(ctx.TEXTURE_2D, textureUnit);

        ctx.texImage2D(
            ctx.TEXTURE_2D,
            0,
            ctx.RGBA,
            TEXTURE_WITDH,
            TEXTURE_HEIGHT,
            0,
            ctx.RGBA,
            ctx.UNSIGNED_BYTE,
            null,
        );

        ctx.bindTexture(ctx.TEXTURE_2D, activeTextureUnit);

        this.bufferTargets.forEach((target: THREE.WebGLRenderTarget) => {
            this.bufferRenderer.render(this.bufferScene, this.bufferSceneCamera, target);
        });

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
