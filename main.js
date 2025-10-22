'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let dr = 0.1;       // Granularity along U
let dTheta = 0.2;   // Granularity along V

// Constructor
function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;

    // Uniforms
    this.iModelViewProjectionMatrix = -1;
    this.iModelViewMatrix = -1;
    this.iNormalMatrix = -1;

    this.uLightPosEye = -1;
    this.uAmbientColor = -1;
    this.uLightColor = -1;
    this.uSpecularColor = -1;
    this.uMaterialDiffuse = -1;
    this.uShininess = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
let startTime = performance.now();

function draw() {
    // schedule next frame for animation
    requestAnimationFrame(draw);

    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Projection
    let projection = m4.perspective(Math.PI/8, 1, 8, 12);

    // View from trackball
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    // The order you used before: matAccum0 = rotate * modelView, matAccum1 = translate * matAccum0
    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    // ModelViewMatrix to use in shader (we already included modelview & translate/rotate)
    let modelViewMatrix = matAccum1;

    // ModelViewProjection
    let modelViewProjection = m4.multiply(projection, modelViewMatrix);

    // Normal matrix: normal = inverse(transpose(mat3(modelViewMatrix)))
    // Use m4.inverse and m4.transpose if available in m4.js
    let invMV = m4.inverse(modelViewMatrix);
    let transInvMV = m4.transpose(invMV);
    // Extract upper-left 3x3 into Float32Array (column-major expected by gl.uniformMatrix3fv)
    let normalMatrix3 = new Float32Array([
        transInvMV[0], transInvMV[1], transInvMV[2],
        transInvMV[4], transInvMV[5], transInvMV[6],
        transInvMV[8], transInvMV[9], transInvMV[10]
    ]);

    shProgram.Use();
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, normalMatrix3);

    // animate light: rotate around Y axis in world coordinates relative to origin
    const now = performance.now();
    const t = (now - startTime) * 0.001; // seconds
    const lightRadius = 4.0;
    const lightY = 2.0;
    const lx = lightRadius * Math.cos(t);
    const lz = lightRadius * Math.sin(t);
    const ly = lightY;
    // light position in world coordinates (vec4)
    const lightWorld = [lx, ly, lz, 1.0];

    // Transform light into eye-space by multiplying with ModelViewMatrix (matAccum1)
    // matAccum1 is a 4x4 matrix in column-major (m4.js)
    // multiply matAccum1 * lightWorld:
    function mulM4v4(m, v) {
        return [
            m[0]*v[0] + m[4]*v[1] + m[8]*v[2] + m[12]*v[3],
            m[1]*v[0] + m[5]*v[1] + m[9]*v[2] + m[13]*v[3],
            m[2]*v[0] + m[6]*v[1] + m[10]*v[2] + m[14]*v[3],
            m[3]*v[0] + m[7]*v[1] + m[11]*v[2] + m[15]*v[3]
        ];
    }
    const lightEye = mulM4v4(modelViewMatrix, lightWorld);
    gl.uniform3fv(shProgram.uLightPosEye, new Float32Array([lightEye[0], lightEye[1], lightEye[2]]));

    // We already set material/light uniforms in initGL; but you can update them here if needed

    surface.Draw();
}

function updateSurface() {
    let data = {};
    CreateSurfaceData(data, dr, dTheta);

    surface.BufferData(data.verticesF32, data.indicesU16);

    draw();
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Phong', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal              = gl.getAttribLocation(prog, "normal");

    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix           = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix              = gl.getUniformLocation(prog, "NormalMatrix");

    shProgram.uLightPosEye               = gl.getUniformLocation(prog, "uLightPosEye");
    shProgram.uAmbientColor              = gl.getUniformLocation(prog, "uAmbientColor");
    shProgram.uLightColor                = gl.getUniformLocation(prog, "uLightColor");
    shProgram.uSpecularColor             = gl.getUniformLocation(prog, "uSpecularColor");
    shProgram.uMaterialDiffuse           = gl.getUniformLocation(prog, "uMaterialDiffuse");
    shProgram.uShininess                 = gl.getUniformLocation(prog, "uShininess");

    // default material/light (can be changed)
    shProgram.Use();
    gl.uniform3fv(shProgram.uAmbientColor, new Float32Array([0.12, 0.12, 0.12]));
    gl.uniform3fv(shProgram.uLightColor,   new Float32Array([1.0, 1.0, 1.0]));
    gl.uniform3fv(shProgram.uSpecularColor,new Float32Array([1.0, 1.0, 1.0]));
    gl.uniform3fv(shProgram.uMaterialDiffuse,new Float32Array([0.9, 0.6, 0.3]));
    gl.uniform1f(shProgram.uShininess, 32.0);

    let data = {};
    CreateSurfaceData(data, dr, dTheta);

    surface = new Model('Surface');
    surface.BufferData(data.verticesF32, data.indicesU16);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    // === Sliders for granularity control ===
    const sliderR = document.getElementById("sliderR");
    const sliderTheta = document.getElementById("sliderTheta");
    const valR = document.getElementById("valR");
    const valTheta = document.getElementById("valTheta");

    // Initialize display values
    valR.textContent = dr.toFixed(2);
    valTheta.textContent = dTheta.toFixed(2);

    // When user moves slider, update granularity and rebuild surface
    sliderR.addEventListener("input", () => {
        dr = parseFloat(sliderR.value);
        valR.textContent = dr.toFixed(2);
        updateSurface();
    });

    sliderTheta.addEventListener("input", () => {
        dTheta = parseFloat(sliderTheta.value);
        valTheta.textContent = dTheta.toFixed(2);
        updateSurface();
    });

    draw();
}
