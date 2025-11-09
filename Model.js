function Model(name) {
    this.name = name;

    this.iVertexBuffer     = gl.createBuffer();
    this.iNormalBuffer     = gl.createBuffer();
    this.iTangentBuffer    = gl.createBuffer();
    this.iTexCoordsBuffer  = gl.createBuffer();
    this.iIndexBuffer      = gl.createBuffer();
    this.count = 0;

    this.idTextureDiffuse  = null;
    this.idTextureSpecular = null;
    this.idTextureNormal   = null;

    this.BufferData = function(verticesF32, normalsF32, tangentsF32, texcoordsF32, indicesU16) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, verticesF32, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normalsF32, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, tangentsF32, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texcoordsF32, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesU16, gl.STATIC_DRAW);

        this.count = indicesU16.length;
    };

    this.Draw = function() {
        if (this.idTextureDiffuse) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.idTextureDiffuse);
        }
        if (this.idTextureSpecular) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.idTextureSpecular);
        }
        if (this.idTextureNormal) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, this.idTextureNormal);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTangent, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTangent);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordsBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexCoords, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexCoords);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    };  
}

function CreateSurfaceData(data, dr = 0.05, dTheta = Math.PI / 36) {
    let rMin = parseFloat(window.rMin) || 0.25;
    let rMax = parseFloat(window.rMax) || 1.0;

    if (isNaN(dr) || dr <= 0) dr = 0.05;
    if (isNaN(dTheta) || dTheta <= 0) dTheta = Math.PI / 36;

    const numR = Math.max(2, Math.floor((rMax - rMin) / dr) + 1);
    const numTheta = Math.max(3, Math.floor((2 * Math.PI) / dTheta) + 1);

    // store positions as array of vec3
    let positions = new Array(numR * numTheta);
    let texcoords = new Array(numR * numTheta);
    for (let i = 0; i < numR; i++) {
        let r = rMin + i * dr;
        for (let j = 0; j < numTheta; j++) {
            let theta = (j === numTheta - 1) ? 2 * Math.PI : j * dTheta;
            let x = (-Math.cos(theta) / (2 * r)) - (Math.pow(r, 3) * Math.cos(3 * theta)) / 6;
            let y = (Math.sin(theta) / (2 * r)) + (Math.pow(r, 3) * Math.sin(3 * theta)) / 6;
            let z = r * Math.cos(theta);
            positions[i * numTheta + j] = [x, y, z];
            
            // Texture coordinates: u based on r, v based on theta
            let u = (r - rMin) / (rMax - rMin);
            let v = theta / (2 * Math.PI);
            texcoords[i * numTheta + j] = [u, v];
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
    
    // arrays to accumulate weighted normals and tangents
    let normals = new Array(nVertices);
    let tangents = new Array(nVertices);
    for (let i = 0; i < nVertices; i++) {
        normals[i] = [0, 0, 0];
        tangents[i] = [0, 0, 0];
    }

    // helper functions
    function cross(a, b) {
        return [
            a[1]*b[2] - a[2]*b[1],
            a[2]*b[0] - a[0]*b[2],
            a[0]*b[1] - a[1]*b[0]
        ];
    }
    
    function sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
    
    function addTo(a, b) {
        a[0] += b[0]; a[1] += b[1]; a[2] += b[2];
    }

    // accumulate face normals and tangents
    for (let t = 0; t < indices.length; t += 3) {
        const i0 = indices[t], i1 = indices[t+1], i2 = indices[t+2];
        const p0 = positions[i0], p1 = positions[i1], p2 = positions[i2];
        const uv0 = texcoords[i0], uv1 = texcoords[i1], uv2 = texcoords[i2];
        
        // edges of triangle
        const edge1 = sub(p1, p0);
        const edge2 = sub(p2, p0);
        
        // texture coordinate edges
        const deltaUV1 = [uv1[0] - uv0[0], uv1[1] - uv0[1]];
        const deltaUV2 = [uv2[0] - uv0[0], uv2[1] - uv0[1]];
        
        // face normal (area-weighted)
        let fn = cross(edge1, edge2);
        
        // tangent calculation
        const f = 1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV2[0] * deltaUV1[1]);
        let tangent = [
            f * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]),
            f * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]),
            f * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2])
        ];
        
        // add to vertex accumulators
        addTo(normals[i0], fn);
        addTo(normals[i1], fn);
        addTo(normals[i2], fn);
        
        addTo(tangents[i0], tangent);
        addTo(tangents[i1], tangent);
        addTo(tangents[i2], tangent);
    }

    // normalize per-vertex normals and tangents
    function normalize(v) {
        const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
        if (len > 1e-9) return [v[0]/len, v[1]/len, v[2]/len];
        return [0,0,1];
    }
    
    for (let i = 0; i < nVertices; i++) {
        normals[i] = normalize(normals[i]);
        tangents[i] = normalize(tangents[i]);
    }

    // pack data into separate arrays for WebGL
    const verticesF32 = new Float32Array(nVertices * 3);
    const normalsF32 = new Float32Array(nVertices * 3);
    const tangentsF32 = new Float32Array(nVertices * 3);
    const texcoordsF32 = new Float32Array(nVertices * 2);
    
    for (let i = 0; i < nVertices; i++) {
        verticesF32[i*3 + 0] = positions[i][0];
        verticesF32[i*3 + 1] = positions[i][1];
        verticesF32[i*3 + 2] = positions[i][2];
        
        normalsF32[i*3 + 0] = normals[i][0];
        normalsF32[i*3 + 1] = normals[i][1];
        normalsF32[i*3 + 2] = normals[i][2];
        
        tangentsF32[i*3 + 0] = tangents[i][0];
        tangentsF32[i*3 + 1] = tangents[i][1];
        tangentsF32[i*3 + 2] = tangents[i][2];
        
        texcoordsF32[i*2 + 0] = texcoords[i][0];
        texcoordsF32[i*2 + 1] = texcoords[i][1];
    }

    data.verticesF32 = verticesF32;
    data.normalsF32 = normalsF32;
    data.tangentsF32 = tangentsF32;
    data.texcoordsF32 = texcoordsF32;
    data.indicesU16 = new Uint16Array(indices);
    data.vertexCount = nVertices;
    data.indexCount = data.indicesU16.length;
    
    return data;
}