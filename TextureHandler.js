// TextureHandler.js
function LoadTexture(url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // // Simple purple fallback texture
    // const fallbackPixels = new Uint8Array([
    //     255, 0, 255, 255,
    //     0, 255, 255, 255,
    //     0, 255, 255, 255,
    //     255, 0, 255, 255
    // ]);
    
    // // Use fallback texture initially
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, fallbackPixels);

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = url;
    
    image.onload = function() {
        console.log("Texture loaded successfully:", url);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        
        // Generate mipmaps if texture dimensions are power of 2
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // For non-power-of-2 textures, use CLAMP_TO_EDGE
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        
        draw(); // Redraw scene after texture loads
    };
    
    image.onerror = function() {
        console.warn("Failed to load texture:", url, "- using fallback texture");
        // Keep using the fallback texture
        draw();
    };
    
    return texture;
}

// Helper function to check if value is power of 2
function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}