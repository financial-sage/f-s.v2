# Script completo para configurar HTTPS en localhost

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Configuracion HTTPS para localhost" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si mkcert está instalado
$mkcertInstalled = Get-Command mkcert -ErrorAction SilentlyContinue

if (-not $mkcertInstalled) {
    Write-Host "mkcert no esta instalado. Instalando con Chocolatey..." -ForegroundColor Yellow
    
    # Verificar si Chocolatey está instalado
    $chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue
    
    if (-not $chocoInstalled) {
        Write-Host ""
        Write-Host "Para instalar mkcert, necesitas Chocolatey." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Opcion 1: Instalar Chocolatey (recomendado)" -ForegroundColor Green
        Write-Host "  Ejecuta en PowerShell como Administrador:" -ForegroundColor White
        Write-Host "  Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Luego ejecuta:" -ForegroundColor White
        Write-Host "  npm run setup-https" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Opcion 2: Usar certificado auto-firmado (mas simple)" -ForegroundColor Green
        Write-Host "  Los certificados ya fueron creados en: certs/" -ForegroundColor White
        Write-Host "  Pero necesitas convertirlos manualmente." -ForegroundColor White
        Write-Host ""
        Write-Host "Opcion 3: Usar servicio en la nube (mas facil)" -ForegroundColor Green
        Write-Host "  Ejecuta: npx localtunnel --port 3000" -ForegroundColor White
        Write-Host "  o: npx ngrok http 3000" -ForegroundColor White
        Write-Host ""
        exit
    }
    
    Write-Host "Instalando mkcert..." -ForegroundColor Cyan
    choco install mkcert -y
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error al instalar mkcert" -ForegroundColor Red
        exit 1
    }
}

# Crear directorio para certificados
$certDir = "c:\DEV\Github\f-s.vdev\certs"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
}

# Instalar CA local
Write-Host "Instalando Certificate Authority local..." -ForegroundColor Cyan
mkcert -install

# Crear certificados para localhost
Write-Host "Creando certificados para localhost..." -ForegroundColor Cyan
Set-Location $certDir
mkcert -key-file localhost.key -cert-file localhost.crt localhost 127.0.0.1 ::1

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Certificados creados exitosamente!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Archivos creados:" -ForegroundColor Cyan
Write-Host "  - certs/localhost.key" -ForegroundColor White
Write-Host "  - certs/localhost.crt" -ForegroundColor White
Write-Host ""
Write-Host "Para iniciar el servidor HTTPS:" -ForegroundColor Cyan
Write-Host "  npm run dev:https" -ForegroundColor White
Write-Host ""
Write-Host "La app estara disponible en:" -ForegroundColor Cyan
Write-Host "  https://localhost:3000" -ForegroundColor Green
Write-Host ""
