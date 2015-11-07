(function(exports) {
    var LAMBDA_MIN = 360.0;
    var LAMBDA_MAX = 750.0;

    var RayState = function(size) {
        this.size = size;
        
        var posData = new Float32Array(size*size*4);
        var rngData = new Float32Array(size*size*4);
        var rgbData = new Float32Array(size*size*4);
        
        for (var i = 0; i < size*size; ++i) {
            var theta = Math.random()*Math.PI*2.0;
            posData[i*4 + 0] = 0.0;
            posData[i*4 + 1] = 0.0;
            posData[i*4 + 2] = Math.cos(theta);
            posData[i*4 + 3] = Math.sin(theta);
            
            for (var t = 0; t < 4; ++t)
                rngData[i*4 + t] = Math.random()*4194167.0;
            for (var t = 0; t < 4; ++t)
                rgbData[i*4 + t] = 0.0;
        }
        
        this.posTex = new tgl.Texture(size, size, 4, true, false, true, posData);
        this.rngTex = new tgl.Texture(size, size, 4, true, false, true, rngData);
        this.rgbTex = new tgl.Texture(size, size, 4, true, false, true, rgbData);
    }

    RayState.prototype.bind = function(shader) {
        this.posTex.bind(0);
        this.rngTex.bind(1);
        this.rgbTex.bind(2);
        shader.uniformTexture("PosData", this.posTex);
        shader.uniformTexture("RngData", this.rngTex);
        shader.uniformTexture("RgbData", this.rgbTex);
    }

    RayState.prototype.attach = function(fbo) {
        fbo.attachTexture(this.posTex, 0);
        fbo.attachTexture(this.rngTex, 1);
        fbo.attachTexture(this.rgbTex, 2);
    }

    RayState.prototype.detach = function(fbo) {
        fbo.detachTexture(0);
        fbo.detachTexture(1);
        fbo.detachTexture(2);
    }

    var Renderer = function(gl, width, height, scenes) {
        this.gl = gl;
        this.quadVbo = this.createQuadVbo();
        
        this.maxSampleCount = 100000;
        this.spreadType = Renderer.SPREAD_POINT;
        this.emissionSpectrumType = Renderer.SPECTRUM_WHITE;
        this.emitterTemperature = 5000.0;
        this.emitterGas = 0;
        this.currentScene = 0;
        this.needsReset = true;
        
        this.compositeProgram = new tgl.Shader(Shaders, "compose-vert", "compose-frag");
        this.passProgram      = new tgl.Shader(Shaders, "compose-vert",    "pass-frag");
        this.initProgram      = new tgl.Shader(Shaders,    "init-vert",    "init-frag");
        this.rayProgram       = new tgl.Shader(Shaders,     "ray-vert",     "ray-frag");
        this.tracePrograms = []
        for (var i = 0; i < scenes.length; ++i)
            this.tracePrograms.push(new tgl.Shader(Shaders, "trace-vert", scenes[i]));
        
        this.maxPathLength = 12;
        
        this.spectrumTable = wavelengthToRgbTable();
        this.spectrum     = new tgl.Texture(this.spectrumTable.length/4, 1, 4, true,  true, true, this.spectrumTable);
        this.emission     = new tgl.Texture(Renderer.SPECTRUM_SAMPLES,   1, 1, true, false, true, null);
        this.emissionIcdf = new tgl.Texture(Renderer.ICDF_SAMPLES,       1, 1, true, false, true, null);
        this.emissionPdf  = new tgl.Texture(Renderer.SPECTRUM_SAMPLES,   1, 1, true, false, true, null);
        
        this.raySize = 512;
        this.resetActiveBlock();
        this.rayCount = this.raySize*this.raySize;
        this.currentState = 0;
        this.rayStates = [new RayState(this.raySize), new RayState(this.raySize)];
        
        this.rayVbo = new tgl.VertexBuffer();
        this.rayVbo.addAttribute("TexCoord", 3, gl.FLOAT, false);
        this.rayVbo.init(this.rayCount*2);
        
        var vboData = new Float32Array(this.rayCount*2*3);
        for (var i = 0; i < this.rayCount; ++i) {
            var u = ((i % this.raySize) + 0.5)/this.raySize;
            var v = (Math.floor(i/this.raySize) + 0.5)/this.raySize;
            vboData[i*6 + 0] = vboData[i*6 + 3] = u;
            vboData[i*6 + 1] = vboData[i*6 + 4] = v;
            vboData[i*6 + 2] = 0.0;
            vboData[i*6 + 5] = 1.0;
        }
        this.rayVbo.copy(vboData);
        
        this.fbo = new tgl.RenderTarget();
        
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.blendFunc(gl.ONE, gl.ONE);
        
        this.changeResolution(width, height);
        this.setEmitterPos([width/2, height/2], [width/2, height/2]);
        this.computeEmissionSpectrum();
    }

    Renderer.SPECTRUM_WHITE         = 0;
    Renderer.SPECTRUM_INCANDESCENT  = 1;
    Renderer.SPECTRUM_GAS_DISCHARGE = 2;

    Renderer.SPECTRUM_SAMPLES       = 256;
    Renderer.ICDF_SAMPLES           = 1024;

    Renderer.SPREAD_POINT = 0;
    Renderer.SPREAD_CONE  = 1;
    Renderer.SPREAD_BEAM  = 2;
    Renderer.SPREAD_LASER = 3;
    Renderer.SPREAD_AREA  = 4;
    
    Renderer.prototype.resetActiveBlock = function() {
        this.activeBlock = 4;
    }

    Renderer.prototype.setEmissionSpectrumType = function(type) {
        this.emissionSpectrumType = type;
        this.computeEmissionSpectrum();
    }

    Renderer.prototype.setEmitterTemperature = function(temperature) {
        this.emitterTemperature = temperature;
        if (this.emissionSpectrumType == Renderer.SPECTRUM_INCANDESCENT)
            this.computeEmissionSpectrum();
    }

    Renderer.prototype.setEmitterGas = function(gasId) {
        this.emitterGas = gasId;
        if (this.emissionSpectrumType == Renderer.SPECTRUM_GAS_DISCHARGE)
            this.computeEmissionSpectrum();
    }

    Renderer.prototype.computeEmissionSpectrum = function() {
        if (!this.emissionSpectrum)
            this.emissionSpectrum = new Float32Array(Renderer.SPECTRUM_SAMPLES);
        
        switch (this.emissionSpectrumType) {
        case Renderer.SPECTRUM_WHITE:
            for (var i = 0; i < Renderer.SPECTRUM_SAMPLES; ++i)
                this.emissionSpectrum[i] = 1.0;
            break;
        case Renderer.SPECTRUM_INCANDESCENT:
            var h = 6.626070040e-34;
            var c = 299792458.0;
            var kB = 1.3806488e-23;
            var T = this.emitterTemperature;
            
            for (var i = 0; i < Renderer.SPECTRUM_SAMPLES; ++i) {
                var l = (LAMBDA_MIN + (LAMBDA_MAX - LAMBDA_MIN)*(i + 0.5)/Renderer.SPECTRUM_SAMPLES)*1e-9;
                var power = 1e-12*(2.0*h*c*c)/(l*l*l*l*l*(Math.exp(h*c/(l*kB*T)) - 1.0));
                
                this.emissionSpectrum[i] = power;
            }
            break;
        case Renderer.SPECTRUM_GAS_DISCHARGE:
            var wavelengths = GasDischargeLines[this.emitterGas].wavelengths;
            var strengths = GasDischargeLines[this.emitterGas].strengths;
            
            for (var i = 0; i < Renderer.SPECTRUM_SAMPLES; ++i)
                this.emissionSpectrum[i] = 0.0;
            
            for (var i = 0; i < wavelengths.length; ++i) {
                var idx = Math.floor((wavelengths[i] - LAMBDA_MIN)/(LAMBDA_MAX - LAMBDA_MIN)*Renderer.SPECTRUM_SAMPLES);
                if (idx < 0 || idx >= Renderer.SPECTRUM_SAMPLES)
                    continue;
                
                this.emissionSpectrum[idx] += strengths[i];
            }
        }

        this.computeSpectrumIcdf();

        this.emission.bind(0);
        this.emission.copy(this.emissionSpectrum);
        this.reset();
    }
    
    Renderer.prototype.computeSpectrumIcdf = function() {
        if (!this.cdf) {
            this.cdf  = new Float32Array(Renderer.SPECTRUM_SAMPLES + 1);
            this.pdf  = new Float32Array(Renderer.SPECTRUM_SAMPLES);
            this.icdf = new Float32Array(Renderer.ICDF_SAMPLES);
        }
    
        var sum = 0.0;
        for (var i = 0; i < Renderer.SPECTRUM_SAMPLES; ++i)
            sum += this.emissionSpectrum[i];
        
        /* Mix in 10% of a uniform sample distribution to stay on the safe side.
           Especially gas emission spectra with lots of emission lines
           tend to have small peaks that fall through the cracks otherwise */
        var safetyPadding = 0.1;
        var normalization = Renderer.SPECTRUM_SAMPLES/sum;
        
        /* Precompute cdf and pdf (unnormalized for now) */
        this.cdf[0] = 0.0;
        for (var i = 0; i < Renderer.SPECTRUM_SAMPLES; ++i) {
            this.emissionSpectrum[i] *= normalization;  
            
            /* Also take into account the observer response when distributing samples.
               Otherwise tends to prioritize peaks just barely outside the visible spectrum */
            var observerResponse = (1.0/3.0)*(
                Math.abs(this.spectrumTable[i*4]) +
                Math.abs(this.spectrumTable[i*4 + 1]) +
                Math.abs(this.spectrumTable[i*4 + 2]));
            
            this.pdf[i] = observerResponse*(this.emissionSpectrum[i] + safetyPadding)/(1.0 + safetyPadding);
            this.cdf[i + 1] = this.pdf[i] + this.cdf[i];
        }
        
        /* All done! Time to normalize */
        var cdfSum = this.cdf[Renderer.SPECTRUM_SAMPLES];
        for (var i = 0; i < Renderer.SPECTRUM_SAMPLES; ++i) {
            this.pdf[i] *= Renderer.SPECTRUM_SAMPLES/cdfSum;
            this.cdf[i + 1] /= cdfSum;
        }
        /* Make sure we don't fall into any floating point pits */
        this.cdf[Renderer.SPECTRUM_SAMPLES] = 1.0;
        
        /* Precompute an inverted mapping of the cdf. This is biased!
           Unfortunately we can't really afford to do runtime bisection
           on the GPU, so this will have to do. For our purposes a small
           amount of bias is tolerable anyway. */
        var cdfIdx = 0;
        for (var i = 0; i < Renderer.ICDF_SAMPLES; ++i) {
            var target = Math.min((i + 1)/Renderer.ICDF_SAMPLES, 1.0);
            while (this.cdf[cdfIdx] < target)
                cdfIdx++;
            this.icdf[i] = (cdfIdx - 1.0)/Renderer.SPECTRUM_SAMPLES;
        }
        
        this.emissionIcdf.bind(0);
        this.emissionIcdf.copy(this.icdf);
        this.emissionPdf.bind(0);
        this.emissionPdf.copy(this.pdf);
    }

    Renderer.prototype.getEmissionSpectrum = function() {
        return this.emissionSpectrum;
    }
    
    Renderer.prototype.setMaxPathLength = function(length) {
        this.maxPathLength = length;
        this.reset();
    }
    
    Renderer.prototype.setMaxSampleCount = function(count) {
        this.maxSampleCount = count;
    }

    Renderer.prototype.changeResolution = function(width, height) {
        if (this.width && this.height) {
            this.emitterPos[0] = (this.emitterPos[0] + 0.5)*width/this.width - 0.5;
            this.emitterPos[1] = (this.emitterPos[1] + 0.5)*height/this.height - 0.5;
        }
        
        this.width  = width;
        this.height = height;
        this.aspect = this.width/this.height;
        
        this.screenBuffer = new tgl.Texture(this.width, this.height, 4, true, false, true, null);
        this.waveBuffer   = new tgl.Texture(this.width, this.height, 4, true, false, true, null);
        
        this.resetActiveBlock();
        this.reset();
    }
    
    Renderer.prototype.changeScene = function(idx) {
        this.resetActiveBlock();
        this.currentScene = idx;
        this.reset();
    }

    Renderer.prototype.reset = function() {
        if (!this.needsReset)
            return;
        this.needsReset = false;
        this.wavesTraced = 0;
        this.raysTraced = 0;
        this.samplesTraced = 0;
        this.pathLength = 0;
        this.elapsedTimes = [];
        
        this.fbo.bind();
        this.fbo.drawBuffers(1);
        this.fbo.attachTexture(this.screenBuffer, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.fbo.unbind();
    }

    Renderer.prototype.setSpreadType = function(type) {
        this.resetActiveBlock();
        this.spreadType = type;
        this.computeSpread();
        this.reset();
    }
    
    Renderer.prototype.setNormalizedEmitterPos = function(posA, posB) {
        this.setEmitterPos(
            [posA[0]*this.width, posA[1]*this.height],
            [posB[0]*this.width, posB[1]*this.height]
        );
    }

    Renderer.prototype.setEmitterPos = function(posA, posB) {
        this.emitterPos   = this.spreadType == Renderer.SPREAD_POINT ? posB : posA;
        this.emitterAngle = this.spreadType == Renderer.SPREAD_POINT ? 0.0  : Math.atan2(posB[1] - posA[1], posB[0] - posA[0]);
        this.computeSpread();
        this.reset();
    }

    Renderer.prototype.computeSpread = function() {
        switch(this.spreadType) {
        case Renderer.SPREAD_POINT:
            this.emitterPower = 0.1;
            this.spatialSpread = 0.0;
            this.angularSpread = [0.0, Math.PI*2.0];
            break;
        case Renderer.SPREAD_CONE:
            this.emitterPower = 0.03;
            this.spatialSpread = 0.0;
            this.angularSpread = [this.emitterAngle, Math.PI*0.3];
            break;
        case Renderer.SPREAD_BEAM:
            this.emitterPower = 0.03;
            this.spatialSpread = 0.4;
            this.angularSpread = [this.emitterAngle, 0.0];
            break;
        case Renderer.SPREAD_LASER:
            this.emitterPower = 0.05;
            this.spatialSpread = 0.0;
            this.angularSpread = [this.emitterAngle, 0.0];
            break;
        case Renderer.SPREAD_AREA:
            this.emitterPower = 0.1;
            this.spatialSpread = 0.4;
            this.angularSpread = [this.emitterAngle, Math.PI];
            break;
        }
    }

    Renderer.prototype.createQuadVbo = function() {
        var vbo = new tgl.VertexBuffer();
        vbo.addAttribute("Position", 3, this.gl.FLOAT, false);
        vbo.addAttribute("TexCoord", 2, this.gl.FLOAT, false);
        vbo.init(4);
        vbo.copy(new Float32Array([
             1.0,  1.0, 0.0, 1.0, 1.0,
            -1.0,  1.0, 0.0, 0.0, 1.0,
            -1.0, -1.0, 0.0, 0.0, 0.0,
             1.0, -1.0, 0.0, 1.0, 0.0
        ]));
        
        return vbo;
    }

    Renderer.prototype.totalRaysTraced = function() {
        return this.raysTraced;
    }

    Renderer.prototype.maxRayCount = function() {
        return this.maxPathLength*this.maxSampleCount;
    }

    Renderer.prototype.totalSamplesTraced = function() {
        return this.samplesTraced;
    }

    Renderer.prototype.progress = function() {
        return Math.min(this.totalRaysTraced()/this.maxRayCount(), 1.0);
    }

    Renderer.prototype.finished = function() {
        return this.totalSamplesTraced() >= this.maxSampleCount;
    }

    Renderer.prototype.composite = function() {
        this.screenBuffer.bind(0);
        this.compositeProgram.bind();
        this.compositeProgram.uniformTexture("Frame", this.screenBuffer);
        this.compositeProgram.uniformF("Exposure", this.width/(Math.max(this.samplesTraced, this.raySize*this.activeBlock)));
        this.quadVbo.draw(this.compositeProgram, this.gl.TRIANGLE_FAN);
    }

    Renderer.prototype.render = function(timestamp) {
        this.needsReset = true;
        this.elapsedTimes.push(timestamp);

        var current = this.currentState;
        var next    = 1 - current;
        
        this.fbo.bind();
        
        var gl = this.gl;
        gl.viewport(0, 0, this.raySize, this.raySize);
        gl.scissor(0, 0, this.raySize, this.activeBlock);
        gl.enable(gl.SCISSOR_TEST);
        this.fbo.drawBuffers(3);
        this.rayStates[next].attach(this.fbo);
        this.quadVbo.bind();
        
        if (this.pathLength == 0) {
            this.initProgram.bind();
            this.rayStates[current].rngTex.bind(0);
            this.spectrum.bind(1);
            this.emission.bind(2);
            this.emissionIcdf.bind(3);
            this.emissionPdf.bind(4);
            this.initProgram.uniformTexture("RngData", this.rayStates[current].rngTex);
            this.initProgram.uniformTexture("Spectrum", this.spectrum);
            this.initProgram.uniformTexture("Emission", this.emission);
            this.initProgram.uniformTexture("ICDF", this.emissionIcdf);
            this.initProgram.uniformTexture("PDF", this.emissionPdf);
            this.initProgram.uniform2F("EmitterPos", ((this.emitterPos[0]/this.width)*2.0 - 1.0)*this.aspect, 1.0 - (this.emitterPos[1]/this.height)*2.0);
            this.initProgram.uniform2F("EmitterDir", Math.cos(this.angularSpread[0]), -Math.sin(this.angularSpread[0]));
            this.initProgram.uniformF("EmitterPower", this.emitterPower);
            this.initProgram.uniformF("SpatialSpread", this.spatialSpread);
            this.initProgram.uniform2F("AngularSpread", -this.angularSpread[0], this.angularSpread[1]);
            this.quadVbo.draw(this.initProgram, gl.TRIANGLE_FAN);
            
            current = 1 - current;
            next    = 1 - next;
            this.rayStates[next].attach(this.fbo);
        }
        
        var traceProgram = this.tracePrograms[this.currentScene];
        traceProgram.bind();
        this.rayStates[current].bind(traceProgram);
        this.quadVbo.draw(traceProgram, gl.TRIANGLE_FAN);
        
        this.rayStates[next].detach(this.fbo);
        
        gl.disable(gl.SCISSOR_TEST);
        gl.viewport(0, 0, this.width, this.height);
        
        this.fbo.drawBuffers(1);
        this.fbo.attachTexture(this.waveBuffer, 0);
        
        if (this.pathLength == 0 || this.wavesTraced == 0)
            gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.enable(gl.BLEND);
        
        this.rayProgram.bind();
        this.rayStates[current].posTex.bind(0);
        this.rayStates[   next].posTex.bind(1);
        this.rayStates[current].rgbTex.bind(2);
        this.rayProgram.uniformTexture("PosDataA", this.rayStates[current].posTex);
        this.rayProgram.uniformTexture("PosDataB", this.rayStates[   next].posTex);
        this.rayProgram.uniformTexture("RgbData",  this.rayStates[current].rgbTex);
        this.rayProgram.uniformF("Aspect", this.aspect);
        this.rayVbo.bind();
        this.rayVbo.draw(this.rayProgram, gl.LINES, this.raySize*this.activeBlock*2);
        
        this.raysTraced += this.raySize*this.activeBlock;
        this.pathLength += 1;
        
        this.quadVbo.bind();
        
        if (this.pathLength == this.maxPathLength || this.wavesTraced == 0) {
            this.fbo.attachTexture(this.screenBuffer, 0);
            
            this.waveBuffer.bind(0);
            this.passProgram.bind();
            this.passProgram.uniformTexture("Frame", this.waveBuffer);
            this.quadVbo.draw(this.passProgram, gl.TRIANGLE_FAN);
        
            if (this.pathLength == this.maxPathLength) {
                this.samplesTraced += this.raySize*this.activeBlock
                this.wavesTraced += 1;
                this.pathLength = 0;
                
                if (this.elapsedTimes.length > 5) {
                    var avgTime = 0;
                    for (var i = 1; i < this.elapsedTimes.length; ++i)
                        avgTime += this.elapsedTimes[i] - this.elapsedTimes[i - 1];
                    avgTime /= this.elapsedTimes.length - 1;
                    
                    /* Let's try to stay at reasonable frame times. Targeting 16ms is
                       a bit tricky because there's a lot of variability in how often
                       the browser executes this loop and 16ms might well not be
                       reachable, but 24ms seems to do ok */
                    if (avgTime > 24.0)
                        this.activeBlock = Math.max(4, this.activeBlock - 4);
                    else
                        this.activeBlock = Math.min(512, this.activeBlock + 4);
                    
                    this.elapsedTimes = [this.elapsedTimes[this.elapsedTimes.length - 1]];
                }
            }
        }
        
        gl.disable(gl.BLEND);
        
        this.fbo.unbind();
        
        this.composite();
        
        this.currentState = next;
    }

    SpectrumRenderer = function(canvas, spectrum) {
        this.canvas = canvas;
        this.context = this.canvas.getContext('2d');
        this.spectrum = spectrum;
        this.smooth = true;
        
        this.spectrumFill = new Image();
        this.spectrumFill.src = 'Spectrum.png';
        this.spectrumFill.addEventListener('load', this.loadPattern.bind(this));
        if (this.spectrumFill.complete)
            this.loadPattern();
    }

    SpectrumRenderer.prototype.setSpectrum = function(spectrum) {
        this.spectrum = spectrum;
        this.draw();
    }

    SpectrumRenderer.prototype.loadPattern = function() {
        this.pattern = this.context.createPattern(this.spectrumFill, 'repeat-y');
        this.draw();
    }

    SpectrumRenderer.prototype.setColor = function(r, g, b) {
        this.context.strokeStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    SpectrumRenderer.prototype.drawLine = function(p) {
        this.context.moveTo(p[0], p[1]);
        for (var i = 2; i < p.length; i += 2)
            this.context.lineTo(p[i], p[i + 1]);
    }

    SpectrumRenderer.prototype.setSmooth = function(smooth) {
        this.smooth = smooth;
    }

    SpectrumRenderer.prototype.draw = function() {
        var ctx = this.context;
        
        var w = this.canvas.width;
        var h = this.canvas.height;
        var marginX = 10;
        var marginY = 20;
        
        ctx.clearRect(0, 0, w, h);
        
        var graphW = w - 2*marginX;
        var graphH = h - 2*marginY;
        var graphX = 0*0.5 + marginX;
        var graphY = 0*0.5 + h - marginY;
        
        var axisX0 = 360;
        var axisX1 = 750;
        var axisY0 = 0.0;
        var axisY1 = 1.0;
        var xTicks = 50.0;
        var yTicks = 0.2;
        var tickSize = 10;
        
        var mapX = function(x) { return graphX + Math.floor(graphW*(x - axisX0)/(axisX1 - axisX0)); };
        var mapY = function(y) { return graphY - Math.floor(graphH*(y - axisY0)/(axisY1 - axisY0)); };
        
        ctx.beginPath();
        this.setColor(128, 128, 128);
        ctx.lineWidth = 1;
        ctx.setLineDash([1, 2]);
        for (var gx = axisX0 - 10 + xTicks; gx <= axisX1; gx += xTicks)
            this.drawLine([mapX(gx), graphY, mapX(gx), graphY - graphH]);
        for (var gy = axisY0 + yTicks; gy <= axisY1; gy += yTicks)
            this.drawLine([graphX, mapY(gy), graphX + graphW, mapY(gy)]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        var max = 0.0;
        for (var i = 0; i < this.spectrum.length; ++i)
            max = Math.max(this.spectrum[i], max);
        max *= 1.1;
            
        var grapher = this;
        var drawGraph = function() {
            var spectrum = grapher.spectrum;
            var path = new Path2D();
            path.moveTo(0, h);
            for (var gx = axisX0; gx <= axisX1; gx += grapher.smooth ? 15 : 1) {
                var x = mapX(gx);
                var sx = spectrum.length*(gx - LAMBDA_MIN)/(LAMBDA_MAX - LAMBDA_MIN);
                var y = mapY(spectrum[Math.max(Math.min(Math.floor(sx), spectrum.length - 1), 0)]/max);
                if (gx == axisX0)
                    path.moveTo(x, y);
                else
                    path.lineTo(x, y);
            }
            return path;
        };
        
        var filled = drawGraph();
        filled.lineTo(graphX + graphW, graphY);
        filled.lineTo(graphX, graphY);
        ctx.fillStyle = this.pattern;
        ctx.fill(filled);
        ctx.fillStyle = "black";
        
        var outline = drawGraph();
        this.setColor(0, 0, 0);
        ctx.lineWidth = 2;
        ctx.stroke(outline);
        
        ctx.beginPath();
        this.setColor(128, 128, 128);
        ctx.lineWidth = 2;
        this.drawLine([
            graphX + graphW, graphY - tickSize,
            graphX + graphW, graphY,
            graphX, graphY,
            graphX, graphY - graphH,
            graphX + tickSize, graphY - graphH
        ]);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.lineWidth = 2;
        for (var gx = axisX0 - 10 + xTicks; gx < axisX1; gx += xTicks)
            this.drawLine([mapX(gx), graphY, mapX(gx), graphY - tickSize]);
        for (var gy = axisY0 + yTicks; gy < axisY1; gy += yTicks)
            this.drawLine([graphX, mapY(gy), graphX + tickSize, mapY(gy)]);
        ctx.stroke();
        
        ctx.font = "15px serif";
        ctx.textAlign = "center";
        for (var gx = axisX0 - 10 + xTicks; gx < axisX1; gx += xTicks)
            ctx.fillText(gx, mapX(gx), graphY + 15);
        ctx.fillText("λ", graphX + graphW, graphY + 16);
    }
    
    exports.Renderer = Renderer;
    exports.SpectrumRenderer = SpectrumRenderer;
})(window.tcore = window.tcore || {});