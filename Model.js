

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// p: an array of xyz vertex coords
// t: an array of uv tex coords
function Vertex(p)
{
    this.p = p;
    this.normal = [];
    this.triangles = [];
}

function Triangle(v0, v1, v2)
{
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [];
    this.tangent = [];
}

// // Model Constructor function
// function Model(name) {
//     this.name = name;
//     this.iVertexBuffer = gl.createBuffer();
//     this.iIndexBuffer = gl.createBuffer();
//     this.count = 0;

//     this.BufferData = function(vertices, indices) {

//         gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
//         gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

//         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
//         gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

//         this.count = indices.length;
//     }

//     this.Draw = function() {

//         gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
//         gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
//         gl.enableVertexAttribArray(shProgram.iAttribVertex);

//         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);

//         //gl.drawArrays(gl.LINE_STRIP, 0, this.count);
//         gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
//     }
// }

// Model Constructor function
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;

    // vertices expected as Float32Array interleaved: x,y,z, nx,ny,nz
    this.BufferData = function(verticesInterleaved, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, verticesInterleaved, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        this.count = indices.length;
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        // stride = 6 floats = 24 bytes
        const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
        // vertex position at offset 0
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        // normal at offset 3 floats
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);

        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }
}

// function CreateSurfaceData(data)
// {
//     let vertices = [];
//     let triangles = [];

//     for (let i=0, ang = 0; i<72; i++, ang+=5) {
//         // TODO: replace with your equation
//         vertices.push( new Vertex( [Math.sin(deg2rad(ang)), 0, Math.cos(deg2rad(ang))] ));
//     }

//     for (let i=0, ang = 0; i<72; i++, ang+=5) {

//         // TODO: replace with your equation
//         let v0ind = vertices.length;
//         vertices.push( new Vertex( [Math.sin(deg2rad(ang)), 1, Math.cos(deg2rad(ang))] ));

//         // v0    v2 
//         //   o - o
//         //   | \ |
//         //   o - o
//         // v3     v1

//         if (i > 0)
//         {
//             let v1ind = v0ind - 72 -1;
//             let v2ind = v0ind - 1;
//             let v3ind = v0ind - 72;

//             let trian = new Triangle(v0ind, v1ind, v2ind);
//             let trianInd = triangles.length;

//             triangles.push( trian );
//             vertices[v0ind].triangles.push(trianInd);
//             vertices[v1ind].triangles.push(trianInd);
//             vertices[v2ind].triangles.push(trianInd);

//             let trian2 = new Triangle(v0ind, v3ind, v1ind);
//             let trianInd2 = triangles.length;

//             triangles.push( trian2 );
//             vertices[v0ind].triangles.push(trianInd2);
//             vertices[v3ind].triangles.push(trianInd2);
//             vertices[v1ind].triangles.push(trianInd2);

//         }

//     }

//     data.verticesF32 = new Float32Array(vertices.length*3);
//     for (let i=0, len=vertices.length; i<len; i++)
//     {
//         data.verticesF32[i*3 + 0] = vertices[i].p[0];
//         data.verticesF32[i*3 + 1] = vertices[i].p[1];
//         data.verticesF32[i*3 + 2] = vertices[i].p[2];
//     }

//     data.indicesU16 = new Uint16Array(triangles.length*3);
//     for (let i=0, len=triangles.length; i<len; i++)
//     {
//         data.indicesU16[i*3 + 0] = triangles[i].v0;
//         data.indicesU16[i*3 + 1] = triangles[i].v1;
//         data.indicesU16[i*3 + 2] = triangles[i].v2;
//     }

// }

function CreateSurfaceData(data, dr = 0.05, dTheta = Math.PI / 36) {
    let rMin = parseFloat(window.rMin) || 0.25;
    let rMax = parseFloat(window.rMax) || 1.0;

    if (isNaN(dr) || dr <= 0) dr = 0.05;
    if (isNaN(dTheta) || dTheta <= 0) dTheta = Math.PI / 36;

    const numR = Math.max(2, Math.floor((rMax - rMin) / dr) + 1);
    const numTheta = Math.max(3, Math.floor((2 * Math.PI) / dTheta) + 1);

    // store positions as array of vec3
    let positions = new Array(numR * numTheta);
    for (let i = 0; i < numR; i++) {
        let r = rMin + i * dr;
        for (let j = 0; j < numTheta; j++) {
            let theta = (j === numTheta - 1) ? 2 * Math.PI : j * dTheta;
            let x = (-Math.cos(theta) / (2 * r)) - (Math.pow(r, 3) * Math.cos(3 * theta)) / 6;
            let y = (Math.sin(theta) / (2 * r)) + (Math.pow(r, 3) * Math.sin(3 * theta)) / 6;
            let z = r * Math.cos(theta);
            positions[i * numTheta + j] = [x, y, z];
        }
    }

    // build triangle indices
    let indices = [];
    for (let i = 0; i < numR - 1; i++) {
        for (let j = 0; j < numTheta - 1; j++) {
            let v0 = i * numTheta + j;
            let v1 = i * numTheta + ((j + 1) % numTheta);
            let v2 = (i + 1) * numTheta + j;
            let v3 = (i + 1) * numTheta + ((j + 1) % numTheta);

            indices.push(v0, v2, v1);
            indices.push(v1, v2, v3);
        }
    }

    const nVertices = positions.length;
    // array to accumulate weighted normals
    let normals = new Array(nVertices);
    for (let i = 0; i < nVertices; i++) normals[i] = [0, 0, 0];

    // helper cross product
    function cross(a, b) {
        return [
            a[1]*b[2] - a[2]*b[1],
            a[2]*b[0] - a[0]*b[2],
            a[0]*b[1] - a[1]*b[0]
        ];
    }
    // helper subtract
    function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
    // accumulate face normal into vertices (face normal not normalized => area-weighted)
    for (let t = 0; t < indices.length; t += 3) {
        const i0 = indices[t], i1 = indices[t+1], i2 = indices[t+2];
        const p0 = positions[i0], p1 = positions[i1], p2 = positions[i2];
        const e1 = sub(p1, p0), e2 = sub(p2, p0);
        let fn = cross(e1, e2); // magnitude proportional to area
        // add fn to each vertex accumulator
        normals[i0][0] += fn[0]; normals[i0][1] += fn[1]; normals[i0][2] += fn[2];
        normals[i1][0] += fn[0]; normals[i1][1] += fn[1]; normals[i1][2] += fn[2];
        normals[i2][0] += fn[0]; normals[i2][1] += fn[1]; normals[i2][2] += fn[2];
    }

    // normalize per-vertex normals
    function normalize(v) {
        const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
        if (len > 1e-9) return [v[0]/len, v[1]/len, v[2]/len];
        return [0,0,1];
    }
    for (let i = 0; i < nVertices; i++) {
        normals[i] = normalize(normals[i]);
    }

    // pack interleaved attributes: x,y,z, nx,ny,nz
    const interleaved = new Float32Array(nVertices * 6);
    for (let i = 0; i < nVertices; i++) {
        interleaved[i*6 + 0] = positions[i][0];
        interleaved[i*6 + 1] = positions[i][1];
        interleaved[i*6 + 2] = positions[i][2];
        interleaved[i*6 + 3] = normals[i][0];
        interleaved[i*6 + 4] = normals[i][1];
        interleaved[i*6 + 5] = normals[i][2];
    }

    // pack indices into Uint16Array (assume reasonable tessellation)
    data.verticesF32 = interleaved;
    data.indicesU16 = new Uint16Array(indices);
    data.vertexCount = nVertices;
    data.indexCount = data.indicesU16.length;
}