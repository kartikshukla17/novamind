const fs = require('fs');
const path = require('path');

// Simple PNG generator for solid color icons with a brain-like symbol
function createPNG(size) {
  // PNG header and IHDR chunk
  const width = size;
  const height = size;

  // Create raw pixel data (RGBA)
  const rawData = [];

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = size * 0.4;

  for (let y = 0; y < height; y++) {
    rawData.push(0); // Filter byte for each row
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius) {
        // Sky blue color (#0ea5e9)
        rawData.push(14);   // R
        rawData.push(165);  // G
        rawData.push(233);  // B
        rawData.push(255);  // A
      } else if (distance < radius + 2) {
        // Anti-aliased edge
        const alpha = Math.max(0, 255 - (distance - radius) * 127);
        rawData.push(14);
        rawData.push(165);
        rawData.push(233);
        rawData.push(Math.round(alpha));
      } else {
        // Transparent
        rawData.push(0);
        rawData.push(0);
        rawData.push(0);
        rawData.push(0);
      }
    }
  }

  // Use a simpler approach - create a valid minimal PNG
  const { execSync } = require('child_process');

  // Create a simple colored square using ImageMagick if available, otherwise use a data URI approach
  try {
    // Try using Node canvas or sharp if available
    const sharp = require('sharp');

    // Create a simple sky blue circle on transparent background
    const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#38bdf8;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0284c7;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size*0.45}" fill="url(#grad)"/>
      <text x="${size/2}" y="${size/2 + size*0.15}" font-family="Arial, sans-serif" font-size="${size*0.4}" font-weight="bold" fill="white" text-anchor="middle">C</text>
    </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
  } catch (e) {
    // Fallback: create a minimal valid PNG manually
    console.log('Sharp not available, creating minimal PNG');

    // This creates a very simple solid color PNG
    const zlib = require('zlib');

    function crc32(data) {
      let crc = -1;
      for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
          crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
      }
      return (crc ^ -1) >>> 0;
    }

    function chunk(type, data) {
      const typeBytes = Buffer.from(type);
      const length = Buffer.alloc(4);
      length.writeUInt32BE(data.length);

      const crcData = Buffer.concat([typeBytes, data]);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(crcData));

      return Buffer.concat([length, typeBytes, data, crc]);
    }

    // PNG signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // color type (RGBA)
    ihdr[10] = 0; // compression
    ihdr[11] = 0; // filter
    ihdr[12] = 0; // interlace

    // Create simple image data (solid color circle)
    const pixels = [];
    for (let y = 0; y < height; y++) {
      pixels.push(0); // filter type
      for (let x = 0; x < width; x++) {
        const dx = x - width/2;
        const dy = y - height/2;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < width * 0.45) {
          pixels.push(14, 165, 233, 255); // Sky blue
        } else {
          pixels.push(0, 0, 0, 0); // Transparent
        }
      }
    }

    const rawPixels = Buffer.from(pixels);
    const compressed = zlib.deflateSync(rawPixels);

    // IDAT chunk
    const idat = chunk('IDAT', compressed);

    // IEND chunk
    const iend = chunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, chunk('IHDR', ihdr), idat, iend]);
  }
}

async function main() {
  const sizes = [192, 512];
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  for (const size of sizes) {
    const filename = `icon-${size}.png`;
    const filepath = path.join(iconsDir, filename);

    try {
      const buffer = await createPNG(size);
      fs.writeFileSync(filepath, buffer);
      console.log(`Created ${filename}`);
    } catch (error) {
      console.error(`Failed to create ${filename}:`, error.message);
    }
  }
}

main();
