import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const sourcePng = path.resolve('native/app-icon.png');
const targetIco = path.resolve('build/icon.ico');
const targetPng = path.resolve('build/icon.png');

if (!fs.existsSync('build')) {
  fs.mkdirSync('build', { recursive: true });
}

// Copy icon.png for Linux / fallback
fs.copyFileSync(sourcePng, targetPng);

const sizes = [16, 32, 48, 64, 128, 256];
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ico-build-'));

const pngBuffers = [];
for (const size of sizes) {
  const resizedPath = path.join(tmpDir, `icon_${size}.png`);
  execSync(`sips -z ${size} ${size} "${sourcePng}" --out "${resizedPath}" >/dev/null 2>&1`);
  pngBuffers.push({
    size,
    buffer: fs.readFileSync(resizedPath),
  });
}

// Build ICO file
// Header: 6 bytes
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // 1 = ICO
header.writeUInt16LE(pngBuffers.length, 4); // Number of images

// Directory: 16 bytes per image
const dirBuffers = [];
let offset = 6 + (16 * pngBuffers.length);

for (const img of pngBuffers) {
  const dir = Buffer.alloc(16);
  dir.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // Width
  dir.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // Height
  dir.writeUInt8(0, 2); // Color palette
  dir.writeUInt8(0, 3); // Reserved
  dir.writeUInt16LE(1, 4); // Color planes
  dir.writeUInt16LE(32, 6); // Bits per pixel
  dir.writeUInt32LE(img.buffer.length, 8); // Image data size
  dir.writeUInt32LE(offset, 12); // Image data offset
  dirBuffers.push(dir);
  offset += img.buffer.length;
}

const finalIco = Buffer.concat([
  header,
  ...dirBuffers,
  ...pngBuffers.map(b => b.buffer),
]);

fs.writeFileSync(targetIco, finalIco);

// Also copy to public/icon.ico and electron/assets/icon.ico if needed
if (!fs.existsSync('electron/assets')) {
  fs.mkdirSync('electron/assets', { recursive: true });
}
fs.writeFileSync(path.resolve('electron/assets/icon.ico'), finalIco);
fs.writeFileSync(path.resolve('electron/assets/icon.png'), fs.readFileSync(sourcePng));

// Clean up tmpDir
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('✅ Successfully generated Windows icon.ico with sizes:', sizes.join(', '));
