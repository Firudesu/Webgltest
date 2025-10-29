/**
 * LPK File Loader for WebGL
 * Supports multiple LPK formats:
 * - Binary LPK files (with header parsing)
 * - ZIP-based LPK files (common asset packages)
 * - JSON-based LPK files (structured data)
 */

class LPKLoader {
    constructor() {
        this.loadedAssets = {
            models: [],
            textures: [],
            materials: [],
            animations: [],
            scenes: [],
            data: {}
        };
    }

    /**
     * Load an LPK file from a File object or URL
     * @param {File|string} fileOrUrl - File object or URL string
     * @returns {Promise<Object>} Parsed LPK data with assets
     */
    async load(fileOrUrl) {
        let arrayBuffer;
        
        if (fileOrUrl instanceof File) {
            arrayBuffer = await this.readFileAsArrayBuffer(fileOrUrl);
        } else {
            arrayBuffer = await this.fetchFile(fileOrUrl);
        }

        // Detect LPK format and parse accordingly
        const format = this.detectFormat(arrayBuffer);
        
        switch (format) {
            case 'zip':
                return await this.parseZIPLPK(arrayBuffer);
            case 'json':
                return await this.parseJSONLPK(arrayBuffer);
            case 'binary':
                return await this.parseBinaryLPK(arrayBuffer);
            default:
                throw new Error(`Unsupported LPK format: ${format}`);
        }
    }

    /**
     * Detect LPK file format
     */
    detectFormat(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        const uint8Array = new Uint8Array(arrayBuffer);

        // Check for ZIP signature (PK)
        if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4B) {
            return 'zip';
        }

        // Check for JSON (starts with { or [)
        const textDecoder = new TextDecoder();
        const start = textDecoder.decode(uint8Array.slice(0, 10));
        if (start.trim().startsWith('{') || start.trim().startsWith('[')) {
            return 'json';
        }

        // Default to binary format
        return 'binary';
    }

    /**
     * Parse ZIP-based LPK file
     */
    async parseZIPLPK(arrayBuffer) {
        // Use JSZip library if available, otherwise fallback
        if (typeof JSZip !== 'undefined') {
            const zip = new JSZip();
            const zipFile = await zip.loadAsync(arrayBuffer);
            
            const result = {
                format: 'zip',
                assets: {},
                metadata: {}
            };

            // Extract manifest if present
            if (zipFile.files['manifest.json']) {
                result.metadata = JSON.parse(await zipFile.files['manifest.json'].async('string'));
            }

            // Process all files in the ZIP
            for (const [filename, file] of Object.entries(zipFile.files)) {
                if (file.dir) continue;

                const ext = filename.split('.').pop().toLowerCase();
                const data = await file.async('arraybuffer');

                // Categorize assets by extension
                if (['gltf', 'glb', 'obj', 'fbx'].includes(ext)) {
                    if (!result.assets.models) result.assets.models = [];
                    result.assets.models.push({
                        filename,
                        data,
                        type: ext
                    });
                } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
                    if (!result.assets.textures) result.assets.textures = [];
                    result.assets.textures.push({
                        filename,
                        data,
                        type: ext
                    });
                } else if (ext === 'json') {
                    const jsonData = JSON.parse(await file.async('string'));
                    result.assets.data[filename] = jsonData;
                }
            }

            return result;
        } else {
            throw new Error('JSZip library required for ZIP-based LPK files. Include: https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        }
    }

    /**
     * Parse JSON-based LPK file
     */
    async parseJSONLPK(arrayBuffer) {
        const textDecoder = new TextDecoder();
        const jsonText = textDecoder.decode(arrayBuffer);
        const jsonData = JSON.parse(jsonText);

        return {
            format: 'json',
            assets: jsonData.assets || {},
            metadata: jsonData.metadata || {},
            data: jsonData.data || {}
        };
    }

    /**
     * Parse binary LPK file
     * Assumes structure: [Header][Asset Table][Asset Data]
     */
    async parseBinaryLPK(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        let offset = 0;

        // Read header (assumed format)
        const magic = String.fromCharCode(...new Uint8Array(arrayBuffer, offset, 4));
        offset += 4;

        if (magic !== 'LPK\0') {
            console.warn('LPK magic number mismatch, attempting to parse anyway...');
            offset = 0;
        }

        const version = view.getUint32(offset, true);
        offset += 4;

        const assetCount = view.getUint32(offset, true);
        offset += 4;

        const result = {
            format: 'binary',
            version,
            assets: {},
            metadata: {}
        };

        // Read asset table
        const assets = [];
        for (let i = 0; i < assetCount; i++) {
            const nameLength = view.getUint16(offset, true);
            offset += 2;

            const nameBytes = new Uint8Array(arrayBuffer, offset, nameLength);
            const name = new TextDecoder().decode(nameBytes);
            offset += nameLength;

            const type = view.getUint32(offset, true);
            offset += 4;

            const size = view.getUint32(offset, true);
            offset += 4;

            const dataOffset = view.getUint32(offset, true);
            offset += 4;

            assets.push({ name, type, size, dataOffset });
        }

        // Extract asset data
        for (const asset of assets) {
            const assetData = arrayBuffer.slice(asset.dataOffset, asset.dataOffset + asset.size);
            
            // Categorize by type
            const ext = asset.name.split('.').pop().toLowerCase();
            
            if (['gltf', 'glb', 'obj', 'fbx'].includes(ext)) {
                if (!result.assets.models) result.assets.models = [];
                result.assets.models.push({
                    filename: asset.name,
                    data: assetData,
                    type: ext
                });
            } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
                if (!result.assets.textures) result.assets.textures = [];
                result.assets.textures.push({
                    filename: asset.name,
                    data: assetData,
                    type: ext
                });
            } else {
                result.assets.data = result.assets.data || {};
                result.assets.data[asset.name] = assetData;
            }
        }

        return result;
    }

    /**
     * Load assets from LPK into Three.js scene
     * @param {Object} lpkData - Parsed LPK data
     * @param {THREE.Scene} scene - Three.js scene
     * @returns {Promise<Object>} Loaded Three.js objects
     */
    async loadIntoScene(lpkData, scene) {
        const textureLoader = new THREE.TextureLoader();
        const gltfLoader = typeof THREE.GLTFLoader !== 'undefined' ? new THREE.GLTFLoader() : null;
        const objLoader = typeof THREE.OBJLoader !== 'undefined' ? new THREE.OBJLoader() : null;

        const loadedObjects = {
            meshes: [],
            textures: [],
            materials: []
        };

        // Load textures
        if (lpkData.assets.textures) {
            for (const textureAsset of lpkData.assets.textures) {
                const blob = new Blob([textureAsset.data], { type: `image/${textureAsset.type}` });
                const url = URL.createObjectURL(blob);

                try {
                    const texture = await new Promise((resolve, reject) => {
                        textureLoader.load(url, resolve, undefined, reject);
                    });

                    texture.name = textureAsset.filename;
                    loadedObjects.textures.push(texture);
                    URL.revokeObjectURL(url);
                } catch (error) {
                    console.error(`Failed to load texture ${textureAsset.filename}:`, error);
                }
            }
        }

        // Load 3D models
        if (lpkData.assets.models) {
            for (const modelAsset of lpkData.assets.models) {
                const blob = new Blob([modelAsset.data], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);

                try {
                    let model;
                    
                    if ((modelAsset.type === 'gltf' || modelAsset.type === 'glb') && gltfLoader) {
                        model = await new Promise((resolve, reject) => {
                            gltfLoader.load(url, resolve, undefined, reject);
                        });
                        if (model && model.scene) {
                            scene.add(model.scene);
                            loadedObjects.meshes.push(model.scene);
                        }
                    } else if (modelAsset.type === 'obj' && objLoader) {
                        model = await new Promise((resolve, reject) => {
                            objLoader.load(url, resolve, undefined, reject);
                        });
                        if (model) {
                            scene.add(model);
                            loadedObjects.meshes.push(model);
                        }
                    } else {
                        console.warn(`Model loader not available for ${modelAsset.type} format`);
                    }

                    URL.revokeObjectURL(url);
                } catch (error) {
                    console.error(`Failed to load model ${modelAsset.filename}:`, error);
                }
            }
        }

        return loadedObjects;
    }

    /**
     * Read file as ArrayBuffer
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Fetch file from URL
     */
    async fetchFile(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch LPK file: ${response.statusText}`);
        }
        return await response.arrayBuffer();
    }

    /**
     * Get asset data by name
     */
    getAsset(lpkData, name) {
        if (lpkData.assets.models) {
            const model = lpkData.assets.models.find(m => m.filename === name);
            if (model) return model;
        }
        if (lpkData.assets.textures) {
            const texture = lpkData.assets.textures.find(t => t.filename === name);
            if (texture) return texture;
        }
        if (lpkData.assets.data) {
            return lpkData.assets.data[name];
        }
        return null;
    }
}
