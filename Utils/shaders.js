// shaders.js
const vertexShaderSource = `
attribute vec3 vertex;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec2 tex;

uniform mat4 ModelViewMatrix;
uniform mat4 ModelViewProjectionMatrix;
uniform mat3 NormalMatrix;

varying vec3 vNormal;
varying vec2 vUV;
varying vec3 vPosEye;

void main() {
    vec4 posEye4 = ModelViewMatrix * vec4(vertex, 1.0);
    vPosEye = posEye4.xyz;
    vNormal = normalize(NormalMatrix * normal);
    vUV = tex;
    gl_Position = ModelViewProjectionMatrix * vec4(vertex, 1.0);
}
`;

const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif

varying vec3 vNormal;
varying vec2 vUV;
varying vec3 vPosEye;

uniform sampler2D uDiffuseTex;
uniform sampler2D uSpecularTex;
uniform sampler2D uNormalMap;

uniform vec3 uLightPosEye;
uniform vec3 uAmbientColor;
uniform vec3 uLightColor;
uniform float uShininess;

void main() {
    // Спочатку простий тест - використовуємо тільки дифузну текстуру
    vec3 diffCol = texture2D(uDiffuseTex, vUV).rgb;
    
    // Просте освітлення для тесту
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightPosEye - vPosEye);
    float lambert = max(dot(N, L), 0.0);
    
    vec3 ambient = uAmbientColor * diffCol;
    vec3 diffuse = uLightColor * diffCol * lambert;
    
    vec3 color = ambient + diffuse;
    gl_FragColor = vec4(color, 1.0);
}
`;