import { Sine } from "gsap/all";
import * as THREE from "three";
import "three/examples/js/objects/Lensflare";

import CelestialBody from "./CelestialBody";

import { LENSFLARE_0, LENSFLARE_1 } from "../../assets/assets";
import { loadTexture } from "../../utils";

const LENSFLARE_OFFSET = .01;
const LENSFLARE_DISTANCE = .5;
const CAMERA_SCAN_TIMES = 10;
const RADIANCE_SIZE = 384;
const LENSFLARE_OPACITY_THRESHOLD = .6;

export default class Sun extends CelestialBody {
    protected static textureResolution = 512;
    // @ts-ignore
    private radiances: THREE.LensflareElement[] = [];
    // @ts-ignore
    private lensflareMap: Map<THREE.Camera, THREE.Lensflare> = new Map();

    public set opacity(opacity) {
        this.sprite.material.opacity = opacity;

        if (this.light) {
            this.light.intensity = this.intensity * opacity;
        }

        this.radiances.forEach((lensflareElement) => lensflareElement.size = RADIANCE_SIZE * opacity);
    }

    public get opacity() {
        return this.sprite.material.opacity;
    }

    constructor(position: THREE.Vector3, risePosition: THREE.Vector3, setPosition: THREE.Vector3, options) {
        super(position, risePosition, setPosition, options);

        this.init();
    }

    public setDirection(direction) {
        for (const [camera, lensflare] of this.lensflareMap) {
            lensflare.position.addVectors(camera.position, this.sprite.position);
        }

        return super.setDirection(direction);
    }

    public addTo(scene) {
        for (const lensflare of this.lensflareMap.values()) {
            scene.add(lensflare);
        }

        return super.addTo(scene);
    }

    protected loadTexture() {
        const resolution = Sun.textureResolution;
        const radianceStart = resolution * .15;
        const radianceEnd = resolution * .35;
        const ease = Sine.easeOut;

        const textureData = new Uint8Array(resolution * resolution * 4).map((value, index) => {
            const distance = Math.sqrt(Math.pow(Math.floor(index / 4 / resolution) - resolution / 2, 2)
                + Math.pow(Math.abs(index / 4 % resolution - resolution / 2), 2));

            if (distance >= radianceStart) {
                switch (index % 4) {
                    case 0:
                        return 254 - 8 * ease.getRatio(Math.min((distance - radianceStart) / radianceEnd, 1));
                    case 1:
                        return 254 - 102 * ease.getRatio(Math.min((distance - radianceStart) / radianceEnd, 1));
                    case 2:
                        return 95 - 41 * ease.getRatio(Math.min((distance - radianceStart) / radianceEnd, 1));
                    case 3:
                        return 255 - 255 * ease.getRatio(Math.min((distance - radianceStart) / radianceEnd, 1));
                    default:
                        return 0;
                }
            }

            return 255;
        });

        const texture = new THREE.DataTexture(textureData, resolution, resolution);

        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        this.spriteMaterial.map = texture;
    }

    protected init() {
        const light = new THREE.DirectionalLight(0xff9e3a, this.intensity);

        light.castShadow = true;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500;
        light.shadow.camera.left = -500;
        light.shadow.camera.right = 500;
        light.shadow.camera.top = 500;
        light.shadow.camera.bottom = -500;
        this.light = light;

        super.init();
        this.initLensflare();
    }

    protected initSprite() {
        super.initSprite();
        this.sprite.scale.set(.2, .2, 1);
    }

    private async initLensflare(): Promise<void> {
        const imageUrls = [LENSFLARE_0, LENSFLARE_1, LENSFLARE_1, LENSFLARE_1];
        const textures = (await Promise.all(imageUrls.map((imageUrl) => loadTexture(imageUrl))));
        const distanceStride = LENSFLARE_DISTANCE / (imageUrls.length - 1);

        const createLensflare = () => {
            // @ts-ignore
            const lensflare = new THREE.Lensflare();

            textures.forEach((texture, index) => {
                const distance = LENSFLARE_OFFSET +  distanceStride * index;

                const size = (() => {
                    if (index === 0) {
                        return RADIANCE_SIZE;
                    }

                    return  16 + distance * 64 +  Math.random() * 64;
                })();

                // @ts-ignore
                const lensflareElement = new THREE.LensflareElement(texture, size, distance, this.light.color);

                lensflare.addElement(lensflareElement);

                if (index === 0) {
                    this.radiances.push(lensflareElement);
                }
            });

            if (this.scene) {
                this.scene.add(lensflare);
            }

            return lensflare;
        };

        // @ts-ignore
        const updatePosition = (lensflare: THREE.Lensflare, camera: THREE.Camera) =>
            lensflare.position.addVectors(camera.position, this.sprite.position);

        const updateLensflare = (e) => {
            const camera = e.currentTarget;

            for (const [key, lensflare] of this.lensflareMap) {
                if (key === camera && this.opacity > LENSFLARE_OPACITY_THRESHOLD) {
                    lensflare.visible = true;

                    continue;
                }

                lensflare.visible = false;
            }
        };

        let count = 0;

        const detectCameras = (e) => {
            const camera = e.currentTarget;

            ++count;

            if (count > CAMERA_SCAN_TIMES) {
                this.scene.removeEventListener("beforeRender", detectCameras);
                this.scene.addEventListener("beforeRender", updateLensflare);

                return;
            }

            const added = (() => {
                for (const key of this.lensflareMap.keys()) {
                    if (camera === key) {
                        return true;
                    }
                }

                return false;
            })();

            if (!added) {
                const lensflare = createLensflare();

                updatePosition(lensflare, camera);
                this.lensflareMap.set(camera, lensflare);
                camera.addEventListener("move", () => updatePosition(lensflare, camera));
            }
        };

        this.scene.addEventListener("beforeRender", detectCameras);
    }
}
