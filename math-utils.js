// 3D Math utilities for WebGL

class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static add(a, b) {
        return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
    }

    static subtract(a, b) {
        return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    static multiply(v, scalar) {
        return new Vec3(v.x * scalar, v.y * scalar, v.z * scalar);
    }

    static dot(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    static cross(a, b) {
        return new Vec3(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
        const len = this.length();
        if (len === 0) return new Vec3();
        return new Vec3(this.x / len, this.y / len, this.z / len);
    }
}

class Mat4 {
    constructor() {
        this.elements = new Float32Array(16);
        this.identity();
    }

    identity() {
        this.elements.fill(0);
        this.elements[0] = 1;
        this.elements[5] = 1;
        this.elements[10] = 1;
        this.elements[15] = 1;
        return this;
    }

    static perspective(fov, aspect, near, far) {
        const mat = new Mat4();
        const f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
        const rangeInv = 1.0 / (near - far);

        mat.elements[0] = f / aspect;
        mat.elements[5] = f;
        mat.elements[10] = (near + far) * rangeInv;
        mat.elements[11] = -1;
        mat.elements[14] = near * far * rangeInv * 2;
        mat.elements[15] = 0;
        return mat;
    }

    static lookAt(eye, target, up) {
        const mat = new Mat4();
        const zAxis = Vec3.subtract(eye, target).normalize();
        const xAxis = Vec3.cross(up, zAxis).normalize();
        const yAxis = Vec3.cross(zAxis, xAxis).normalize();

        mat.elements[0] = xAxis.x;
        mat.elements[1] = xAxis.y;
        mat.elements[2] = xAxis.z;
        mat.elements[3] = 0;
        mat.elements[4] = yAxis.x;
        mat.elements[5] = yAxis.y;
        mat.elements[6] = yAxis.z;
        mat.elements[7] = 0;
        mat.elements[8] = zAxis.x;
        mat.elements[9] = zAxis.y;
        mat.elements[10] = zAxis.z;
        mat.elements[11] = 0;
        mat.elements[12] = -Vec3.dot(xAxis, eye);
        mat.elements[13] = -Vec3.dot(yAxis, eye);
        mat.elements[14] = -Vec3.dot(zAxis, eye);
        mat.elements[15] = 1;
        return mat;
    }

    static translation(x, y, z) {
        const mat = new Mat4();
        mat.elements[12] = x;
        mat.elements[13] = y;
        mat.elements[14] = z;
        return mat;
    }

    static rotationX(angle) {
        const mat = new Mat4();
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        mat.elements[5] = c;
        mat.elements[6] = s;
        mat.elements[9] = -s;
        mat.elements[10] = c;
        return mat;
    }

    static rotationY(angle) {
        const mat = new Mat4();
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        mat.elements[0] = c;
        mat.elements[2] = -s;
        mat.elements[8] = s;
        mat.elements[10] = c;
        return mat;
    }

    static rotationZ(angle) {
        const mat = new Mat4();
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        mat.elements[0] = c;
        mat.elements[1] = s;
        mat.elements[4] = -s;
        mat.elements[5] = c;
        return mat;
    }

    static multiply(a, b) {
        const mat = new Mat4();
        const ae = a.elements;
        const be = b.elements;
        const te = mat.elements;

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                te[i * 4 + j] = 
                    ae[i * 4 + 0] * be[0 * 4 + j] +
                    ae[i * 4 + 1] * be[1 * 4 + j] +
                    ae[i * 4 + 2] * be[2 * 4 + j] +
                    ae[i * 4 + 3] * be[3 * 4 + j];
            }
        }
        return mat;
    }

    multiply(other) {
        const result = Mat4.multiply(this, other);
        this.elements = result.elements;
        return this;
    }
}

// Utility functions
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

function radToDeg(radians) {
    return radians * 180 / Math.PI;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}