precision highp float;

uniform float time;
uniform vec3 waterColor;

varying vec2 vUv;

#define SHORE_FOAM_COLOR vec3(0.6, 0.9, 1.0)
#define SHALLOW_COLOR vec3(0.4, 0.5451, 1.0)
#define WAVE_SCALE 0.1

void main() {
    // Create waves moving towards the shore
    float waveFrequency = 8.0;
    float waveSpeed = 1.0;
    float baseWave = sin(vUv.y * waveFrequency - time * waveSpeed) * 0.5 + 0.5;
    
    // Calculate distance fade
    float distanceFromShore = 1.0 - vUv.y;
    float waveFalloff = 1.0 - distanceFromShore * distanceFromShore; // Quadratic falloff
    float waves = baseWave * waveFalloff;
    
    // Create depth based on UV.y (0 = deep, 1 = shallow)
    float depth = vUv.y;
    
    // Add wave movement to the shoreline
    float shorelineOffset = waves * WAVE_SCALE;
    depth = clamp(depth + shorelineOffset, 0.0, 1.0);
    
    // Create sharp toon-style transitions
    float deepWater = smoothstep(0.0, 0.3, depth);
    
    // Mix colors based on depth
    vec3 color = waterColor; // Start with deep water
    color = mix(color, SHALLOW_COLOR, deepWater);
    
    // Add foam at the shoreline
    float foam = smoothstep(0.9, 0.95, depth + waves * 0.2);
    color = mix(color, SHORE_FOAM_COLOR, foam * waveFalloff);
    
    // Add wave highlights that fade with depth
    float waveHighlight = smoothstep(0.4, 0.6, waves) * waveFalloff;
    color = mix(color, SHORE_FOAM_COLOR, waveHighlight * 0.3);
    
    gl_FragColor = vec4(color, 1.0);
} 