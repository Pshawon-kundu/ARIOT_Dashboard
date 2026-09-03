$Root = "D:\My_projects\ARIOT_Dashboard"

$BackendDir = Join-Path $Root "ariot-cleanbot-backend"
$SimulatorDir = Join-Path $Root "ariot-cleanbot-simulator"

$PortSimulator = 8100
$PortBackend = 8000
$PortFrontend = 5173

function Test-Port {
    param([int]$Port)
    $result = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $result
}

function Wait-ForUrl {
    param([string]$Url, [int]$TimeoutSec = 10)
    $success = $false
    for ($i = 0; $i -lt $TimeoutSec; $i++) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) {
                $success = $true
                break
            }
        } catch { }
        Start-Sleep -Seconds 1
    }
    return $success
}

Write-Host ""
Write-Host "========================================"
Write-Host "     ARIOT CleanBot Demo Startup"
Write-Host "========================================"
Write-Host ""

# ── Simulator ──────────────────────────────────
Write-Host "[1/3] Checking Simulator (port $PortSimulator)..."
if (Test-Port -Port $PortSimulator) {
    Write-Host "      [OK] Simulator already running"
} else {
    Write-Host "      [INFO] Starting Simulator..."
    Start-Process powershell.exe -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$SimulatorDir'; python run.py"
    )
    if (Wait-ForUrl -Url "http://127.0.0.1:$PortSimulator/simulation/status") {
        Write-Host "      [OK] Simulator started"
    } else {
        Write-Host "      [WARN] Simulator may have failed to start - check the Simulator window"
    }
}

# ── Backend ────────────────────────────────────
Write-Host ""
Write-Host "[2/3] Checking Backend (port $PortBackend)..."
if (Test-Port -Port $PortBackend) {
    Write-Host "      [OK] Backend already running"
} else {
    Write-Host "      [INFO] Starting Backend..."
    $VenvActivate = Join-Path $BackendDir ".venv\Scripts\Activate.ps1"
    if (-not (Test-Path $VenvActivate)) {
        Write-Host "      [WARN] Virtualenv not found at $VenvActivate - using system Python"
        $VenvActivate = ""
    }
    $BackendCmd = "Set-Location '$BackendDir'; "
    if ($VenvActivate) { $BackendCmd += ". '$VenvActivate'; " }
    $BackendCmd += "python -m uvicorn app.main:app --reload --port $PortBackend"
    Start-Process powershell.exe -ArgumentList @(
        "-NoExit",
        "-Command",
        $BackendCmd
    )
    if (Wait-ForUrl -Url "http://127.0.0.1:$PortBackend/docs" -TimeoutSec 15) {
        Write-Host "      [OK] Backend started"
    } else {
        Write-Host "      [WARN] Backend may still be starting - check the Backend window"
    }
}

# ── Frontend ───────────────────────────────────
Write-Host ""
Write-Host "[3/3] Checking Frontend (port $PortFrontend)..."
if (Test-Port -Port $PortFrontend) {
    Write-Host "      [OK] Frontend already running"
} else {
    Write-Host "      [INFO] Starting Frontend..."
    Start-Process powershell.exe -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$Root'; npm run dev"
    )
    if (Wait-ForUrl -Url "http://localhost:$PortFrontend" -TimeoutSec 20) {
        Write-Host "      [OK] Frontend started"
    } else {
        Write-Host "      [WARN] Frontend may still be starting - check the Frontend window"
    }
}

# ── Final verification ──────────────────────────
Write-Host ""
Write-Host "========================================"
Write-Host "         Service Status Summary"
Write-Host "========================================"
Write-Host ""

$allOk = $true

if (Test-Port -Port $PortSimulator) {
    Write-Host "[OK] Simulator  - http://127.0.0.1:$PortSimulator"
} else {
    Write-Host "[ERROR] Simulator - not reachable on port $PortSimulator"
    $allOk = $false
}

if (Test-Port -Port $PortBackend) {
    Write-Host "[OK] Backend   - http://127.0.0.1:$PortBackend"
} else {
    Write-Host "[ERROR] Backend  - not reachable on port $PortBackend"
    $allOk = $false
}

if (Test-Port -Port $PortFrontend) {
    Write-Host "[OK] Frontend  - http://localhost:$PortFrontend"
} else {
    Write-Host "[WARN] Frontend - may still be starting on port $PortFrontend"
}

Write-Host ""
if ($allOk) {
    Write-Host "All services ready. Open http://localhost:$PortFrontend in your browser."
} else {
    Write-Host "Some services failed to start. Check the terminal windows for errors."
}
Write-Host ""
