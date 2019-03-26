#define PHONG
#define USE_MAP

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main() {

	#include <clipping_planes_fragment>

	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;

	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>

	// accumulation
	#include <lights_phong_fragment>
//	#include <lights_fragment_begin>

    GeometricContext geometry;

    geometry.position = - vViewPosition;
    geometry.normal = normal;
    geometry.viewDir = normalize( vViewPosition );

    IncidentLight directLight;

    #if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )

        DirectionalLight directionalLight;

//        #pragma unroll_loop
        for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
            float dotNL = dot(normal, directionalLights[i].direction);

            if (dotNL < 0.0) {
                geometry.normal = normal * -1.0;
            }

            directionalLight = directionalLights[i];
            getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );

            #ifdef USE_SHADOWMAP

                directLight.color *= all( bvec2( directionalLight.shadow, directLight.visible ) ) ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;

            #endif

            RE_Direct( directLight, geometry, material, reflectedLight );

            if (dotNL < 0.0) {
                geometry.normal = normal;
            }

        }

    #endif

    #if defined( RE_IndirectDiffuse )

        vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );

        #if ( NUM_HEMI_LIGHTS > 0 )

            #pragma unroll_loop
            for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {

                irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );

            }

        #endif

    #endif

    #if defined( RE_IndirectSpecular )

        vec3 radiance = vec3( 0.0 );
        vec3 clearCoatRadiance = vec3( 0.0 );

    #endif

	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// modulation
	#include <aomap_fragment>

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

	#include <envmap_fragment>

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>

}
