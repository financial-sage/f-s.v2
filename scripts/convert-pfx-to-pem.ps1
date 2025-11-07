# Script para convertir PFX a PEM usando PowerShell

$pfxPath = "c:\DEV\Github\f-s.vdev\certs\localhost.pfx"
$keyPath = "c:\DEV\Github\f-s.vdev\certs\localhost.key"
$crtPath = "c:\DEV\Github\f-s.vdev\certs\localhost.crt"
$password = "dev-password"

Write-Host "Convirtiendo certificado PFX a formato PEM..." -ForegroundColor Cyan

# Cargar el certificado PFX
$pfxPassword = ConvertTo-SecureString -String $password -Force -AsPlainText
$pfxCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($pfxPath, $pfxPassword, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable)

# Exportar el certificado (parte pública) a PEM
$certPem = @"
-----BEGIN CERTIFICATE-----
$([Convert]::ToBase64String($pfxCert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert), [System.Base64FormattingOptions]::InsertLineBreaks))
-----END CERTIFICATE-----
"@

Set-Content -Path $crtPath -Value $certPem -Encoding ASCII
Write-Host "Certificado exportado a: $crtPath" -ForegroundColor Green

# Exportar la clave privada
$privateKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($pfxCert)
$privateKeyBytes = $privateKey.ExportRSAPrivateKey()

$keyPem = @"
-----BEGIN PRIVATE KEY-----
$([Convert]::ToBase64String($privateKeyBytes, [System.Base64FormattingOptions]::InsertLineBreaks))
-----END PRIVATE KEY-----
"@

Set-Content -Path $keyPath -Value $keyPem -Encoding ASCII
Write-Host "Clave privada exportada a: $keyPath" -ForegroundColor Green

Write-Host ""
Write-Host "Conversion completada exitosamente!" -ForegroundColor Green
Write-Host "Ahora puedes usar los archivos .key y .crt con Node.js HTTPS server" -ForegroundColor White
