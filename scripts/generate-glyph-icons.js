import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const outputDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
fs.mkdirSync(outputDirectory, { recursive: true });

const colors = {
  transparent: [0, 0, 0, 0],
  graphite: [18, 19, 24, 255],
  rim: [139, 92, 246, 122],
  porcelain: [229, 231, 235, 255],
  violet: [139, 92, 246, 255]
};

function roundedRectDistance(x, y, halfSize, radius) {
  const qx = Math.abs(x - 64) - halfSize + radius;
  const qy = Math.abs(y - 64) - halfSize + radius;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

function segmentDistance(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const amount = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - x1 - amount * dx, y - y1 - amount * dy);
}

function colorAt(x, y) {
  const squareDistance = roundedRectDistance(x, y, 59.25, 23);
  if (squareDistance > 0.75) return colors.transparent;
  if (squareDistance > -0.75) return colors.rim;

  const radius = Math.hypot(x - 64, y - 64);
  const angle = (Math.atan2(y - 64, x - 64) * 180 / Math.PI + 360) % 360;
  const onArc = angle <= 315 && Math.abs(radius - 38) <= 1.8;
  const onRoundCap = Math.hypot(x - 91, y - 37) <= 1.8 || Math.hypot(x - 102, y - 64) <= 1.8;
  if (onArc || onRoundCap) return colors.porcelain;
  if (segmentDistance(x, y, 102, 64, 76, 64) <= 1.8) return colors.violet;
  if (radius <= 4.4) return colors.violet;
  return colors.graphite;
}

function render(size) {
  const output = Buffer.alloc(size * size * 4);
  const samples = 4;
  const scale = size / 128;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const total = [0, 0, 0, 0];
      for (let sampleY = 0; sampleY < samples; sampleY++) {
        for (let sampleX = 0; sampleX < samples; sampleX++) {
          const color = colorAt((x + (sampleX + 0.5) / samples) / scale, (y + (sampleY + 0.5) / samples) / scale);
          for (let channel = 0; channel < 3; channel++) total[channel] += color[channel] * color[3];
          total[3] += color[3];
        }
      }
      const offset = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel++) output[offset + channel] = total[3] ? Math.round(total[channel] / total[3]) : 0;
      output[offset + 3] = Math.round(total[3] / (samples * samples));
    }
  }
  return output;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function encodePng(size, pixels) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    pixels.copy(row, 1, y * size * 4, (y + 1) * size * 4);
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

for (const size of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(outputDirectory, `icon${size}.png`), encodePng(size, render(size)));
}
console.log(`Generated anti-aliased GLYPH icons in ${outputDirectory}`);