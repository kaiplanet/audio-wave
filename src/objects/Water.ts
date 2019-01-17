import * as THREE from "three";
import { EffectComposer } from "three/examples/js/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/js/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/js/postprocessing/ShaderPass";
import { CopyShader } from "three/examples/js/shaders/CopyShader";

THREE.CopyShader = CopyShader;
THREE.RenderPass = ShaderPass;

import Body from "./Body";

import { waterNormalMapShaderLib, waterShaderLib } from "../shaders/ShaderLib";

const WAVE_SPEED = 60 * .707731533050537209295072216; // Pixel per millisecond.
const RESISTANCE_FACTOR = 0;
const BOTTOM_HEIGHT = 5500;

const TEXTURE_WITDH = 512;
const TEXTURE_HEIGHT = 512;
const EXTERNAL_COORDS_ORIGIN_X = TEXTURE_WITDH / 2;
const EXTERNAL_COORDS_ORIGIN_Y = TEXTURE_HEIGHT / 2;

const WIDTH = 600;
const HEIGHT = 600;
const RESOLUTION = 512;

export default class extends Body {
    private plane: THREE.Mesh;
    private active = false;
    private bufferTarget: THREE.WebGLRenderTarget;
    private bufferContext: WebGLRenderingContext;
    private bufferRenderer: THREE.WebGLRenderer;
    private bufferComposer: EffectComposer;
    private bufferScene: THREE.Scene;
    private bufferSceneCamera: THREE.Camera;
    private isSizeSet = false;
    private bufferMaterial: THREE.ShaderMaterial;
    private clock: THREE.Clock;

    constructor() {
        super();

        this.clock = new THREE.Clock();
    }

    public addTo(scene: THREE.scene, position: THREE.Vector3) {
        super.addTo(scene, position);

        return this;
    }

    public startSimulation() {
        if (this.active) {
            return;
        }

        const tick = () => {
            const MAX_DELTA = 1 / 60;

            let delta = this.clock.getDelta();

            // if (delta > MAX_DELTA) {
            delta = MAX_DELTA;
            // }

            const f1 = WAVE_SPEED * WAVE_SPEED * delta * delta;
            const f2 = 1 / (RESISTANCE_FACTOR * delta + 2);
            const k1 = (4 - 8 * f1) * f2;
            const k2 = (RESISTANCE_FACTOR * delta - 2) * f2;
            const k3 = 2 * f1 * f2;

            this.bufferMaterial.uniforms.k1.value = k1;
            this.bufferMaterial.uniforms.k2.value = k2;
            this.bufferMaterial.uniforms.k3.value = k3;

            this.bufferRenderer.render(this.bufferScene, this.bufferSceneCamera, this.bufferTarget);
            this.bufferRenderer.render(this.bufferScene, this.bufferSceneCamera);  // TODO：remove
            // this.bufferComposer.render(delta);

            // TODO: remove
            const buffer = new Uint8Array(TEXTURE_WITDH * TEXTURE_HEIGHT * 4);

            this.bufferRenderer.readRenderTargetPixels(this.bufferTarget, 0, 0, TEXTURE_WITDH, TEXTURE_HEIGHT, buffer);
            // this.bufferRenderer
            //  .readRenderTargetPixels(this.bufferComposer.renderTarget2, 0, 0, TEXTURE_WITDH, TEXTURE_HEIGHT, buffer);

            const texture1 = this.bufferMaterial.uniforms.bufferMapLast.value.clone();
            const texture2 = this.bufferMaterial.uniforms.bufferMap.value.clone();

            texture1.image.data = texture2.image.data;
            texture1.needsUpdate = true;
            texture2.image.data = buffer;
            texture2.needsUpdate = true;

            this.bufferMaterial.uniforms.bufferMapLast.value = texture1;
            this.bufferMaterial.uniforms.bufferMap.value = texture2;
            this.plane.material.uniforms.normalMap.value = texture2;

            if (this.active) {
                requestAnimationFrame(tick);
                // setTimeout(tick, 500);
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
        const textureUnit = this.bufferRenderer.properties.get(this.bufferTarget.texture).__webglTexture;

        if (!textureUnit) {
            return;
        }

        const ctx = this.bufferContext;
        const activeTextureUnit = ctx.getParameter(ctx.TEXTURE_BINDING_2D);

        ctx.bindTexture(ctx.TEXTURE_2D, textureUnit);

        if (!this.isSizeSet) {
            this.bufferContext.texImage2D(
                ctx.TEXTURE_2D,
                0,
                ctx.RGB,
                TEXTURE_WITDH,
                TEXTURE_HEIGHT,
                0,
                ctx.RGB,
                ctx.UNSIGNED_BYTE,
                null,
            );

            this.isSizeSet = true;
        }

        ctx.texSubImage2D(
            ctx.TEXTURE_2D,
            0,
            TEXTURE_WITDH / 2 + TEXTURE_WITDH / 2 * position.x,
            TEXTURE_HEIGHT / 2 + TEXTURE_HEIGHT / 2 * position.y,
            ctx.RGB,
            ctx.UNSIGNED_BYTE,
            sourceTexture,
        );

        ctx.generateMipmap(ctx.TEXTURE_2D);
        ctx.bindTexture(ctx.TEXTURE_2D, activeTextureUnit);
    }

    public mountTexture(mountPoint: HTMLElement) {
        mountPoint.appendChild(this.bufferRenderer.domElement);

        return mountPoint;
    }

    protected init() {
        this.createPlane();
        this.initBufferScene();

        return this;
    }

    private createPlane(): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, RESOLUTION, RESOLUTION);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                ...waterShaderLib.uniforms,
                normalMap: { type: "t", value: null },
            },

            vertexShader: waterShaderLib.vertexShader,

            fragmentShader: waterShaderLib.fragmentShader,

            lights: true,
        });

        // const material = new THREE.MeshLambertMaterial(); // TODO: remove later

        const plane = new THREE.Mesh(geometry, material);

        plane.rotation.set(Math.PI / -2, 0, 0);
        plane.receiveShadow = true;

        this.plane = plane;
        this.objects.push(plane);

        return plane;
    }

    private initBufferScene(): this {
        this.bufferRenderer = new THREE.WebGLRenderer({ alpha: true });
        this.bufferRenderer.setSize(TEXTURE_WITDH, TEXTURE_HEIGHT);
        this.bufferContext = this.bufferRenderer.context;

        this.bufferTarget = new THREE.WebGLRenderTarget(TEXTURE_WITDH, TEXTURE_HEIGHT, {
            format: THREE.RGBAFormat,
        });

        this.bufferScene = new THREE.Scene();

        this.bufferSceneCamera = new THREE.OrthographicCamera(
            TEXTURE_WITDH / -2, TEXTURE_WITDH / 2,
            TEXTURE_HEIGHT / 2, TEXTURE_HEIGHT / -2,
            0.1, 2);

        this.bufferSceneCamera.position.set(0, 1, 0);
        this.bufferSceneCamera.lookAt(this.bufferScene.position);

        const geometry = new THREE.PlaneGeometry(TEXTURE_WITDH, TEXTURE_HEIGHT, 1, 1);

        const textureData = new Uint8Array(TEXTURE_WITDH * TEXTURE_HEIGHT * 4).map((el, index) => {
            // TODO: remove
            if (index % 4 === 3) {
                // TODO: remove
                const distance = Math.sqrt(Math.pow(Math.abs(Math.floor(index / 4 / 512) - 256), 2)
                    + Math.pow(Math.abs(index / 4 % 512 - 256), 2));

                if (distance <= 30) {
                    return 88 + 40 * Math.sin(Math.PI / 2 * distance / 30);
                }

                // if (Math.round(index / 4 / 512) === 256 && index / 4 % 512 === 256) {
                //     return 110;
                // }

                return 128;
            }

            return 0;
        });

        const textureData0 = new Uint8Array(TEXTURE_WITDH * TEXTURE_HEIGHT * 4).map((el, index) => {
            // TODO: remove
            if (index % 4 === 3) {
                // TODO: remove
                const distance = Math.sqrt(Math.pow(Math.abs(Math.floor(index / 4 / 512) - 256), 2)
                    + Math.pow(Math.abs(index / 4 % 512 - 256), 2));

                if (distance <= 30) {
                    return 108 + 20 * Math.sin(Math.PI / 2 * distance / 30);
                }

                // if (Math.round(index / 4 / 512) === 256 && index / 4 % 512 === 256) {
                //     return 110;
                // }

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

        const texture0 = new THREE.DataTexture(
            textureData0,
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

        texture0.needsUpdate = true;

        const material = new THREE.ShaderMaterial({
            uniforms: {
                ...waterNormalMapShaderLib.uniforms,
                bufferMap: { type: "t", value: texture },
                bufferMapLast: { type: "t", value: texture0 },
                height: { type: "f", value: BOTTOM_HEIGHT },
                k1: { type: "f", value: 0 },
                k2: {type: "f", value: 0 },
                k3: { type: "f", value: 0 },
            },

            vertexShader: waterNormalMapShaderLib.vertexShader,

            fragmentShader: waterNormalMapShaderLib.fragmentShader,
        });

        const plane = new THREE.Mesh(geometry, material);

        plane.position.set(0, 0, 0);
        plane.rotation.set(-Math.PI / 2, 0, 0);

        this.bufferScene.add(plane);
        this.bufferMaterial = material;

        // const renderPass = new RenderPass(this.bufferScene, this.bufferSceneCamera);
        // const shaderPass = new ShaderPass(meanFilterShaderLib);
        //
        // shaderPass.renderToScreen = true; // TODO: remove
        //
        // this.bufferComposer = new EffectComposer(this.bufferRenderer, this.bufferTarget);
        // this.bufferComposer.addPass(renderPass);
        // this.bufferComposer.addPass(shaderPass);

        return this;
    }
}
