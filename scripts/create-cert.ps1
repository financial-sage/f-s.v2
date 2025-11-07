# Script para crear certificado SSL auto-firmado para localhost

$certPath = "c:\DEV\Github\f-s.vdev\certs"

Write-Host "Creando certificado SSL para localhost..." -ForegroundColor Cyan

# Crear certificado auto-firmado
$cert = New-SelfSignedCertificate `
    -Subject "localhost" `
    -DnsName "localhost", "127.0.0.1", "*.localhost" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -NotBefore (Get-Date) `
    -NotAfter (Get-Date).AddYears(5) `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -FriendlyName "localhost-dev-cert" `
    -HashAlgorithm SHA256 `
    -KeyUsage DigitalSignature, KeyEncipherment, DataEncipherment `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

$certThumbprint = $cert.Thumbprint

Write-Host "Certificado creado con Thumbprint: $certThumbprint" -ForegroundColor Green

# Exportar certificado con clave privada (PFX)
$pfxPassword = ConvertTo-SecureString -String "dev-password" -Force -AsPlainText
$pfxPath = Join-Path $certPath "localhost.pfx"
Export-PfxCertificate -Cert "Cert:\CurrentUser\My\$certThumbprint" -FilePath $pfxPath -Password $pfxPassword

Write-Host "Certificado PFX exportado a: $pfxPath" -ForegroundColor Green

# Exportar certificado público (CRT)
$crtPath = Join-Path $certPath "localhost.crt"
Export-Certificate -Cert "Cert:\CurrentUser\My\$certThumbprint" -FilePath $crtPath

Write-Host "Certificado CRT exportado a: $crtPath" -ForegroundColor Green

# Exportar clave privada (KEY) - requiere OpenSSL
Write-Host ""
Write-Host "Para convertir a formato PEM (KEY), ejecuta:" -ForegroundColor Yellow
Write-Host "openssl pkcs12 -in certs\localhost.pfx -nocerts -out certs\localhost.key -nodes" -ForegroundColor White
Write-Host "Password: dev-password" -ForegroundColor Gray
Write-Host ""
Write-Host "openssl pkcs12 -in certs\localhost.pfx -clcerts -nokeys -out certs\localhost.crt" -ForegroundColor White

# Agregar certificado a Trusted Root (requiere permisos de admin)
Write-Host ""
Write-Host "Instalando certificado en Trusted Root Certification Authorities..." -ForegroundColor Cyan

try {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store "Root", "CurrentUser"
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
    Write-Host "Certificado instalado como confiable" -ForegroundColor Green
} catch {
    Write-Host "No se pudo instalar en Trusted Root. Ejecuta como Administrador si es necesario." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Certificado SSL creado exitosamente!" -ForegroundColor Green
Write-Host "Ubicacion: $certPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora puedes usar HTTPS en localhost" -ForegroundColor White
