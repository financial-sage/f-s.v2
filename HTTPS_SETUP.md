# 🔒 Configuración HTTPS para PWA

Para que tu PWA funcione correctamente en dispositivos móviles, necesitas HTTPS. Aquí tienes las opciones más simples:

## ✨ Opción 1: LocalTunnel (Más Rápido)

**La forma más simple de tener HTTPS sin configuración:**

### Paso 1: Inicia tu app
```powershell
npm run dev
```

### Paso 2: En OTRA terminal, crea el túnel
```powershell
npm run tunnel
```

o directamente:
```powershell
npx localtunnel --port 3000
```

### Paso 3: Usa la URL generada
LocalTunnel te dará una URL como:
```
https://funny-cat-123.loca.lt
```

### Paso 4: Abre en tu Oppo Reno 12
1. Abre Chrome en tu celular
2. Ve a la URL del túnel
3. Si pide contraseña, verifica en la terminal
4. ¡Instala la PWA!

---

## 🚀 Opción 2: ngrok (Más Estable)

### Instalación
```powershell
npm install -g ngrok
```

O descarga desde: https://ngrok.com/download

### Uso

1. Inicia tu app:
```powershell
npm run dev
```

2. En otra terminal, crea el túnel:
```powershell
ngrok http 3000
```

3. ngrok te dará URLs como:
```
Forwarding: https://abc123.ngrok-free.app -> http://localhost:3000
```

4. Usa la URL HTTPS en tu celular

### Ventajas de ngrok
- ✅ Más rápido y estable
- ✅ Inspección de tráfico en http://localhost:4040
- ✅ Dominios personalizados (cuenta gratis)
- ✅ Funciona en redes corporativas

---

## 🔐 Opción 3: Certificado Local (Avanzado)

Si quieres verdadero HTTPS local sin túneles:

### Requisitos
- Chocolatey (gestor de paquetes de Windows)
- mkcert

### Instalación de Chocolatey

Abre PowerShell como **Administrador** y ejecuta:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Instalación de mkcert
```powershell
choco install mkcert -y
```

### Crear certificados
```powershell
npm run setup-https
```

### Iniciar servidor HTTPS
```powershell
npm run dev:https
```

Tu app estará en: `https://localhost:3000`

**Nota**: Necesitarás estar en la misma red WiFi que tu PC y usar la IP local (ej: `https://192.168.1.100:3000`)

---

## 📱 Comparación de Opciones

| Método | Facilidad | Velocidad | Externo | Recomendado Para |
|--------|-----------|-----------|---------|------------------|
| LocalTunnel | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ Sí | Pruebas rápidas |
| ngrok | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Sí | Desarrollo normal |
| Certificado Local | ⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ No | Avanzado |

---

## 🎯 Recomendación

**Para probar la PWA en tu Oppo Reno 12**, usa:

```powershell
# Terminal 1
npm run dev

# Terminal 2  
npm run tunnel
```

Es la forma más rápida y no requiere configuración adicional. ✨

---

## ⚠️ Limitaciones

### LocalTunnel
- Puede pedir contraseña la primera vez
- A veces es lento
- URL cambia cada vez que reinicias

### ngrok
- URL cambia en plan gratuito (a menos que crees cuenta)
- Límite de conexiones en plan gratuito

### Certificado Local
- Solo funciona en tu red local
- Requiere configurar firewall
- Tu celular debe estar en la misma WiFi

---

## 🔧 Solución de Problemas

### "Error: Connection refused"
- Verifica que `npm run dev` esté corriendo
- Asegúrate de usar el puerto correcto (3000)

### "This site can't provide a secure connection"
- Espera unos segundos, los túneles tardan en iniciar
- Verifica que la URL sea HTTPS (no HTTP)

### No se muestra el botón "Instalar"
- Verifica que estés usando HTTPS
- Abre Chrome DevTools → Application → Manifest
- Revisa que no haya errores en Service Worker

---

## 📞 Siguiente Paso

Una vez que tengas HTTPS funcionando:

1. Abre la app en Chrome en tu Oppo
2. Menú (⋮) → "Agregar a pantalla de inicio"
3. Abre desde el ícono
4. ¡Disfruta la app en pantalla completa! 🎉
