// WebGL Game Assessment Demo
// This demonstrates the complexity and capabilities of WebGL game development

class WebGLGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }

        this.setupCanvas();
        this.setupWebGL();
        this.setupShaders();
        this.setupBuffers();
        this.setupGameState();
        this.setupInput();
        this.gameLoop();
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    setupWebGL() {
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.clearColor(0.1, 0.1, 0.2, 1.0);
    }

    setupShaders() {
        // Vertex shader
        const vertexShaderSource = `
            attribute vec3 position;
            attribute vec3 color;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            varying vec3 vColor;
            
            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                vColor = color;
            }
        `;

        // Fragment shader
        const fragmentShaderSource = `
            precision mediump float;
            varying vec3 vColor;
            
            void main() {
                gl_FragColor = vec4(vColor, 1.0);
            }
        `;

        this.program = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);
        this.gl.useProgram(this.program);

        // Get attribute and uniform locations
        this.positionLocation = this.gl.getAttribLocation(this.program, 'position');
        this.colorLocation = this.gl.getAttribLocation(this.program, 'color');
        this.modelViewMatrixLocation = this.gl.getUniformLocation(this.program, 'modelViewMatrix');
        this.projectionMatrixLocation = this.gl.getUniformLocation(this.program, 'projectionMatrix');
    }

    createShaderProgram(vertexSource, fragmentSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Shader program failed to link:', this.gl.getProgramInfoLog(program));
        }

        return program;
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation failed:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    setupBuffers() {
        // Create cube vertices and colors
        this.cubeVertices = new Float32Array([
            // Front face
            -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
            // Back face
            -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
            // Top face
            -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
            // Bottom face
            -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
            // Right face
             1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
            // Left face
            -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1
        ]);

        this.cubeColors = new Float32Array([
            // Front face (red)
            1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
            // Back face (green)
            0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
            // Top face (blue)
            0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
            // Bottom face (yellow)
            1, 1, 0,  1, 1, 0,  1, 1, 0,  1, 1, 0,
            // Right face (purple)
            1, 0, 1,  1, 0, 1,  1, 0, 1,  1, 0, 1,
            // Left face (cyan)
            0, 1, 1,  0, 1, 1,  0, 1, 1,  0, 1, 1
        ]);

        this.cubeIndices = new Uint16Array([
            0,  1,  2,    0,  2,  3,    // front
            4,  5,  6,    4,  6,  7,    // back
            8,  9, 10,    8, 10, 11,    // top
           12, 13, 14,   12, 14, 15,    // bottom
           16, 17, 18,   16, 18, 19,    // right
           20, 21, 22,   20, 22, 23     // left
        ]);

        // Create buffers
        this.vertexBuffer = this.gl.createBuffer();
        this.colorBuffer = this.gl.createBuffer();
        this.indexBuffer = this.gl.createBuffer();

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.cubeVertices, this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.cubeColors, this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.cubeIndices, this.gl.STATIC_DRAW);
    }

    setupGameState() {
        this.camera = {
            x: 0, y: 0, z: 5,
            rotationX: 0, rotationY: 0
        };
        
        this.cubes = [
            { x: 0, y: 0, z: 0, rotation: 0, scale: 1 },
            { x: 3, y: 0, z: 0, rotation: 0, scale: 0.5 },
            { x: -3, y: 0, z: 0, rotation: 0, scale: 0.5 },
            { x: 0, y: 3, z: 0, rotation: 0, scale: 0.5 },
            { x: 0, y: -3, z: 0, rotation: 0, scale: 0.5 }
        ];

        this.score = 0;
        this.lives = 3;
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastTime = 0;
    }

    setupInput() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse input
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        this.canvas.addEventListener('click', (e) => {
            this.shoot();
        });

        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    update(deltaTime) {
        // Camera movement
        if (this.keys['KeyW']) this.camera.z -= 0.1;
        if (this.keys['KeyS']) this.camera.z += 0.1;
        if (this.keys['KeyA']) this.camera.x -= 0.1;
        if (this.keys['KeyD']) this.camera.x += 0.1;
        if (this.keys['Space']) this.camera.y += 0.1;

        // Camera rotation based on mouse
        this.camera.rotationY = (this.mouseX / this.canvas.width - 0.5) * Math.PI;
        this.camera.rotationX = (this.mouseY / this.canvas.height - 0.5) * Math.PI;

        // Rotate cubes
        this.cubes.forEach(cube => {
            cube.rotation += deltaTime * 0.001;
        });
    }

    shoot() {
        // Simple shooting mechanic - add points
        this.score += 10;
        document.getElementById('score').textContent = this.score;
    }

    createMatrix4() {
        return new Float32Array(16);
    }

    identityMatrix(matrix) {
        matrix[0] = 1; matrix[1] = 0; matrix[2] = 0; matrix[3] = 0;
        matrix[4] = 0; matrix[5] = 1; matrix[6] = 0; matrix[7] = 0;
        matrix[8] = 0; matrix[9] = 0; matrix[10] = 1; matrix[11] = 0;
        matrix[12] = 0; matrix[13] = 0; matrix[14] = 0; matrix[15] = 1;
    }

    perspectiveMatrix(matrix, fov, aspect, near, far) {
        const f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
        const rangeInv = 1.0 / (near - far);
        
        matrix[0] = f / aspect; matrix[1] = 0; matrix[2] = 0; matrix[3] = 0;
        matrix[4] = 0; matrix[5] = f; matrix[6] = 0; matrix[7] = 0;
        matrix[8] = 0; matrix[9] = 0; matrix[10] = (near + far) * rangeInv; matrix[11] = -1;
        matrix[12] = 0; matrix[13] = 0; matrix[14] = near * far * rangeInv * 2; matrix[15] = 0;
    }

    translateMatrix(matrix, x, y, z) {
        matrix[12] += matrix[0] * x + matrix[4] * y + matrix[8] * z;
        matrix[13] += matrix[1] * x + matrix[5] * y + matrix[9] * z;
        matrix[14] += matrix[2] * x + matrix[6] * y + matrix[10] * z;
        matrix[15] += matrix[3] * x + matrix[7] * y + matrix[11] * z;
    }

    rotateXMatrix(matrix, angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const m1 = matrix[4], m2 = matrix[5], m3 = matrix[6], m4 = matrix[7];
        matrix[4] = m1 * c + m2 * s;
        matrix[5] = m1 * -s + m2 * c;
        matrix[6] = m3 * c + m4 * s;
        matrix[7] = m3 * -s + m4 * c;
    }

    rotateYMatrix(matrix, angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        const m0 = matrix[0], m1 = matrix[1], m2 = matrix[2], m3 = matrix[3];
        matrix[0] = m0 * c + m2 * -s;
        matrix[1] = m1 * c + m3 * -s;
        matrix[2] = m0 * s + m2 * c;
        matrix[3] = m1 * s + m3 * c;
    }

    scaleMatrix(matrix, x, y, z) {
        matrix[0] *= x; matrix[1] *= x; matrix[2] *= x; matrix[3] *= x;
        matrix[4] *= y; matrix[5] *= y; matrix[6] *= y; matrix[7] *= y;
        matrix[8] *= z; matrix[9] *= z; matrix[10] *= z; matrix[11] *= z;
    }

    render() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // Set up projection matrix
        const projectionMatrix = this.createMatrix4();
        this.perspectiveMatrix(projectionMatrix, 45, this.canvas.width / this.canvas.height, 0.1, 100.0);
        this.gl.uniformMatrix4fv(this.projectionMatrixLocation, false, projectionMatrix);

        // Render each cube
        this.cubes.forEach(cube => {
            const modelViewMatrix = this.createMatrix4();
            this.identityMatrix(modelViewMatrix);

            // Apply camera transformation
            this.translateMatrix(modelViewMatrix, -this.camera.x, -this.camera.y, -this.camera.z);
            this.rotateXMatrix(modelViewMatrix, -this.camera.rotationX);
            this.rotateYMatrix(modelViewMatrix, -this.camera.rotationY);

            // Apply cube transformation
            this.translateMatrix(modelViewMatrix, cube.x, cube.y, cube.z);
            this.rotateYMatrix(modelViewMatrix, cube.rotation);
            this.scaleMatrix(modelViewMatrix, cube.scale, cube.scale, cube.scale);

            this.gl.uniformMatrix4fv(this.modelViewMatrixLocation, false, modelViewMatrix);

            // Set up vertex attributes
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
            this.gl.enableVertexAttribArray(this.positionLocation);
            this.gl.vertexAttribPointer(this.positionLocation, 3, this.gl.FLOAT, false, 0, 0);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
            this.gl.enableVertexAttribArray(this.colorLocation);
            this.gl.vertexAttribPointer(this.colorLocation, 3, this.gl.FLOAT, false, 0, 0);

            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            this.gl.drawElements(this.gl.TRIANGLES, 36, this.gl.UNSIGNED_SHORT, 0);
        });
    }

    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new WebGLGame();
});

// Handle window resize
window.addEventListener('resize', () => {
    const canvas = document.getElementById('gameCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (window.game) {
        window.game.gl.viewport(0, 0, canvas.width, canvas.height);
    }
});