import * as THREE from "three";

import { ShaderChunk } from "three/src/renderers/shaders/ShaderChunk";
import { ShaderLib } from "three/src/renderers/shaders/ShaderLib";
import { UniformsLib } from "three/src/renderers/shaders/UniformsLib";
import { UniformsUtils } from "three/src/renderers/shaders/UniformsUtils";

import WaveSource from "../physics/WaveSource";
import Body from "./Body";

const WIDTH = 100;
const HEIGHT = 100;
const EXTERNAL_COORDS_ORIGIN_X = WIDTH / 2;
const EXTERNAL_COORDS_ORIGIN_Y = HEIGHT / 2;
const WAVE_SPEED = WIDTH / 10 / 1000; // Pixel per millisecond.
const DAMPING_RATIO = 0.0003;
const MIN_ACTIVE_OFFSET = 0.05;

const RESOLUTION = 512;

export default class extends Body {
    private waveSources: WaveSource[];
    private canvas: HTMLCanvasElement;
    private active = false;

    constructor() {
        super();
    }

    public addTo(scene: THREE.scene, position: THREE.Vector3) {
        super.addTo(scene, position);

        if (process.env.NODE_ENV === "development") {
            scene.add(new THREE.VertexNormalsHelper(this.objects[0], 2, 0x000000, 1));
        }

        return this;
    }

    public startSimulation() {
        if (this.active) {
            return;
        }

        const ctx = this.canvas.getContext("2d");

        const tick = () => {
            if (!this.waveSources.length) {
                return requestAnimationFrame(tick);
            }

            const waveSourceTouched = [];
            const timestamp = Date.now();

            let maxOffsetAbs = 0;

            const imageData = ctx.createImageData(WIDTH, HEIGHT);

            new Array(WIDTH * HEIGHT).fill(null).map((el, index) => {
                const x = index % WIDTH;
                const y = Math.floor(index / WIDTH);
                const position = new THREE.Vector2(x, y);

                let offset = 0;

                this.waveSources.forEach((waveSource, waveIndex) => {
                    const distance = waveSource.position.distanceTo(position);

                    // Timestamp when the wave reaches the point.
                    const startTimestamp = waveSource.timestamp + distance / WAVE_SPEED;

                    const timeDiff = timestamp - startTimestamp;
                    const amplitude = waveSource.amplitude;
                    const angularFrequency = 2 * Math.PI / waveSource.period;

                    const offsetContribute = (() => {
                        if (timeDiff < 0) {
                            return 0;
                        }

                        // x = A(e^-βt)sin(ωt + φ);
                        return amplitude * Math.exp(-DAMPING_RATIO * timeDiff) *
                            Math.sin(angularFrequency * timeDiff);
                    })();

                    offset += offsetContribute;

                    if (timestamp < startTimestamp || offsetContribute > MIN_ACTIVE_OFFSET) {
                        waveSourceTouched[waveIndex] = true;
                    }
                });

                if (Math.abs(offset) > maxOffsetAbs) {
                    maxOffsetAbs = Math.abs(offset);
                }

                return offset;
            }).forEach((offset, index) => {
                if (maxOffsetAbs === 0) {
                    return;
                }

                const dataIndex = index * 4;
                const data = imageData.data;

                data[dataIndex] = 0;
                data[dataIndex + 1] = 0;
                data[dataIndex + 2] = 0;
                data[dataIndex + 3] = Math.floor(128  + 128  * offset / maxOffsetAbs);
            });

            if (waveSourceTouched.filter((el) => el).length !== this.waveSources.length) {
                this.waveSources = this.waveSources.filter((waveSource, index) => {
                    return waveSourceTouched[index];
                });
            }

            if (maxOffsetAbs !== 0) {
                ctx.putImageData(imageData, 0, 0);
            }

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
     * @param {THREE.Vector2} position - The position of wave source.
     *      Waves are generate on the water surface, use THREE.Vector2.
     *      The range of each component is from -1 to 1.
     * @param {number} height - Wave height
     * @param {number} period - The vibration period of the wave source in milliseconds
     */
    public generateWave(position: THREE.Vector2, height: number, period: number) {
        this.waveSources.push(new WaveSource(({
            amplitude: height / 2,
            period,
            position: position.applyMatrix3(new THREE.Matrix3().set(
                EXTERNAL_COORDS_ORIGIN_X, 0, EXTERNAL_COORDS_ORIGIN_X,
                0, -EXTERNAL_COORDS_ORIGIN_Y, EXTERNAL_COORDS_ORIGIN_Y,
            )),
            timestamp: Date.now(),
        })));
    }

    protected init() {
        this.waveSources = [];

        this.canvas = document.createElement("canvas");
        this.canvas.width = WIDTH;
        this.canvas.height = HEIGHT;

        this.createPlane();

        const plane = this.objects[0];

        plane.onBeforeRender = (renderer, scene, camera, geometry, material: THREE.Material) => {
            // console.log(material);
        };

        return this;
    }

    private createPlane() {
        const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, RESOLUTION, RESOLUTION);

        const material = new THREE.ShaderMaterial({
            uniforms: UniformsUtils.merge([
                UniformsLib.common,
                UniformsLib.specularmap,
                UniformsLib.envmap,
                UniformsLib.aomap,
                UniformsLib.lightmap,
                UniformsLib.emissivemap,
                UniformsLib.fog,
                UniformsLib.lights,
                {
                    diffuse: { value: new THREE.Color(0xffffff) },
                    emissive: { value: new THREE.Color( 0x000000 ) },
                    sourceAmplitudes: {
                        type: "iv1",
                        value: [...this.waveSources.map((source) => source.amplitude)],
                    },
                    sourcePosition: {
                        type: "v2v",
                        value: [...this.waveSources
                            .map((source) => THREE.Vector2(source.position.x, source.position.y))],
                    },

                },
            ]),

            vertexShader: `
                varying vec3 vLightFront;

                #ifdef DOUBLE_SIDED

                    varying vec3 vLightBack;

                #endif

                #include <common>
                #include <uv_pars_vertex>
                #include <uv2_pars_vertex>
                #include <envmap_pars_vertex>
                #include <bsdfs>
                #include <lights_pars_begin>
                #include <color_pars_vertex>
                #include <fog_pars_vertex>
                #include <morphtarget_pars_vertex>
                #include <skinning_pars_vertex>
                #include <shadowmap_pars_vertex>
                #include <logdepthbuf_pars_vertex>
                #include <clipping_planes_pars_vertex>

                void main() {

                    #include <uv_vertex>
                    #include <uv2_vertex>
                    #include <color_vertex>

                    float absPositionX = position.x > 0.0 ? position.x : - position.x;
                    float offsetY = absPositionX - float(int(absPositionX / 20.0) * 20);

                    vec3 objectNormal = vec3(offsetY > 0.0 ? 1 : -1 , normal.yz);

                    #include <morphnormal_vertex>
                    #include <skinbase_vertex>
                    #include <skinnormal_vertex>
                    #include <defaultnormal_vertex>

                    vec3 transformed = vec3(position.x, position.y + offsetY, position.z);

                    #include <morphtarget_vertex>
                    #include <skinning_vertex>
                    #include <project_vertex>
                    #include <logdepthbuf_vertex>
                    #include <clipping_planes_vertex>

                    #include <worldpos_vertex>
                    #include <envmap_vertex>
                    #include <lights_lambert_vertex>
                    #include <shadowmap_vertex>
                    #include <fog_vertex>
                }
            `,

            fragmentShader: ShaderChunk.meshlambert_frag,

            lights: true,
        });

        const plane = new THREE.Mesh(geometry, material);
        // const plane = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xffffff }));
        plane.rotation.set(Math.PI / -2, 0, 0);
        plane.receiveShadow = true;
        this.objects.push(plane);
    }
}
