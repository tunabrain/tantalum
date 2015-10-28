var tgl = {'init': function(gl, multiBufExt) {
    function glTypeSize(type) {
        switch (type) {
        case gl.BYTE:
        case gl.UNSIGNED_BYTE:
            return 1;
        case gl.SHORT:
        case gl.UNSIGNED_SHORT:
            return 2;
        case gl.INT:
        case gl.UNSIGNED_INT:
        case gl.FLOAT:
            return 4;
        default:
            return 0;
        }
    }
    
    tgl.Texture = function(width, height, channels, isFloat, isLinear, isClamped, texels) {
        var coordMode   = isClamped ? gl.CLAMP_TO_EDGE : gl.REPEAT;
        this.type       = isFloat   ? gl.FLOAT         : gl.UNSIGNED_BYTE;
        this.format     = [gl.LUMINANCE, gl.RG, gl.RGB, gl.RGBA][channels - 1];
        
        this.width  = width;
        this.height = height;
    
        this.glName = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.glName);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.width, this.height, 0, this.format, this.type, texels);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, coordMode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, coordMode);
        this.setSmooth(isLinear);
        
        this.boundUnit = -1;
    }
    
    tgl.Texture.prototype.setSmooth = function(smooth) {
        var interpMode = smooth ? gl.LINEAR : gl.NEAREST;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, interpMode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, interpMode);
    }
    
    tgl.Texture.prototype.copy = function(texels) {
        gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.width, this.height, 0, this.format, this.type, texels);
    }
    
    tgl.Texture.prototype.bind = function(unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, this.glName);
        this.boundUnit = unit;
    }
    
    tgl.RenderTarget = function() {
        this.glName = gl.createFramebuffer();
    }
    
    tgl.RenderTarget.prototype.bind = function() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.glName);
    }
    
    tgl.RenderTarget.prototype.unbind = function() {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    tgl.RenderTarget.prototype.attachTexture = function(texture, index) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture.glName, 0);
    }
    
    tgl.RenderTarget.prototype.detachTexture = function(index) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, null, 0);
    }
    
    tgl.RenderTarget.prototype.drawBuffers = function(numBufs) {
        var buffers = [];
        for (var i = 0; i < numBufs; ++i)
            buffers.push(gl.COLOR_ATTACHMENT0 + i);
        multiBufExt.drawBuffersWEBGL(buffers);
    }
    
    tgl.Shader = function(shaderDict, vert, frag) {
        this.vertex   = this.createShaderObject(shaderDict, vert, false);
        this.fragment = this.createShaderObject(shaderDict, frag, true);
        
        this.program = gl.createProgram();
        gl.attachShader(this.program, this.vertex);
        gl.attachShader(this.program, this.fragment);
        gl.linkProgram(this.program);
        
        this.uniforms = {};

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
            alert("Could not initialise shaders");
    }
    
    tgl.Shader.prototype.bind = function() {
        gl.useProgram(this.program);
    }
    
    tgl.Shader.prototype.createShaderObject = function(shaderDict, name, isFragment) {
        var shaderSource = this.resolveShaderSource(shaderDict, name);
        var shaderObject = gl.createShader(isFragment ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER);
        gl.shaderSource(shaderObject, shaderSource);
        gl.compileShader(shaderObject);

        if (!gl.getShaderParameter(shaderObject, gl.COMPILE_STATUS)) {
            /* Add some line numbers for convenience */
            var lines = shaderSource.split("\n");
            for (var i = 0; i < lines.length; ++i)
                lines[i] = ("   " + (i + 1)).slice(-4) + " | " + lines[i];
            shaderSource = lines.join("\n");
        
            throw new Error(
                (isFragment ? "Fragment" : "Vertex") + " shader compilation error for shader '" + name + "':\n\n    " +
                gl.getShaderInfoLog(shaderObject).split("\n").join("\n    ") +
                "\nThe expanded shader source code was:\n\n" +
                shaderSource);
        }

        return shaderObject;
    }
    
    tgl.Shader.prototype.resolveShaderSource = function(shaderDict, name) {
        if (!(name in shaderDict))
            throw new Error("Unable to find shader source for '" + name + "'");
        var shaderSource = shaderDict[name];
        
        /* Rudimentary include handling for convenience.
           Not the most robust, but it will do for our purposes */
        var pattern = new RegExp('#include "(.+)"');
        var match;
        while (match = pattern.exec(shaderSource)) {
            shaderSource = shaderSource.slice(0, match.index) +
                           this.resolveShaderSource(shaderDict, match[1]) +
                           shaderSource.slice(match.index + match[0].length);
        }
        
        return shaderSource;
    }
    
    tgl.Shader.prototype.uniformIndex = function(name) {
        if (!(name in this.uniforms))
            this.uniforms[name] = gl.getUniformLocation(this.program, name);
        return this.uniforms[name];
    }
    
    tgl.Shader.prototype.uniformTexture = function(name, texture) {
        var id = this.uniformIndex(name);
        if (id != -1)
            gl.uniform1i(id, texture.boundUnit);
    }
    
    tgl.Shader.prototype.uniformF = function(name, f) {
        var id = this.uniformIndex(name);
        if (id != -1)
            gl.uniform1f(id, f);
    }
    
    tgl.Shader.prototype.uniform2F = function(name, f1, f2) {
        var id = this.uniformIndex(name);
        if (id != -1)
            gl.uniform2f(id, f1, f2);
    }
    
    tgl.VertexBuffer = function() {
        this.attributes = [];
        this.elementSize = 0;
    }
    
    tgl.VertexBuffer.prototype.bind = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glName);
    }
    
    tgl.VertexBuffer.prototype.addAttribute = function(name, size, type, norm) {
        this.attributes.push({
            "name": name,
            "size": size,
            "type": type,
            "norm": norm,
            "offset": this.elementSize,
            "index": -1
        });
        this.elementSize += size*glTypeSize(type);
    }
    
    tgl.VertexBuffer.prototype.init = function(numVerts) {
        this.length = numVerts;
        this.glName = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glName);
        gl.bufferData(gl.ARRAY_BUFFER, this.length*this.elementSize, gl.STATIC_DRAW);
    }
    
    tgl.VertexBuffer.prototype.copy = function(data) {
        if (data.byteLength != this.length*this.elementSize)
            throw new Error("Resizing VBO during copy strongly discouraged");
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    }
    
    tgl.VertexBuffer.prototype.draw = function(shader, mode, length) {
        for (var i = 0; i < this.attributes.length; ++i) {
            this.attributes[i].index = gl.getAttribLocation(shader.program, this.attributes[i].name);
            if (this.attributes[i].index >= 0) {
                var attr = this.attributes[i];
                gl.enableVertexAttribArray(attr.index);
                gl.vertexAttribPointer(attr.index, attr.size, attr.type, attr.norm, this.elementSize, attr.offset);
            }
        }
        
        gl.drawArrays(mode, 0, length ? length : this.length);
        
        for (var i = 0; i < this.attributes.length; ++i) {
            if (this.attributes[i].index >= 0) {
                gl.disableVertexAttribArray(this.attributes[i].index);
                this.attributes[i].index = -1;
            }
        }
    }
}};