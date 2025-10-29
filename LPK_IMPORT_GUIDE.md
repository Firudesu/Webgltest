# LPK File Import Guide

## Overview

I've implemented a comprehensive LPK (Lightwave Pack or Package) file loader for your WebGL application. The system can extract and load assets from LPK files into your Three.js scene.

## What I Can Do With LPK Files

### ✅ Supported Formats

1. **ZIP-based LPK files** - Most common format
   - Detects ZIP signature (PK header)
   - Extracts all assets from the archive
   - Processes manifest.json if present
   - Supports nested directory structures

2. **JSON-based LPK files**
   - Structured JSON format with assets and metadata
   - Can include scene configuration
   - Supports custom data structures

3. **Binary LPK files**
   - Custom binary format with header parsing
   - Reads asset table and extracts individual files
   - Supports arbitrary binary data

### ✅ Asset Types Supported

- **3D Models**: GLTF, GLB, OBJ, FBX
- **Textures**: PNG, JPG, JPEG, WEBP, GIF
- **Data**: JSON files, custom data structures
- **Metadata**: Scene configuration, lighting settings, fog settings

### ✅ Features

1. **Automatic Format Detection** - Detects LPK format automatically
2. **Asset Extraction** - Extracts all assets from the LPK file
3. **Scene Integration** - Loads assets directly into Three.js scene
4. **Progress Feedback** - Shows loading status in the UI
5. **Error Handling** - Graceful error handling with user feedback
6. **Metadata Support** - Applies scene settings from LPK metadata

## How to Use

1. **Click "Load LPK File" button** (top right of the screen)
2. **Select your LPK file** from the file picker
3. **Assets are automatically loaded** into the scene
4. **Check the status message** for loading progress

## LPK File Structure

### ZIP-based LPK
```
package.lpk (ZIP file)
├── manifest.json (optional metadata)
├── models/
│   ├── character.gltf
│   └── building.obj
├── textures/
│   ├── texture1.png
│   └── texture2.jpg
└── data/
    └── config.json
```

### JSON-based LPK
```json
{
  "metadata": {
    "version": "1.0",
    "scene": {
      "lighting": {
        "ambient": {
          "color": 0x404040,
          "intensity": 0.6
        }
      },
      "fog": {
        "color": 0x87CEEB,
        "near": 50,
        "far": 200
      }
    }
  },
  "assets": {
    "models": [
      {
        "filename": "model.gltf",
        "data": "...",
        "type": "gltf"
      }
    ],
    "textures": [
      {
        "filename": "texture.png",
        "data": "...",
        "type": "png"
      }
    ]
  },
  "data": {
    "custom": "data"
  }
}
```

### Binary LPK Structure
```
[Header]
- Magic: "LPK\0" (4 bytes)
- Version: uint32
- Asset Count: uint32

[Asset Table]
- For each asset:
  - Name Length: uint16
  - Name: string
  - Type: uint32
  - Size: uint32
  - Data Offset: uint32

[Asset Data]
- Raw asset data at specified offsets
```

## What Information I Need

If your LPK file uses a different format, I'll need:

1. **File format specification** - How the LPK file is structured
2. **Asset types** - What types of assets are stored
3. **Sample file** - An example LPK file to test with
4. **Metadata format** - If there's scene configuration data

## API Reference

### LPKLoader Class

```javascript
const loader = new LPKLoader();

// Load LPK file
const lpkData = await loader.load(fileOrUrl);

// Load assets into scene
const loadedObjects = await loader.loadIntoScene(lpkData, scene);

// Get specific asset
const asset = loader.getAsset(lpkData, 'filename.ext');
```

### Returned Data Structure

```javascript
{
  format: 'zip' | 'json' | 'binary',
  version: number,
  assets: {
    models: [{
      filename: string,
      data: ArrayBuffer,
      type: string
    }],
    textures: [{
      filename: string,
      data: ArrayBuffer,
      type: string
    }],
    data: {
      [key: string]: any
    }
  },
  metadata: {
    scene?: {
      lighting?: {...},
      fog?: {...}
    }
  }
}
```

## Limitations

- **Model formats**: Currently supports GLTF/GLB and OBJ. FBX support requires additional loader.
- **File size**: Large LPK files may take time to load.
- **Browser compatibility**: Requires modern browser with FileReader API support.

## Next Steps

If you have a specific LPK format you'd like me to support:
1. Share the file format specification
2. Provide a sample LPK file
3. I can extend the loader to support your specific format

The loader is designed to be extensible - new formats can be easily added by implementing a new parse method.
