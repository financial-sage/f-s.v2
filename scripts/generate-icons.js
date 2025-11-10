// Script para generar íconos PNG para PWA
// Requiere: npm install sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const publicDir = path.join(__dirname, '..', 'public');

// SVG base del ícono - Flecha de crecimiento financiero (mejorado)
const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="102.4" fill="url(#grad)"/>
  <!-- Flecha de crecimiento centrada perfectamente -->
  <g transform="translate(256, 256)">
    <g transform="scale(11)">
      <!-- Flecha centrada en el origen: rango x: -9 a 9, y: -6 a 6 -->
      <!-- Línea horizontal derecha -->
      <line x1="1" y1="-5" x2="9" y2="-5" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <!-- Línea vertical -->
      <line x1="9" y1="-5" x2="9" y2="3" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <!-- Línea diagonal principal (flecha hacia arriba-derecha) -->
      <line x1="9" y1="-5" x2="1" y2="3" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <!-- Línea media hacia abajo -->
      <line x1="1" y1="3" x2="-3" y2="-1" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <!-- Línea base hacia arriba -->
      <line x1="-3" y1="-1" x2="-9" y2="5" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </g>
  </g>
</svg>
`;

async function generateIcons() {
  console.log('🎨 Generando íconos PNG para PWA...\n');
  
  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}.png`);
    
    try {
      await sharp(Buffer.from(svgIcon))
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generado: icon-${size}.png`);
    } catch (error) {
      console.error(`❌ Error generando icon-${size}.png:`, error.message);
    }
  }
  
  // También generar apple-touch-icon.png (180x180 para iOS)
  try {
    await sharp(Buffer.from(svgIcon))
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    
    console.log(`✅ Generado: apple-touch-icon.png`);
  } catch (error) {
    console.error(`❌ Error generando apple-touch-icon.png:`, error.message);
  }
  
  // Generar favicon.ico
  try {
    await sharp(Buffer.from(svgIcon))
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));
    
    console.log(`✅ Generado: favicon.png`);
  } catch (error) {
    console.error(`❌ Error generando favicon.png:`, error.message);
  }
  
  console.log('\n✨ ¡Íconos generados exitosamente!');
}

generateIcons().catch(console.error);
