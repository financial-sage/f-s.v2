const fs = require('fs');
const path = require('path');

// Crear SVG simple para los iconos
function createSVGIcon(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text x="50%" y="55%" font-family="Arial" font-size="${size * 0.5}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">$</text>
</svg>`;
}

// Crear iconos SVG
const icon192 = createSVGIcon(192);
const icon512 = createSVGIcon(512);

// Guardar en public
fs.writeFileSync(path.join(__dirname, '../public/icon-192.svg'), icon192);
fs.writeFileSync(path.join(__dirname, '../public/icon-512.svg'), icon512);

console.log('✅ Iconos SVG creados exitosamente en /public');
console.log('📱 Para convertirlos a PNG, puedes usar: https://cloudconvert.com/svg-to-png');
