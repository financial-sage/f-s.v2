# Crear clave privada manual en formato PEM

$certPath = "c:\DEV\Github\f-s.vdev\certs"
$pfxPath = Join-Path $certPath "localhost.pfx"
$keyPath = Join-Path $certPath "localhost.key"
$crtPath = Join-Path $certPath "localhost.crt"

# Cargar el certificado
$pfxPassword = ConvertTo-SecureString -String "dev-password" -Force -AsPlainText
$cert = Get-PfxCertificate -FilePath $pfxPath -Password $pfxPassword

# Exportar certificado público
$certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
$certBase64 = [Convert]::ToBase64String($certBytes, 'InsertLineBreaks')
$certPem = "-----BEGIN CERTIFICATE-----`n$certBase64`n-----END CERTIFICATE-----"
$certPem | Out-File -FilePath $crtPath -Encoding ASCII

Write-Host "Certificado exportado: $crtPath" -ForegroundColor Green

# Para la clave privada, usar método alternativo
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Solucion alternativa para HTTPS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Opcion mas facil: Usar tunel HTTPS" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Instala ngrok:" -ForegroundColor White
Write-Host "   npm install -g ngrok" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Inicia tu app normal:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. En otra terminal, crea el tunel:" -ForegroundColor White
Write-Host "   ngrok http 3000" -ForegroundColor Gray
Write-Host ""
Write-Host "4. ngrok te dara una URL HTTPS publica como:" -ForegroundColor White
Write-Host "   https://abc123.ngrok.io" -ForegroundColor Green
Write-Host ""
Write-Host "5. Abre esa URL en tu Oppo Reno 12" -ForegroundColor White
Write-Host "   y podras instalar la PWA!" -ForegroundColor Green
Write-Host ""
Write-Host "Alternativa: LocalTunnel (mas simple)" -ForegroundColor Cyan
Write-Host "   npx localtunnel --port 3000" -ForegroundColor Gray
Write-Host ""
