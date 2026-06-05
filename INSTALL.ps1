# ================================================================
# GSFP v2 — Complete Update Installer
# Run this script from: C:\Users\baris\gsfp-v2
# ================================================================
param([string]$ProjectRoot = "C:\Users\baris\gsfp-v2")

$PATCH = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "GSFP v2 — Applying all updates..." -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot" -ForegroundColor Gray

function Copy-File($src, $dest) {
  $destDir = Split-Path $dest -Parent
  if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
  Copy-Item $src $dest -Force
  Write-Host "  ✓ $(Split-Path $dest -Leaf)" -ForegroundColor Green
}

Write-Host "`n[Frontend]" -ForegroundColor Yellow
Copy-File "$PATCH\frontend\src\api\client.js"                                    "$ProjectRoot\frontend\src\api\client.js"
Copy-File "$PATCH\frontend\src\utils\format.js"                                  "$ProjectRoot\frontend\src\utils\format.js"
Copy-File "$PATCH\frontend\src\components\headmaster\HeadmasterDashboard.jsx"    "$ProjectRoot\frontend\src\components\headmaster\HeadmasterDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\district\DistrictDashboard.jsx"        "$ProjectRoot\frontend\src\components\district\DistrictDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\monitoring\MonitoringDashboard.jsx"    "$ProjectRoot\frontend\src\components\monitoring\MonitoringDashboard.jsx"

Write-Host "`n[Backend]" -ForegroundColor Yellow
Copy-File "$PATCH\backend\src\server.js"                                         "$ProjectRoot\backend\src\server.js"
Copy-File "$PATCH\backend\src\models\EnrollmentRequest.js"                       "$ProjectRoot\backend\src\models\EnrollmentRequest.js"
Copy-File "$PATCH\backend\src\controllers\enrollmentController.js"               "$ProjectRoot\backend\src\controllers\enrollmentController.js"
Copy-File "$PATCH\backend\src\routes\enrollment.js"                              "$ProjectRoot\backend\src\routes\enrollment.js"

Write-Host "`nAll files installed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. cd $ProjectRoot"
Write-Host "  2. git add ."
Write-Host "  3. git commit -m 'Update: enrollment workflow + headmaster approvals + differentiated monitoring'"
Write-Host "  4. git push origin main"
Write-Host "  5. On Railway Console: node src/db/seed.js --force"
