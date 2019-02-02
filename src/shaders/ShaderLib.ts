import * as THREE from "three";

import { UniformsLib } from "three/src/renderers/shaders/UniformsLib";
import { UniformsUtils } from "three/src/renderers/shaders/UniformsUtils";

import { meanfilter_frag, meanfilter_vert, water_frag, water_vert, waterbumpmap_frag, waterbumpmap_vert,
    waternormalmap_frag, waternormalmap_vert } from "./ShaderChunk";

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

    fragmentShader: water_frag,
};

const waterNormalMapShaderLib: IShaderLib = {
  uniforms: { },

  vertexShader: waternormalmap_vert,

  fragmentShader: waternormalmap_frag,
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

export { meanFilterShaderLib, waterShaderLib, waterBumpMapShaderLib, waterNormalMapShaderLib };
