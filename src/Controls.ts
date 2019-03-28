import { Power4 } from "gsap/all";
import * as THREE from "three";

import { animate } from "./utils";

interface IControls {
    connect(camera: THREE.Camera): this;
    listen(domElement: HTMLElement|Document|Window): this;
}

interface IOptions {
    lookAt?: THREE.Vector3;
    rotateSpeed?: number;
    zoomSpeed?: number;
}

export default class implements IControls {
    private camera: THREE.Camera;
    private domElement: HTMLElement|Document|Window;
    private readonly lookAt: THREE.Vector3;
    private readonly rotateSpeed: number;
    private readonly zoomSpeed: number;

    constructor({ lookAt = new THREE.Vector3(0, 0, 0), rotateSpeed = 1, zoomSpeed = 1 }: IOptions) {
        this.lookAt = lookAt;
        this.rotateSpeed = rotateSpeed;
        this.zoomSpeed = zoomSpeed;
    }

    public connect(camera) {
        this.camera = camera;

        if (this.domElement) {
            this.init();
        }

        return this;
    }

    public listen(domElement = window) {
        this.domElement = domElement;

        if (this.camera) {
            this.init();
        }

        return this;
    }

    private async init() {
        const cameraPosition = this.camera.position;
        const originRadX = cameraPosition.x / cameraPosition.z * -1;
        const originRadY = cameraPosition.y / cameraPosition.z * -1;
        const previousPosition = new THREE.Vector2();
        const newPosition = new THREE.Vector2();

        let cameraDistance = cameraPosition.distanceTo(this.lookAt);

        const handleMouseMove = (e: MouseEvent) => {
            newPosition.set(e.x, e.y);

            if (newPosition.distanceTo(previousPosition) > 30) {
                previousPosition.set(e.x, e.y);

                const ratioX = (() => {
                    if (this.domElement instanceof Window) {
                        return e.x / this.domElement.innerWidth;
                    }
                })();

                const ratioY = (() => {
                    if (this.domElement instanceof Window) {
                        return e.y / this.domElement.innerHeight;
                    }
                })();

                const radX = originRadX + Math.PI * this.rotateSpeed * (ratioX - .5);
                const radY = originRadY + Math.PI * this.rotateSpeed * (ratioY - .5);

                const target = {
                  x: cameraPosition.x,
                  y: cameraPosition.y,
                  z: cameraPosition.z,
                };

                animate(target, {
                    x: Math.sin(radX) * cameraDistance,
                    y: Math.sin(radY) * cameraDistance * -1,
                    z: Math.cos(radX) * Math.cos(radY) * cameraDistance,
                }, .8, {
                    ease: Power4.easeOut,
                    onUpdate: () => {
                        cameraPosition.set(target.x, target.y, target.z);
                        this.camera.lookAt(this.lookAt);
                    },
                });
            }
        };

        const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
            newPosition.set(e.gamma, e.beta);

            if (newPosition.distanceTo(previousPosition) > 3) {
                previousPosition.set(e.gamma, e.beta);

                const radX = originRadX + Math.PI * this.rotateSpeed * e.gamma / 180;

                const radY = originRadY + (() => {
                    let beta = e.beta - 51;

                    if (e.beta + 90 < 51) {
                        beta = 39 + e.beta + 90;
                    } else {
                        beta = e.beta - 51;
                    }

                    return Math.PI * this.rotateSpeed * beta  / 180 * -1;
                })();

                const target = {
                    x: cameraPosition.x,
                    y: cameraPosition.y,
                    z: cameraPosition.z,
                };

                animate(target, {
                    x: Math.sin(radX) * cameraDistance,
                    y: Math.sin(radY) * cameraDistance * -1,
                    z: Math.cos(radX) * Math.cos(radY) * cameraDistance,
                }, .8, {
                    ease: Power4.easeOut,
                    onUpdate: () => {
                        cameraPosition.set(target.x, target.y, target.z);
                        this.camera.lookAt(this.lookAt);
                    },
                });
            }
        };

        const deviceOrientation = await new Promise((resolve) => {
            const testMouseMove = () => {
                this.domElement.removeEventListener("mousemove", testMouseMove);
                this.domElement.removeEventListener("deviceorientation", testDeviceOrientation);
                resolve(false);
            };

            const testDeviceOrientation = (e: DeviceOrientationEvent) => {
                this.domElement.removeEventListener("mousemove", testMouseMove);
                this.domElement.removeEventListener("deviceorientation", testDeviceOrientation);

                if (e.alpha || e.beta || e.gamma) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            };

            this.domElement.addEventListener("mousemove", testMouseMove);
            this.domElement.addEventListener("deviceorientation", testDeviceOrientation);
        });

        if (deviceOrientation) {
            this.domElement.addEventListener("deviceorientation", handleDeviceOrientation);
        } else {
            this.domElement.addEventListener("mousemove", handleMouseMove);
        }

        const zoomRatio = 1 - this.zoomSpeed / 2;

        const handleMouseWheel = (e: MouseWheelEvent) => {
            const cameraOffset = cameraPosition.sub(this.lookAt);

            cameraOffset.multiplyScalar(Math.pow(zoomRatio, e.deltaY));
            cameraPosition.addVectors(this.lookAt, cameraOffset);
            cameraDistance = cameraPosition.distanceTo(this.lookAt);
        };

        this.domElement.addEventListener("mousewheel", handleMouseWheel);
    }
}
