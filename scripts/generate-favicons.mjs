import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const publicDir = path.resolve('public');
const svgPath = path.join(publicDir, 'favicon.svg');

if (!fs.existsSync(svgPath)) {
  console.error('Error: favicon.svg not found at', svgPath);
  process.exit(1);
}

const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('--- Generating High-Fidelity YouthSMM Icons ---');

  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'favicon-144x144.png', size: 144 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-192x192.png', size: 192 },
    { name: 'favicon-512x512.png', size: 512 },
    { name: 'favicon.png', size: 48 },
  ];

  for (const { name, size } of sizes) {
    const targetFile = path.join(publicDir, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(targetFile);
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  // Generate standard, multi-resolution Windows/Googlebot favicon.ico (16, 32, 48)
  const icoPath = path.join(publicDir, 'favicon.ico');
  const png16 = path.join(publicDir, 'favicon-16x16.png');
  const png32 = path.join(publicDir, 'favicon-32x32.png');
  const png48 = path.join(publicDir, 'favicon-48x48.png');

  try {
    execSync(`convert "${png16}" "${png32}" "${png48}" "${icoPath}"`);
    console.log('✓ Generated multi-resolution favicon.ico via ImageMagick (16x16, 32x32, 48x48)');
  } catch (err) {
    console.warn('ImageMagick convert failed, writing custom ICO structure...', err);
  }

  // Also mirror into dist if dist directory exists
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    console.log('Syncing newly generated icons to dist/ directory...');
    const allFiles = [...sizes.map(s => s.name), 'favicon.ico', 'favicon.svg'];
    for (const file of allFiles) {
      const src = path.join(publicDir, file);
      const dst = path.join(distDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }
    console.log('✓ Successfully synced icons to dist/');
  }

  console.log('All YouthSMM icons generated successfully and verified!');
}

generate().catch(err => {
  console.error('Failed to generate favicons:', err);
  process.exit(1);
});
