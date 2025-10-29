// Test script to analyze the actual LPK file
const fs = require('fs');

// Read the LPK file
const lpkData = fs.readFileSync('118c38f2-11ef-4566-be23-246731049822.lpk');

console.log('=== LPK File Analysis ===');
console.log('File size:', lpkData.length, 'bytes');
console.log('Header (first 16 bytes):', lpkData.slice(0, 16).toString('hex'));

// Extract ZIP portion
const zipData = lpkData.slice(8);
console.log('ZIP data size:', zipData.length, 'bytes');

// Save ZIP for analysis
fs.writeFileSync('extracted-zip.zip', zipData);

// Try to analyze ZIP structure without JSZip
const zipHeader = zipData.slice(0, 30);
console.log('ZIP header:', zipHeader.toString('hex'));

// Look for file entries
let offset = 0;
const files = [];

while (offset < zipData.length - 30) {
    // Look for local file header signature (PK\x03\x04)
    if (zipData[offset] === 0x50 && zipData[offset + 1] === 0x4B && 
        zipData[offset + 2] === 0x03 && zipData[offset + 3] === 0x04) {
        
        // Parse local file header
        const filenameLength = zipData.readUInt16LE(offset + 26);
        const extraFieldLength = zipData.readUInt16LE(offset + 28);
        const compressedSize = zipData.readUInt32LE(offset + 18);
        const uncompressedSize = zipData.readUInt32LE(offset + 22);
        
        const filename = zipData.slice(offset + 30, offset + 30 + filenameLength).toString();
        
        files.push({
            filename,
            compressedSize,
            uncompressedSize,
            offset: offset + 30 + filenameLength + extraFieldLength
        });
        
        console.log(`Found file: ${filename}`);
        console.log(`  Compressed: ${compressedSize} bytes`);
        console.log(`  Uncompressed: ${uncompressedSize} bytes`);
        
        offset += 30 + filenameLength + extraFieldLength + compressedSize;
    } else {
        offset++;
    }
}

console.log(`\nFound ${files.length} files in LPK archive`);

// Try to extract some data from the files (even if encrypted)
files.forEach(file => {
    console.log(`\n=== Analyzing ${file.filename} ===`);
    
    const fileData = zipData.slice(file.offset, file.offset + Math.min(100, file.compressedSize));
    console.log('First 50 bytes (hex):', fileData.slice(0, 50).toString('hex'));
    
    // Try to find readable strings
    const strings = [];
    let current = '';
    
    for (let i = 0; i < Math.min(1000, file.compressedSize); i++) {
        const byte = zipData[file.offset + i];
        if (byte >= 32 && byte <= 126) {
            current += String.fromCharCode(byte);
        } else {
            if (current.length >= 4) {
                strings.push(current);
            }
            current = '';
        }
    }
    
    if (strings.length > 0) {
        console.log('Readable strings found:', strings.slice(0, 10));
    } else {
        console.log('No readable strings found (likely encrypted/compressed)');
    }
});