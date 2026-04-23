# Script para iniciar Docker Desktop
Write-Host "Iniciando Docker Desktop..." -ForegroundColor Green

# Iniciar Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Esperar a que Docker Desktop se inicie
Write-Host "Esperando a que Docker Desktop se inicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Verificar si Docker está corriendo
$dockerRunning = $false
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts -and -not $dockerRunning) {
    try {
        & "C:\Program Files\Docker\Docker\resources\bin\docker.exe" info | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $dockerRunning = $true
            Write-Host "✅ Docker Desktop está corriendo!" -ForegroundColor Green
        } else {
            $attempt++
            Write-Host "Intento $attempt de $maxAttempts..." -ForegroundColor Gray
            Start-Sleep -Seconds 5
        }
    } catch {
        $attempt++
        Write-Host "Intento $attempt de $maxAttempts..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
}

if ($dockerRunning) {
    Write-Host "🚀 Docker está listo para usar!" -ForegroundColor Green
    Write-Host "Ahora puedes ejecutar: docker compose up -d" -ForegroundColor Cyan
} else {
    Write-Host "❌ No se pudo iniciar Docker Desktop" -ForegroundColor Red
    Write-Host "Por favor, inicia Docker Desktop manualmente y espera a que el icono esté verde" -ForegroundColor Red
}
