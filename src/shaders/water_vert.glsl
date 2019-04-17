#define USE_MAP
#define LAMBERT

uniform sampler2D normalMap;
uniform mat4 textureMatrix;
uniform float eta;
uniform mat4 matrixWorldInverse;
uniform float vertexDistance;

varying vec3 vLightFront;

#ifdef DOUBLE_SIDED

	varying vec3 vLightBack;

#endif

varying float fresnelFactor;

#include <common>
//#include <uv_pars_vertex>

#if defined(USE_MAP)

	varying vec4 vUv;
	uniform mat3 uvTransform;

#endif

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

const float sceneHeight = 300.0;

void main() {
//	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>

    vec4 normalMapTexel = texture2D(normalMap, uv);
	vec3 objectNormal = (normalMapTexel.xyz - 0.5) / 0.5;

    vUv = textureMatrix * vec4(position, 1.0)
        + vec4(objectNormal.x, objectNormal.y, 0.0, 0.0) / objectNormal.z * sceneHeight;

//	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>

//	#include <begin_vertex>

    vec3 transformed = vec3(position.xy, vertexDistance * normalMapTexel.w);

    float texDotNL = dot(normalize((matrixWorldInverse * vec4(cameraPosition, 1.0)).xyz - transformed), objectNormal);

    if (texDotNL < 0.0) {
        texDotNL = 0.0;
    }

    float g = sqrt(pow(eta, 2.0) - 1.0 + pow(texDotNL, 2.0));
    float f1 = g - texDotNL;
    float f2 = g + texDotNL;

    fresnelFactor = 0.5 * pow(f1, 2.0) / pow(f2, 2.0)
        * (pow(texDotNL * f2 - 1.0, 2.0) / pow(texDotNL * f1 + 1.0, 2.0) + 1.0);

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
