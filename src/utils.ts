import { TweenLite } from "gsap/all";
import * as THREE from "three";
import { DDSLoader } from "three/examples/js/loaders/DDSLoader";
import { MTLLoader } from "three/examples/js/loaders/MTLLoader";
import { OBJLoader } from "three/examples/js/loaders/OBJLoader";

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

async function loadOBJMTLModel(objPath: string, mtlPath: string, texturePath?: string): Promise<THREE.Mesh> {
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
        const loader = new MTLLoader();

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

    const objPromise = new Promise<THREE.Mesh>(async (resolve, reject) => {
        const loader = new OBJLoader();
        const materialCreator = await mtlPromise;

        loader.setMaterials(materialCreator);

        loader.load(objPath, async (object) => {
            const texture = await texturePromise;

            object.traverse((child) => {
                if (child.isMesh) {
                    if (texture) {
                        child.material.map = texture;
                    }

                    child.material.transparent = true;
                    child.material.alphaTest = .1;
                    child.material.side = THREE.DoubleSide;
                    child.material.shadowSide = THREE.DoubleSide;

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
    const loader = new DDSLoader();

    return await new Promise<THREE.CompressedTexture>((resolve, reject) => {
        loader.load(path, (texture) => resolve(texture), null, (err) => reject(err));
    });
}

export { animate, loadTexture, loadImageData, loadOBJMTLModel, loadDDSTexture };
