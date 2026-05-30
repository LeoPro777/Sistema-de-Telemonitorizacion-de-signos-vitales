# Setup Development Environment - Node 24, Frontend, Docker
# -----------------------------------------------------------
# This PowerShell script automates the steps to get the project running locally.
# Assumes you have administrative rights to install software and Docker installed.

# 1️⃣ Install Node.js 24 LTS (if not already present)
$nodeVersion = "v24.0.0"  # Latest LTS at time of writing
$nodeInstallPath = "$env:ProgramFiles\nodejs"
if (-Not (Test-Path $nodeInstallPath)) {
    Write-Host "Downloading Node.js $nodeVersion..."
    $msiUrl = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-x64.msi"
    $msiPath = "$env:TEMP\node.msi"
    Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing
    Write-Host "Installing Node.js..."
    Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /quiet /norestart" -Wait
    Remove-Item $msiPath -Force
    Write-Host "Node.js installed at $nodeInstallPath"
}
else {
    Write-Host "Node.js already installed at $nodeInstallPath"
}

# Ensure npm is on PATH for this session
$env:Path = "$nodeInstallPath;$env:Path"

# 2️⃣ Install frontend dependencies
$frontendDir = Join-Path $PSScriptRoot "frontend"
if (Test-Path $frontendDir) {
    Set-Location $frontendDir
    Write-Host "Installing NPM packages..."
    npm install
}
else {
    Write-Error "Frontend directory not found: $frontendDir"
    exit 1
}

# 3️⃣ Build and launch Docker services (Mongo, Redis, Backend, Celery, Frontend)
$dockerComposeFile = Join-Path $PSScriptRoot "docker\docker-compose.yml"
Write-Host "Building Docker images and starting containers..."
# Using Docker Compose V2 syntax (docker compose)
 docker compose -f $dockerComposeFile up -d --build

Write-Host "All services are up.\nFrontend: http://localhost:5173\nAPI (FastAPI docs): http://localhost:8000/docs"
