// WebGL utility functions and shader management

class WebGLRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        this.program = null;
        this.buffers = {};
        this.uniforms = {};
        this.attributes = {};
        
        this.setupGL();
        this.createShaderProgram();
        this.setupBuffers();
    }

    setupGL() {
        const gl = this.gl;
        
        // Set viewport
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Enable depth testing
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        
        // Enable face culling
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        
        // Set clear color
        gl.clearColor(0.1, 0.1, 0.2, 1.0);
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    createShaderProgram() {
        const gl = this.gl;

        // Vertex shader source
        const vertexShaderSource = `
            attribute vec3 aPosition;
            attribute vec3 aNormal;
            attribute vec3 aColor;
            
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uNormalMatrix;
            
            varying vec3 vColor;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
                gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
                
                vColor = aColor;
                vNormal = normalize((uNormalMatrix * vec4(aNormal, 0.0)).xyz);
                vPosition = worldPosition.xyz;
            }
        `;

        // Fragment shader source
        const fragmentShaderSource = `
            precision mediump float;
            
            varying vec3 vColor;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            uniform vec3 uLightPosition;
            uniform vec3 uLightColor;
            uniform vec3 uAmbientLight;
            uniform float uTime;
            
            void main() {
                // Calculate lighting
                vec3 lightDirection = normalize(uLightPosition - vPosition);
                float lightIntensity = max(dot(vNormal, lightDirection), 0.0);
                
                // Add some animation based on time
                float pulse = sin(uTime * 2.0) * 0.1 + 0.9;
                
                vec3 ambient = uAmbientLight * vColor;
                vec3 diffuse = uLightColor * vColor * lightIntensity * pulse;
                
                gl_FragColor = vec4(ambient + diffuse, 1.0);
            }
        `;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Shader program linking error:', gl.getProgramInfoLog(this.program));
            return;
        }

        gl.useProgram(this.program);

        // Get attribute and uniform locations
        this.attributes.position = gl.getAttribLocation(this.program, 'aPosition');
        this.attributes.normal = gl.getAttribLocation(this.program, 'aNormal');
        this.attributes.color = gl.getAttribLocation(this.program, 'aColor');

        this.uniforms.modelMatrix = gl.getUniformLocation(this.program, 'uModelMatrix');
        this.uniforms.viewMatrix = gl.getUniformLocation(this.program, 'uViewMatrix');
        this.uniforms.projectionMatrix = gl.getUniformLocation(this.program, 'uProjectionMatrix');
        this.uniforms.normalMatrix = gl.getUniformLocation(this.program, 'uNormalMatrix');
        this.uniforms.lightPosition = gl.getUniformLocation(this.program, 'uLightPosition');
        this.uniforms.lightColor = gl.getUniformLocation(this.program, 'uLightColor');
        this.uniforms.ambientLight = gl.getUniformLocation(this.program, 'uAmbientLight');
        this.uniforms.time = gl.getUniformLocation(this.program, 'uTime');
    }

    setupBuffers() {
        const gl = this.gl;

        // Create cube geometry
        const positions = [
            // Front face
            -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1,
            // Back face
            -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1, -1,
            // Top face
            -1,  1, -1, -1,  1,  1,  1,  1,  1,  1,  1, -1,
            // Bottom face
            -1, -1, -1,  1, -1, -1,  1, -1,  1, -1, -1,  1,
            // Right face
             1, -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,
            // Left face
            -1, -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1
        ];

        const normals = [
            // Front face
             0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,
            // Back face
             0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,
            // Top face
             0,  1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,
            // Bottom face
             0, -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,
            // Right face
             1,  0,  0,  1,  0,  0,  1,  0,  0,  1,  0,  0,
            // Left face
            -1,  0,  0, -1,  0,  0, -1,  0,  0, -1,  0,  0
        ];

        const indices = [
            0,  1,  2,    0,  2,  3,    // front
            4,  5,  6,    4,  6,  7,    // back
            8,  9,  10,   8,  10, 11,   // top
            12, 13, 14,   12, 14, 15,   // bottom
            16, 17, 18,   16, 18, 19,   // right
            20, 21, 22,   20, 22, 23    // left
        ];

        // Position buffer
        this.buffers.position = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        // Normal buffer
        this.buffers.normal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        // Index buffer
        this.buffers.indices = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        // Color buffer (will be updated per cube)
        this.buffers.color = gl.createBuffer();
    }

    updateColorBuffer(colors) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    }

    setUniforms(uniforms) {
        const gl = this.gl;
        
        if (uniforms.modelMatrix) {
            gl.uniformMatrix4fv(this.uniforms.modelMatrix, false, uniforms.modelMatrix);
        }
        if (uniforms.viewMatrix) {
            gl.uniformMatrix4fv(this.uniforms.viewMatrix, false, uniforms.viewMatrix);
        }
        if (uniforms.projectionMatrix) {
            gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, uniforms.projectionMatrix);
        }
        if (uniforms.normalMatrix) {
            gl.uniformMatrix4fv(this.uniforms.normalMatrix, false, uniforms.normalMatrix);
        }
        if (uniforms.lightPosition) {
            gl.uniform3fv(this.uniforms.lightPosition, uniforms.lightPosition);
        }
        if (uniforms.lightColor) {
            gl.uniform3fv(this.uniforms.lightColor, uniforms.lightColor);
        }
        if (uniforms.ambientLight) {
            gl.uniform3fv(this.uniforms.ambientLight, uniforms.ambientLight);
        }
        if (uniforms.time !== undefined) {
            gl.uniform1f(this.uniforms.time, uniforms.time);
        }
    }

    render() {
        const gl = this.gl;

        // Bind buffers and set up attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.enableVertexAttribArray(this.attributes.position);
        gl.vertexAttribPointer(this.attributes.position, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
        gl.enableVertexAttribArray(this.attributes.normal);
        gl.vertexAttribPointer(this.attributes.normal, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
        gl.enableVertexAttribArray(this.attributes.color);
        gl.vertexAttribPointer(this.attributes.color, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.indices);

        // Draw the cube
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }

    clear() {
        const gl = this.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }
}