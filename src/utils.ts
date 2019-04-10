import { TweenLite } from "gsap/all";
import * as THREE from "three";
import "three/examples/js/loaders/DDSLoader";
import "three/examples/js/loaders/MTLLoader";
import "three/examples/js/loaders/OBJLoader";

function animate(target: THREE.Vector3, vars: THREE.Vector3, duration: number, options?: object);
function animate(target: object, vars: object, duration: number, options?: object);
function animate(target: any, vars: any, duration: number, options?: object) {
    if (target instanceof THREE.Vector3) {
        const direction = {
            x: target.x,
            y: target.y,
            z: target.z,
        };

        TweenLite.to(direction, duration, {
            x: vars.x,
            y: vars.y,
            z: vars.z,

            onUpdate: () => {
                target.setX(direction.x);
                target.setY(direction.y);
                target.setZ(direction.z);
            },

            ...options,
        });
    } else if (typeof target === "object") {
        TweenLite.to(target, duration, {
            ...vars,
            ...options,
        });
    }
}

function loadTexture(url: string): Promise<THREE.Texture> {
    const loader = new THREE.TextureLoader();

    return new Promise((resolve, reject) => {
        loader.load(url, (texture) => {
            resolve(texture);
        }, null, (err) => {
            reject(err);
        });

    });
}

function loadImageData(path: string): Promise<ImageData> {
    const loader = new THREE.ImageLoader();

    return new Promise((resolve, reject) => {
        loader.load(path, (image) => {
            const canvas = document.createElement("canvas");

            canvas.width = image.width;
            canvas.height = image.height;

            const ctx = canvas.getContext("2d");

            ctx.drawImage(image, 0, 0);
            resolve(ctx.getImageData(0, 0, image.width, image.height));
        }, null, (err) => {
            reject(err);
        });
    });
}

async function loadOBJMTLModel(objPath: string, mtlPath: string, texturePath?: string): Promise<THREE.Object3D> {
    const texturePromise = ((path) => {
        if (!path) {
            return null;
        }

        if (/\.dds$/.test(path)) {
            return loadDDSTexture(path);
        } else {
            return null;
        }
    })(texturePath);

    const mtlPromise = new Promise<THREE.MaterialCreator>((resolve, reject) => {
        const loader = new THREE.MTLLoader();

        loader.load(mtlPath, (materialCreator) => {
            if (texturePath && !texturePromise) {
                Object.values(materialCreator.materialsInfo).forEach((materialInfo: any) => {
                    materialInfo.map_kd = texturePath;
                });
            }

            materialCreator.preload();

            Object.values(materialCreator.materials).forEach((material: THREE.Material) => {
                material.transparent = true;
            });

            resolve(materialCreator);
        }, null, (err) => reject(err));
    });

    const objPromise = new Promise<THREE.Object3D>(async (resolve, reject) => {
        const loader = new THREE.OBJLoader();
        const materialCreator = await mtlPromise;

        loader.setMaterials(materialCreator);

        loader.load(objPath, async (object) => {
            const texture = await texturePromise;

            object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.material instanceof THREE.Material) {
                        if (texture && Reflect.has(child.material, "map")) {
                            (child.material as any).map = texture;
                        }

                        child.material.transparent = true;
                        child.material.alphaTest = .1;
                        child.material.side = THREE.DoubleSide;

                        if (Reflect.has(child.material, "shadowSide")) {
                            (child.material as any).shadowSide = THREE.DoubleSide;
                        }
                    }

                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            resolve(object);
        }, null, (err) => reject(err));
    });

    return await objPromise;
}

async function loadDDSTexture(path: string): Promise<THREE.CompressedTexture> {
    const loader = new THREE.DDSLoader();

    return await new Promise<THREE.CompressedTexture>((resolve, reject) => {
        loader.load(path, (texture) => resolve(texture), null, (err) => reject(err));
    });
}

export { animate, loadTexture, loadImageData, loadOBJMTLModel, loadDDSTexture };
