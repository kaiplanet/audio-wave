uniform sampler2D normalMap;

#define LAMBERT

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

const float mirrorFactor = 250.0;

void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>

	vec3 objectNormal = texture2D(normalMap, uv).xyz;

//	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>

	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <lights_lambert_vertex>

    vec3 reflectDirection = reflect(-directionalLights[0].direction, geometry.normal);
    float reflectStrength;

    if (dotNL > 0.0) {
        reflectStrength = pow(max(dot(reflectDirection, normalize(cameraPosition - position)), 0.0), mirrorFactor);
    } else {
        reflectStrength = 0.0;
    }

    vec3 vLightFrontDiffuse = vLightFront * .05;
    vec3 vLightFrontMirror = vLightFront * .95;

    vLightFront = vLightFrontDiffuse + vLightFrontMirror * reflectStrength;

	#include <shadowmap_vertex>
	#include <fog_vertex>
}
