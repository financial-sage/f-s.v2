const localtunnel = require('localtunnel');

const port = Number(process.env.PORT || 3000);
const subdomain = process.env.LT_SUBDOMAIN || 'fsage-app-dev';
const host = process.env.LT_HOST || 'https://localtunnel.me';

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port, subdomain, host });
    const expectedUrl = `https://${subdomain}.loca.lt`;

    console.log('===================================================');
    console.log('📱 PWA LISTA PARA INSTALAR EN EL MÓVIL 📱');
    console.log(`🎯 Subdominio solicitado: ${subdomain}`);
    console.log(`👉 URL entregada por el túnel: ${tunnel.url}`);

    if (tunnel.url !== expectedUrl) {
      console.log('⚠️ El servicio público de LocalTunnel devolvió un dominio aleatorio.');
      console.log('⚠️ Esto ya no garantiza un subdominio fijo aunque se solicite por nombre.');
    }

    console.log('⚠️ No cierres esta terminal mientras pruebas.');
    console.log('===================================================');

    tunnel.on('close', () => {
      console.log('El túnel se ha cerrado.');
      process.exit(1);
    });
  } catch (error) {
    console.error('No se pudo iniciar el túnel fijo.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

startTunnel();
