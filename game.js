// Main game logic and cube management

class Cube {
    constructor(x, y, z, color = null) {
        this.position = new Vec3(x, y, z);
        this.rotation = new Vec3(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        this.rotationSpeed = new Vec3(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
        );
        this.scale = 0.5 + Math.random() * 0.5;
        this.color = color || this.generateRandomColor();
        this.alive = true;
        this.clickable = true;
        
        // Animation properties
        this.targetScale = this.scale;
        this.currentScale = this.scale;
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    generateRandomColor() {
        const colors = [
            [1.0, 0.2, 0.2], // Red
            [0.2, 1.0, 0.2], // Green
            [0.2, 0.2, 1.0], // Blue
            [1.0, 1.0, 0.2], // Yellow
            [1.0, 0.2, 1.0], // Magenta
            [0.2, 1.0, 1.0], // Cyan
            [1.0, 0.5, 0.0], // Orange
            [0.5, 0.0, 1.0], // Purple
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update(deltaTime) {
        if (!this.alive) return;

        // Update rotation
        this.rotation.x += this.rotationSpeed.x;
        this.rotation.y += this.rotationSpeed.y;
        this.rotation.z += this.rotationSpeed.z;

        // Update scale animation
        this.pulsePhase += deltaTime * 0.002;
        const pulse = Math.sin(this.pulsePhase) * 0.1 + 1.0;
        this.targetScale = this.scale * pulse;
        this.currentScale = lerp(this.currentScale, this.targetScale, 0.1);
    }

    getModelMatrix() {
        const translation = Mat4.translation(this.position.x, this.position.y, this.position.z);
        const rotationX = Mat4.rotationX(this.rotation.x);
        const rotationY = Mat4.rotationY(this.rotation.y);
        const rotationZ = Mat4.rotationZ(this.rotation.z);
        const scale = Mat4.translation(0, 0, 0); // We'll handle scaling in the vertex shader
        
        // Apply transformations: T * Rz * Ry * Rx * S
        let modelMatrix = Mat4.multiply(translation, rotationZ);
        modelMatrix = Mat4.multiply(modelMatrix, rotationY);
        modelMatrix = Mat4.multiply(modelMatrix, rotationX);
        
        // Apply scaling by modifying the matrix elements
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                modelMatrix.elements[i * 4 + j] *= this.currentScale;
            }
        }
        
        return modelMatrix;
    }

    getColors() {
        // Generate colors for all 24 vertices (6 faces * 4 vertices each)
        const colors = [];
        for (let i = 0; i < 24; i++) {
            colors.push(...this.color);
        }
        return colors;
    }

    destroy() {
        this.alive = false;
        this.clickable = false;
    }

    isPointInside(worldPos) {
        if (!this.clickable) return false;
        
        // Simple bounding box check
        const halfSize = this.currentScale;
        return (
            worldPos.x >= this.position.x - halfSize &&
            worldPos.x <= this.position.x + halfSize &&
            worldPos.y >= this.position.y - halfSize &&
            worldPos.y <= this.position.y + halfSize &&
            worldPos.z >= this.position.z - halfSize &&
            worldPos.z <= this.position.z + halfSize
        );
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.scoreElement = document.getElementById('score');
        this.resetBtn = document.getElementById('resetBtn');
        this.addCubesBtn = document.getElementById('addCubesBtn');
        
        this.setupCanvas();
        this.renderer = new WebGLRenderer(this.canvas);
        
        this.cubes = [];
        this.score = 0;
        this.camera = {
            position: new Vec3(0, 0, 8),
            target: new Vec3(0, 0, 0),
            up: new Vec3(0, 1, 0)
        };
        
        // Mouse interaction
        this.mouse = { x: 0, y: 0, lastX: 0, lastY: 0, isDown: false };
        this.cameraRotation = { x: 0, y: 0 };
        
        this.lastTime = 0;
        this.running = true;
        
        this.setupEventListeners();
        this.initializeCubes();
        this.gameLoop();
    }

    setupCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            const displayWidth = rect.width;
            const displayHeight = rect.height;
            
            if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
                this.canvas.width = displayWidth;
                this.canvas.height = displayHeight;
                if (this.renderer) {
                    this.renderer.resize(displayWidth, displayHeight);
                }
            }
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    setupEventListeners() {
        // Mouse events for camera control and cube clicking
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouse.isDown = true;
            this.mouse.lastX = e.clientX;
            this.mouse.lastY = e.clientY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            
            if (this.mouse.isDown) {
                const deltaX = e.clientX - this.mouse.lastX;
                const deltaY = e.clientY - this.mouse.lastY;
                
                this.cameraRotation.y += deltaX * 0.01;
                this.cameraRotation.x += deltaY * 0.01;
                
                // Clamp vertical rotation
                this.cameraRotation.x = clamp(this.cameraRotation.x, -Math.PI / 2, Math.PI / 2);
                
                this.updateCameraPosition();
                
                this.mouse.lastX = e.clientX;
                this.mouse.lastY = e.clientY;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (this.mouse.isDown && 
                Math.abs(e.clientX - this.mouse.lastX) < 5 && 
                Math.abs(e.clientY - this.mouse.lastY) < 5) {
                // This was a click, not a drag
                this.handleClick(e);
            }
            this.mouse.isDown = false;
        });

        document.addEventListener('mouseup', () => {
            this.mouse.isDown = false;
        });

        // Button events
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.addCubesBtn.addEventListener('click', () => this.addMoreCubes());

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    updateCameraPosition() {
        const distance = 8;
        this.camera.position.x = Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x) * distance;
        this.camera.position.y = Math.sin(this.cameraRotation.x) * distance;
        this.camera.position.z = Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x) * distance;
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = (1 - (e.clientY - rect.top) / rect.height) * 2 - 1;
        
        // Simple ray casting approximation
        // In a real implementation, you'd want proper ray-triangle intersection
        const clickedCube = this.findClickedCube(x, y);
        if (clickedCube) {
            this.destroyCube(clickedCube);
        }
    }

    findClickedCube(screenX, screenY) {
        // Simple approach: find the cube closest to the camera that's roughly in the clicked area
        let closestCube = null;
        let closestDistance = Infinity;
        
        for (const cube of this.cubes) {
            if (!cube.clickable) continue;
            
            // Project cube position to screen space (simplified)
            const viewMatrix = Mat4.lookAt(this.camera.position, this.camera.target, this.camera.up);
            const projMatrix = Mat4.perspective(degToRad(45), this.canvas.width / this.canvas.height, 0.1, 100);
            
            // This is a simplified projection - in a real game you'd want proper screen projection
            const distance = Vec3.subtract(cube.position, this.camera.position).length();
            const screenRadius = cube.currentScale / distance * 2; // Approximate screen size
            
            if (Math.abs(screenX) < screenRadius && Math.abs(screenY) < screenRadius) {
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestCube = cube;
                }
            }
        }
        
        return closestCube;
    }

    destroyCube(cube) {
        cube.destroy();
        this.score += 10;
        this.updateScore();
        
        // Remove destroyed cubes after a short delay for visual effect
        setTimeout(() => {
            this.cubes = this.cubes.filter(c => c.alive);
        }, 100);
    }

    initializeCubes() {
        this.cubes = [];
        for (let i = 0; i < 15; i++) {
            this.addRandomCube();
        }
    }

    addRandomCube() {
        const x = (Math.random() - 0.5) * 10;
        const y = (Math.random() - 0.5) * 6;
        const z = (Math.random() - 0.5) * 6;
        this.cubes.push(new Cube(x, y, z));
    }

    addMoreCubes() {
        for (let i = 0; i < 5; i++) {
            this.addRandomCube();
        }
    }

    resetGame() {
        this.score = 0;
        this.updateScore();
        this.initializeCubes();
        this.cameraRotation = { x: 0, y: 0 };
        this.updateCameraPosition();
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
    }

    gameLoop(currentTime = 0) {
        if (!this.running) return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render(currentTime);
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        // Update all cubes
        for (const cube of this.cubes) {
            cube.update(deltaTime);
        }
    }

    render(time) {
        this.renderer.clear();
        
        // Set up matrices
        const viewMatrix = Mat4.lookAt(this.camera.position, this.camera.target, this.camera.up);
        const projectionMatrix = Mat4.perspective(
            degToRad(45), 
            this.canvas.width / this.canvas.height, 
            0.1, 
            100
        );
        
        // Set global uniforms
        this.renderer.setUniforms({
            viewMatrix: viewMatrix.elements,
            projectionMatrix: projectionMatrix.elements,
            lightPosition: [5, 5, 5],
            lightColor: [1.0, 1.0, 1.0],
            ambientLight: [0.3, 0.3, 0.4],
            time: time * 0.001
        });
        
        // Render all cubes
        for (const cube of this.cubes) {
            if (!cube.alive) continue;
            
            const modelMatrix = cube.getModelMatrix();
            const colors = cube.getColors();
            
            this.renderer.updateColorBuffer(colors);
            this.renderer.setUniforms({
                modelMatrix: modelMatrix.elements,
                normalMatrix: modelMatrix.elements // Simplified - should be inverse transpose
            });
            
            this.renderer.render();
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    try {
        new Game();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #1e3c72; color: white; font-family: Arial;">
                <div style="text-align: center;">
                    <h1>WebGL Not Supported</h1>
                    <p>Your browser doesn't support WebGL or it's disabled.</p>
                    <p>Please try a modern browser like Chrome, Firefox, or Safari.</p>
                </div>
            </div>
        `;
    }
});