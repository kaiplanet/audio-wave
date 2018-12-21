import * as THREE from "three";

import WaveSource from "../physics/WaveSource";
import Body from "./Body";

import { waterShaderLib } from "../shaders/ShaderLib";

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
    private bumpMapCanvas: HTMLCanvasElement;
    private normalMapCanvas: HTMLCanvasElement;
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

        const bumpMapCtx = this.bumpMapCanvas.getContext("2d");
        const normalMapCtx = this.normalMapCanvas.getContext("2d");

        const tick = () => {
            if (!this.waveSources.length) {
                return requestAnimationFrame(tick);
            }

            const waveSourceTouched = [];
            const timestamp = Date.now();

            let maxOffsetAbs = 0;

            const bumpMapImage = bumpMapCtx.createImageData(WIDTH, HEIGHT);
            const normalMapImage = normalMapCtx.createImageData(WIDTH, HEIGHT);

            new Array(WIDTH * HEIGHT).fill(null).map((el: any, index: number) => {
                const x = index % WIDTH;
                const y = Math.floor(index / WIDTH);
                const position = new THREE.Vector2(x, y);

                let offset = 0;
                let normalVector = new THREE.Vector3(0, 0, 0);

                this.waveSources.forEach((waveSource: WaveSource, waveIndex: number) => {
                    const distance = waveSource.position.distanceTo(position);

                    // Timestamp when the wave reaches the point.
                    const startTimestamp = waveSource.timestamp + distance / WAVE_SPEED;

                    const timeDiff = timestamp - startTimestamp;
                    const amplitude = waveSource.amplitude;
                    const angularFrequency = 2 * Math.PI / waveSource.period;

                    const offsetContribution = ((): number => {
                        if (timeDiff < 0) {
                            return 0;
                        }

                        // x = A(e^-βt)sin(ωt + φ).
                        return amplitude * Math.exp(-DAMPING_RATIO * timeDiff) *
                            Math.sin(angularFrequency * timeDiff);
                    })();

                    offset += offsetContribution;

                    const normalVectorContribution = ((): THREE.Vector3 => {
                        if (timeDiff < 0) {
                            return new THREE.Vector3(0, 0, 0);
                        }

                        // f'(wt) = A(e^-βt)cos(ωt + φ)
                        const gradient = amplitude * Math.exp(-DAMPING_RATIO * timeDiff) *
                            Math.cos(angularFrequency * timeDiff);

                        const tangentVector = new THREE.Vector2(1, gradient);
                        const NormalVector2D = new THREE.Vector2(1, tangentVector.x / tangentVector.y * -1);
                        const directionVector = position.sub(waveSource.position);
                        const normalVectorY = directionVector.length() * NormalVector2D.y / NormalVector2D.x;

                        return new THREE.Vector3(directionVector.x, normalVectorY, directionVector.y).normalize();
                    })();

                    normalVector.add(normalVectorContribution);

                    if (timestamp < startTimestamp || offsetContribution > MIN_ACTIVE_OFFSET) {
                        waveSourceTouched[waveIndex] = true;
                    }
                });

                if (Math.abs(offset) > maxOffsetAbs) {
                    maxOffsetAbs = Math.abs(offset);
                }

                if (!normalVector.length()) {
                    normalVector = new THREE.Vector3(0, 1, 0);
                }

                normalVector.normalize();

                return { offset, normalVector };
            }).forEach(({ offset, normalVector }: { offset: number, normalVector: THREE.Vector3 }, index: number) => {
                if (maxOffsetAbs === 0) {
                    return;
                }

                const dataIndex = index * 4;
                const bumpMapImageData = bumpMapImage.data;
                const normalMapImageData = normalMapImage.data;

                bumpMapImageData[dataIndex] = Math.floor(128  + 128  * offset / maxOffsetAbs);
                bumpMapImageData[dataIndex + 1] = 0;
                bumpMapImageData[dataIndex + 2] = 0;
                bumpMapImageData[dataIndex + 3] = 255;

                normalMapImageData[dataIndex] = Math.floor(128  + 128  * normalVector.x);
                normalMapImageData[dataIndex + 1] = Math.floor(128  + 128  * normalVector.y);
                normalMapImageData[dataIndex + 2] = Math.floor(128  + 128  * normalVector.z);
                normalMapImageData[dataIndex + 3] = 255;
            });

            if (waveSourceTouched.filter((el: boolean|undefined) => el).length !== this.waveSources.length) {
                this.waveSources = this.waveSources.filter((waveSource: WaveSource, index) => {
                    return waveSourceTouched[index];
                });
            }

            if (maxOffsetAbs !== 0) {
                bumpMapCtx.putImageData(bumpMapImage, 0, 0);
                normalMapCtx.putImageData(normalMapImage, 0, 0);
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

        this.bumpMapCanvas = document.createElement("canvas");
        this.bumpMapCanvas.width = WIDTH;
        this.bumpMapCanvas.height = HEIGHT;

        this.normalMapCanvas = document.createElement("canvas");
        this.normalMapCanvas.width = WIDTH;
        this.normalMapCanvas.height = HEIGHT;

        this.createPlane();

        const plane = this.objects[0];

        plane.onBeforeRender = (renderer, scene, camera, geometry, material: THREE.Material) => {
            // console.log(material);
        };

        return this;
    }

    private createPlane() {
        const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, RESOLUTION, RESOLUTION);
        const texture = new THREE.CanvasTexture(this.bumpMapCanvas);
        const material = new THREE.ShaderMaterial(waterShaderLib);
        const plane = new THREE.Mesh(geometry, material);
        // const plane = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xffffff }));
        plane.rotation.set(Math.PI / -2, 0, 0);
        plane.receiveShadow = true;
        this.objects.push(plane);
    }
}
