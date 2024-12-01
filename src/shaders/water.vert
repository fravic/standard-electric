#include <common>
#include <fog_pars_vertex>

attribute float shoreDist;
varying vec3 vPosition;
varying vec3 vNormal;
varying float vShoreDist;
uniform float time;
varying vec2 vUv;
varying float vElevation;

void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vShoreDist = shoreDist;
    
    vUv = uv;
    
    // Create vertex displacement for waves
    float wave1 = sin(position.x * 0.2 + time * 0.5) * 0.5;
    float wave2 = sin(position.z * 0.3 + time * 0.4) * 0.5;
    vec3 pos = position;
    pos.y += wave1 + wave2;
    
    // Calculate view-space elevation for fresnel
    vec4 modelViewPosition = modelViewMatrix * vec4(pos, 1.0);
    vElevation = normalize(normalMatrix * normal).y;
    
    gl_Position = projectionMatrix * modelViewPosition;
    
    #include <fog_vertex>
} 