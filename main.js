'use strict';

let gl;
let surface;
let shProgram;
let spaceball;

// Texture transformation variables
let textureScale = 1.0;
let texturePivot = [0.5, 0.5]; // Initial pivot point in UV space [u, v]

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    this.iAttribVertex = gl.getAttribLocation(program, "vertex");
    this.iAttribNormal = gl.getAttribLocation(program, "normal");
    this.iAttribTangent = gl.getAttribLocation(program, "tangent");
    this.iAttribTexCoords = gl.getAttribLocation(program, "tex");

    this.iModelViewProjectionMatrix = gl.getUniformLocation(program, "ModelViewProjectionMatrix");
    this.iModelViewMatrix = gl.getUniformLocation(program, "ModelViewMatrix");
    this.iNormalMatrix = gl.getUniformLocation(program, "NormalMatrix");

    this.iDiffuseTex = gl.getUniformLocation(program, "uDiffuseTex");
    this.iSpecularTex = gl.getUniformLocation(program, "uSpecularTex");
    this.iNormalMap = gl.getUniformLocation(program, "uNormalMap");

    this.iLightPosEye = gl.getUniformLocation(program, "uLightPosEye");
    this.iAmbientColor = gl.getUniformLocation(program, "uAmbientColor");
    this.iLightColor = gl.getUniformLocation(program, "uLightColor");
    this.iShininess = gl.getUniformLocation(program, "uShininess");

    // New uniforms for texture transformation
    this.iTextureScale = gl.getUniformLocation(program, "uTextureScale");
    this.iTexturePivot = gl.getUniformLocation(program, "uTexturePivot");

    this.Use = function() {
        gl.useProgram(this.prog);
    };
}

// Function to compute inverse of 3x3 matrix from 4x4 matrix
function toInverseMat3(mat4) {
    // Extract upper-left 3x3 part from 4x4 matrix
    const m00 = mat4[0], m01 = mat4[1], m02 = mat4[2];
    const m10 = mat4[4], m11 = mat4[5], m12 = mat4[6];
    const m20 = mat4[8], m21 = mat4[9], m22 = mat4[10];
    
    // Compute determinant
    const det = m00 * (m11 * m22 - m12 * m21) -
                m01 * (m10 * m22 - m12 * m20) +
                m02 * (m10 * m21 - m11 * m20);
    
    // Return identity matrix if determinant is too small
    if (Math.abs(det) < 1e-8) {
        return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }
    
    const invDet = 1.0 / det;
    
    // Compute inverse matrix
    return [
        (m11 * m22 - m12 * m21) * invDet,
        (m02 * m21 - m01 * m22) * invDet,
        (m01 * m12 - m02 * m11) * invDet,
        (m12 * m20 - m10 * m22) * invDet,
        (m00 * m22 - m02 * m20) * invDet,
        (m02 * m10 - m00 * m12) * invDet,
        (m10 * m21 - m11 * m20) * invDet,
        (m01 * m20 - m00 * m21) * invDet,
        (m00 * m11 - m01 * m10) * invDet
    ];
}

function draw() {
    // Clear canvas
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Setup projection and view matrices
    const projection = m4.perspective(Math.PI / 8, 1, 8, 12);
    const modelView = spaceball.getViewMatrix();
    const translateToPointZero = m4.translation(0, 0, -10);
    const modelViewMatrix = m4.multiply(translateToPointZero, modelView);
    const modelViewProjection = m4.multiply(projection, modelViewMatrix);

    // Set matrix uniforms
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    
    // Compute and set normal matrix
    const normalMatrix = toInverseMat3(modelViewMatrix);
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, normalMatrix);

    // Animated light orbiting around the surface
    const time = performance.now() / 1000;
    const lightPosEye = [5 * Math.cos(time), 3.0, 5 * Math.sin(time)];
    gl.uniform3fv(shProgram.iLightPosEye, lightPosEye);
    
    // Lighting parameters
    gl.uniform3fv(shProgram.iAmbientColor, [0.2, 0.2, 0.2]);
    gl.uniform3fv(shProgram.iLightColor, [1.0, 1.0, 1.0]);
    gl.uniform1f(shProgram.iShininess, 64.0);

    // Set texture transformation uniforms
    gl.uniform1f(shProgram.iTextureScale, textureScale);
    gl.uniform2fv(shProgram.iTexturePivot, texturePivot);

    // Set texture units
    gl.uniform1i(shProgram.iDiffuseTex, 0);
    gl.uniform1i(shProgram.iSpecularTex, 1);
    gl.uniform1i(shProgram.iNormalMap, 2);

    // Draw the surface
    surface.Draw();
}

function animate() {
    draw();
    requestAnimationFrame(animate);
}

// Keyboard event handler for texture transformation
function handleKeyPress(event) {
    const step = 0.05;
    const scaleStep = 0.1;
    
    switch(event.key.toLowerCase()) {
        case 'w':
            // Move pivot up (increase v)
            texturePivot[1] = Math.min(1.0, texturePivot[1] + step);
            break;
        case 's':
            // Move pivot down (decrease v)
            texturePivot[1] = Math.max(0.0, texturePivot[1] - step);
            break;
        case 'a':
            // Move pivot left (decrease u)
            texturePivot[0] = Math.max(0.0, texturePivot[0] - step);
            break;
        case 'd':
            // Move pivot right (increase u)
            texturePivot[0] = Math.min(1.0, texturePivot[0] + step);
            break;
        case 'q':
            // Scale texture up
            textureScale = Math.min(3.0, textureScale + scaleStep);
            break;
        case 'e':
            // Scale texture down
            textureScale = Math.max(0.1, textureScale - scaleStep);
            break;
        case 'r':
            // Reset transformations
            textureScale = 1.0;
            texturePivot = [0.5, 0.5];
            break;
        default:
            return; // Ignore other keys
    }
    
    console.log(`Texture Scale: ${textureScale.toFixed(2)}, Pivot: [${texturePivot[0].toFixed(2)}, ${texturePivot[1].toFixed(2)}]`);
    draw(); // Redraw with new transformations
}

function initGL() {
    // Create and use shader program
    const prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram('PhongTex', prog);
    shProgram.Use();

    // Generate surface data
    const data = {};
    CreateSurfaceData(data);

    // Create and buffer surface model
    surface = new Model('Surface');
    surface.BufferData(data.verticesF32, data.normalsF32, data.tangentsF32, data.texcoordsF32, data.indicesU16);

    // Load textures (fallback textures will be used if files not found)
    surface.idTextureDiffuse = LoadTexture('Utils/textures/diffuse.jpg');
    surface.idTextureSpecular = LoadTexture('Utils/textures/specular.jpg');
    surface.idTextureNormal = LoadTexture('Utils/textures/normal.jpg');

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
}

function init() {
    const canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
        alert("WebGL not supported!");
        return;
    }
    
    try {
        initGL();
        spaceball = new TrackballRotator(canvas, draw, 0);
        
        // Add keyboard event listener
        window.addEventListener('keydown', handleKeyPress);
        
        animate();
    } catch (error) {
        console.error("Error during initialization:", error);
        alert("Error initializing WebGL application: " + error.message);
    }
}

function createProgram(gl, vShader, fShader) {
    const vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(vsh);
        gl.deleteShader(vsh);
        throw new Error('Vertex shader compilation error: ' + error);
    }

    const fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(fsh);
        gl.deleteShader(fsh);
        gl.deleteShader(vsh);
        throw new Error('Fragment shader compilation error: ' + error);
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const error = gl.getProgramInfoLog(prog);
        gl.deleteProgram(prog);
        gl.deleteShader(vsh);
        gl.deleteShader(fsh);
        throw new Error('Program linking error: ' + error);
    }

    // Clean up shaders after linking
    gl.deleteShader(vsh);
    gl.deleteShader(fsh);

    return prog;
}