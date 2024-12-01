precision highp float;

uniform float time;
uniform vec3 waterColor;
uniform sampler2D noiseTexture;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    // Sample noise texture for two different wave patterns
    vec2 uv1 = vPosition.xz * 0.025;
    uv1.y += time * 0.25;
    vec4 noise1 = texture2D(noiseTexture, uv1);
    
    vec2 uv2 = vPosition.xz * 0.025;
    uv2.x += time * 0.25;
    vec4 noise2 = texture2D(noiseTexture, uv2);
    
    // Combine wave patterns
    float waves = noise1.z + noise2.x;
    waves = smoothstep(0.75, 2.0, waves);
    
    // Create blend wave for animation
    float blendWave = sin((vPosition.x + vPosition.z) * 0.1 + 
                         (noise1.y + noise2.z) + time);
    blendWave *= blendWave;
    
    // Blend between different noise channels
    float finalWaves = mix(noise1.z, noise1.w, blendWave) +
                      mix(noise2.x, noise2.y, blendWave);
    finalWaves = smoothstep(0.75, 2.0, finalWaves);
    
    // Combine with base color
    vec3 color = waterColor + vec3(finalWaves * 0.2);
    
    // Add transparency
    float alpha = 0.8;
    
    gl_FragColor = vec4(color, alpha);
} 