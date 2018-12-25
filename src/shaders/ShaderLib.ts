import * as THREE from "three";

import { ShaderChunk } from "three/src/renderers/shaders/ShaderChunk";
import { ShaderLib } from "three/src/renderers/shaders/ShaderLib";
import { UniformsLib } from "three/src/renderers/shaders/UniformsLib";
import { UniformsUtils } from "three/src/renderers/shaders/UniformsUtils";

import { water_vert } from "./ShaderChunk";

interface IShaderLib {
    uniforms: object;
    vertexShader: string;
    fragmentShader: string;
    [propName: string]: any;
}

const waterShaderLib: IShaderLib = {
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
            emissive: { value: new THREE.Color( 0x000000 ) },
        },
    ]),

    vertexShader: water_vert,

    fragmentShader: ShaderChunk.meshlambert_frag,
};

export { waterShaderLib };
