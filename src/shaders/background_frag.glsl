#define USE_MAP

uniform vec3 diffuse;
uniform float opacity;
uniform float alpha;
uniform float brightness;

#ifndef FLAT_SHADED

	varying vec3 vNormal;

#endif

#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
//#include <map_pars_fragment>

uniform sampler2D map0;
uniform sampler2D map1;

#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {
	#include <clipping_planes_fragment>

	vec4 diffuseColor = vec4(diffuse, opacity);

	#include <logdepthbuf_fragment>
//	#include <map_fragment>

	vec4 texelColor0 = texture2D(map0, vUv);
	vec4 texelColor1 = texture2D(map1, vUv);

	diffuseColor *= mapTexelToLinear(texelColor0 * alpha + texelColor1 * (1.0 - alpha));

	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>

	ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));

	// accumulation (baked indirect lighting only)
	#ifdef USE_LIGHTMAP

		reflectedLight.indirectDiffuse += texture2D(lightMap, vUv2).xyz * lightMapIntensity;

	#else

		reflectedLight.indirectDiffuse += vec3(1.0);

	#endif

	// modulation
	#include <aomap_fragment>

	reflectedLight.indirectDiffuse *= diffuseColor.rgb;

	vec3 outgoingLight = reflectedLight.indirectDiffuse;

	#include <envmap_fragment>

	gl_FragColor = vec4(outgoingLight, diffuseColor.a) * brightness;

	#include <premultiplied_alpha_fragment>
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
}