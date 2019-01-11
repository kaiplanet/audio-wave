import * as THREE from "three";

import { ShaderChunk } from "three/src/renderers/shaders/ShaderChunk";
import { ShaderLib } from "three/src/renderers/shaders/ShaderLib";
import { UniformsLib } from "three/src/renderers/shaders/UniformsLib";
import { UniformsUtils } from "three/src/renderers/shaders/UniformsUtils";

import {  meanfilter_frag, meanfilter_vert, water_vert, waterbumpmap_frag, waterbumpmap_vert } from "./ShaderChunk";

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

const waterBumpMapShaderLib: IShaderLib = {
    uniforms: { },

    vertexShader: waterbumpmap_vert,

    fragmentShader: waterbumpmap_frag,
};

const meanFilterShaderLib: IShaderLib = {
    uniforms: {
        tDiffuse: { type: "t", value: null },
    },

    vertexShader: meanfilter_vert,

    fragmentShader: meanfilter_frag,
};

export { waterShaderLib, waterBumpMapShaderLib, meanFilterShaderLib };
