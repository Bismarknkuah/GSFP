# ================================================================
# GSFP v2 — Full Update Installer
# Run from ANYWHERE — script auto-detects paths
# ================================================================
param([string]$ProjectRoot = "C:\Users\baris\gsfp-v2")

$PATCH = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  GSFP v2 — Full Update Installer" -ForegroundColor Cyan
Write-Host "  Project: $ProjectRoot" -ForegroundColor Gray
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

function Copy-File($src, $dest) {
    $destDir = Split-Path $dest -Parent
    if (!(Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }
    Copy-Item $src $dest -Force
    Write-Host "  ✓  $(Split-Path $dest -Leaf)" -ForegroundColor Green
}

Write-Host "[1/4] Installing Frontend files..." -ForegroundColor Yellow
Copy-File "$PATCH\frontend\src\App.jsx"                                              "$ProjectRoot\frontend\src\App.jsx"
Copy-File "$PATCH\frontend\src\api\client.js"                                        "$ProjectRoot\frontend\src\api\client.js"
Copy-File "$PATCH\frontend\src\utils\format.js"                                      "$ProjectRoot\frontend\src\utils\format.js"
Copy-File "$PATCH\frontend\src\components\auth\LoginScreen.jsx"                      "$ProjectRoot\frontend\src\components\auth\LoginScreen.jsx"
Copy-File "$PATCH\frontend\src\components\headmaster\HeadmasterDashboard.jsx"        "$ProjectRoot\frontend\src\components\headmaster\HeadmasterDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\caterer\CatererDashboard.jsx"              "$ProjectRoot\frontend\src\components\caterer\CatererDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\district\DistrictDashboard.jsx"            "$ProjectRoot\frontend\src\components\district\DistrictDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\district\DistrictCoordinatorPanel.jsx"     "$ProjectRoot\frontend\src\components\district\DistrictCoordinatorPanel.jsx"
Copy-File "$PATCH\frontend\src\components\monitoring\MonitoringDashboard.jsx"        "$ProjectRoot\frontend\src\components\monitoring\MonitoringDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\monitoring\MonitoringOfficerPanel.jsx"     "$ProjectRoot\frontend\src\components\monitoring\MonitoringOfficerPanel.jsx"
Copy-File "$PATCH\frontend\src\components\finance\FinanceDashboard.jsx"              "$ProjectRoot\frontend\src\components\finance\FinanceDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\audit\AuditDashboard.jsx"                  "$ProjectRoot\frontend\src\components\audit\AuditDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\dataentry\DataEntryDashboard.jsx"          "$ProjectRoot\frontend\src\components\dataentry\DataEntryDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\shared\AnalyticsDashboard.jsx"             "$ProjectRoot\frontend\src\components\shared\AnalyticsDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\workflow\DCEDashboard.jsx"                 "$ProjectRoot\frontend\src\components\workflow\DCEDashboard.jsx"

Write-Host ""
Write-Host "[2/4] Installing Backend files..." -ForegroundColor Yellow
Copy-File "$PATCH\backend\src\server.js"                                              "$ProjectRoot\backend\src\server.js"
Copy-File "$PATCH\backend\src\db\seed.js"                                             "$ProjectRoot\backend\src\db\seed.js"
Copy-File "$PATCH\backend\railway.json"                                               "$ProjectRoot\backend\railway.json"
Copy-File "$PATCH\backend\package.json"                                               "$ProjectRoot\backend\package.json"
Copy-File "$PATCH\backend\src\models\EnrollmentRequest.js"                           "$ProjectRoot\backend\src\models\EnrollmentRequest.js"
Copy-File "$PATCH\backend\src\models\SchoolRequest.js"                               "$ProjectRoot\backend\src\models\SchoolRequest.js"
Copy-File "$PATCH\backend\src\controllers\enrollmentController.js"                   "$ProjectRoot\backend\src\controllers\enrollmentController.js"
Copy-File "$PATCH\backend\src\controllers\schoolRequestController.js"                "$ProjectRoot\backend\src\controllers\schoolRequestController.js"
Copy-File "$PATCH\backend\src\controllers\paymentApprovalController.js"              "$ProjectRoot\backend\src\controllers\paymentApprovalController.js"
Copy-File "$PATCH\backend\src\routes\enrollment.js"                                  "$ProjectRoot\backend\src\routes\enrollment.js"
Copy-File "$PATCH\backend\src\routes\schoolRequests.js"                              "$ProjectRoot\backend\src\routes\schoolRequests.js"
Copy-File "$PATCH\backend\src\routes\paymentApproval.js"                             "$ProjectRoot\backend\src\routes\paymentApproval.js"

Write-Host ""
Write-Host "[3/4] Verifying files..." -ForegroundColor Yellow
$ok = $true
@("$ProjectRoot\frontend\src\App.jsx",
  "$ProjectRoot\frontend\src\components\shared\AnalyticsDashboard.jsx",
  "$ProjectRoot\backend\src\server.js",
  "$ProjectRoot\backend\src\models\SchoolRequest.js") | ForEach-Object {
    if (Test-Path $_) { Write-Host "  ✓  $(Split-Path $_ -Leaf)" -ForegroundColor Green }
    else { Write-Host "  ✗  MISSING: $_" -ForegroundColor Red; $ok = $false }
}

Write-Host ""
Write-Host "[4/4] Done!" -ForegroundColor Yellow
Write-Host ""
if ($ok) {
    Write-Host "  All files installed successfully!" -ForegroundColor Green
} else {
    Write-Host "  Some files may be missing — check paths above." -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS:" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Push to GitHub:" -ForegroundColor White
Write-Host "     cd $ProjectRoot" -ForegroundColor Gray
Write-Host "     git add ." -ForegroundColor Gray
Write-Host "     git commit -m 'Full update: analytics, workflows, payment chain'" -ForegroundColor Gray
Write-Host "     git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Reseed on Railway Console:" -ForegroundColor White
Write-Host "     node src/db/seed.js --force" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Test locally:" -ForegroundColor White
Write-Host "     Terminal 1: cd backend && npm start" -ForegroundColor Gray
Write-Host "     Terminal 2: cd frontend && npm run dev" -ForegroundColor Gray
Write-Host ""
