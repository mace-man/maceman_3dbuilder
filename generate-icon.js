import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height) {
  // RGBA buffer with filter byte per row
  const rowSize = width * 4 + 1;
  const rawBuffer = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const r = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawBuffer[rowOffset] = 0; // Filter type None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded rectangle for icon background
      const cornerR = 90;
      const boxW = width * 0.42;
      const boxH = height * 0.42;
      const qx = Math.max(0, Math.abs(dx) - (boxW - cornerR));
      const qy = Math.max(0, Math.abs(dy) - (boxH - cornerR));
      const boxDist = Math.sqrt(qx * qx + qy * qy) - cornerR;

      if (boxDist <= 0) {
        // Background gradient: Deep modern slate/indigo to dark cyan (#181b2a -> #0e2a38)
        const t = (x + y) / (width + height);
        let bgR = Math.round(20 * (1 - t) + 12 * t);
        let bgG = Math.round(28 * (1 - t) + 40 * t);
        let bgB = Math.round(48 * (1 - t) + 65 * t);

        // Border glow
        if (boxDist > -4) {
          const edge = (boxDist + 4) / 4;
          bgR = Math.round(bgR * (1 - edge) + 0 * edge);
          bgG = Math.round(bgG * (1 - edge) + 180 * edge);
          bgB = Math.round(bgB * (1 - edge) + 255 * edge);
        }

        // Isometric 3D Cube / Mace icon in center
        // Center isometric cube:
        // Top face, Left face, Right face
        const ix = dx / 1.2;
        const iy = dy / 1.2;
        const cubeSize = 100;

        // Isom projection:
        // Top vertex: (0, -cubeSize)
        // Center: (0, 0)
        // Bottom: (0, cubeSize)
        // Left: (-cubeSize * 0.866, -cubeSize * 0.5)
        // Right: (cubeSize * 0.866, -cubeSize * 0.5)
        // Bottom-Left: (-cubeSize * 0.866, cubeSize * 0.5)
        // Bottom-Right: (cubeSize * 0.866, cubeSize * 0.5)

        const cos30 = 0.866025;
        const sin30 = 0.5;

        // Draw 3D Cube
        let inTop = false, inLeft = false, inRight = false;

        // Point in rhombus test
        // Top face: (0, -cubeSize), (cubeSize*cos30, -sin30*cubeSize), (0, 0), (-cubeSize*cos30, -sin30*cubeSize)
        const u = (ix / (cubeSize * cos30) + (iy + cubeSize * sin30) / (cubeSize * sin30)) / 2;
        const v = (-ix / (cubeSize * cos30) + (iy + cubeSize * sin30) / (cubeSize * sin30)) / 2;
        if (u >= 0 && u <= 1 && v >= 0 && v <= 1 && iy <= 0) {
          inTop = true;
        }

        // Left face: x in [-cubeSize*cos30, 0], y between top-left edge & bottom-left edge
        if (ix <= 0 && ix >= -cubeSize * cos30) {
          const topY = -sin30 * cubeSize - (ix / (cubeSize * cos30)) * (sin30 * cubeSize);
          const botY = topY + cubeSize;
          if (iy >= topY && iy <= botY) {
            inLeft = true;
          }
        }

        // Right face: x in [0, cubeSize*cos30]
        if (ix >= 0 && ix <= cubeSize * cos30) {
          const topY = -sin30 * cubeSize + (ix / (cubeSize * cos30)) * (sin30 * cubeSize);
          const botY = topY + cubeSize;
          if (iy >= topY && iy <= botY) {
            inRight = true;
          }
        }

        if (inTop) {
          // Vibrant cyan highlight (#00e5ff)
          const grad = (ix + cubeSize * cos30) / (2 * cubeSize * cos30);
          bgR = Math.round(0 * (1 - grad) + 60 * grad);
          bgG = Math.round(220 * (1 - grad) + 245 * grad);
          bgB = 255;
        } else if (inLeft) {
          // Rich royal blue (#2979ff)
          const grad = iy / cubeSize;
          bgR = 30;
          bgG = Math.round(110 * (1 - grad) + 140 * grad);
          bgB = Math.round(240 * (1 - grad) + 255 * grad);
        } else if (inRight) {
          // Deep indigo (#1565c0)
          const grad = iy / cubeSize;
          bgR = 15;
          bgG = Math.round(70 * (1 - grad) + 100 * grad);
          bgB = Math.round(190 * (1 - grad) + 225 * grad);
        }

        rawBuffer[pxOffset] = bgR;
        rawBuffer[pxOffset + 1] = bgG;
        rawBuffer[pxOffset + 2] = bgB;
        rawBuffer[pxOffset + 3] = 255;
      } else {
        // Transparent outside
        rawBuffer[pxOffset] = 0;
        rawBuffer[pxOffset + 1] = 0;
        rawBuffer[pxOffset + 2] = 0;
        rawBuffer[pxOffset + 3] = 0;
      }
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawBuffer, { level: 9 });

  // CRC32 implementation
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const buildDir = path.resolve('build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const pngBuffer = createPNG(512, 512);
fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffer);
console.log('Icon generated at build/icon.png (512x512)');
