param([string]$ProjectRoot = "C:\Users\baris\gsfp-v2")
$PATCH = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "GSFP v2 — Applying full update..." -ForegroundColor Cyan

function Copy-File($src, $dest) {
  $d = Split-Path $dest -Parent
  if (!(Test-Path $d)) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
  Copy-Item $src $dest -Force
  Write-Host "  OK  $(Split-Path $dest -Leaf)" -ForegroundColor Green
}

Write-Host "`n[Frontend]" -ForegroundColor Yellow
Copy-File "$PATCH\frontend\src\api\client.js"                                    "$ProjectRoot\frontend\src\api\client.js"
Copy-File "$PATCH\frontend\src\utils\format.js"                                  "$ProjectRoot\frontend\src\utils\format.js"
Copy-File "$PATCH\frontend\src\components\headmaster\HeadmasterDashboard.jsx"    "$ProjectRoot\frontend\src\components\headmaster\HeadmasterDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\district\DistrictDashboard.jsx"        "$ProjectRoot\frontend\src\components\district\DistrictDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\monitoring\MonitoringDashboard.jsx"    "$ProjectRoot\frontend\src\components\monitoring\MonitoringDashboard.jsx"
Copy-File "$PATCH\frontend\src\components\national\SystemConfig.jsx"             "$ProjectRoot\frontend\src\components\national\SystemConfig.jsx"
Copy-File "$PATCH\frontend\src\components\shared\BulkUploadPortal.jsx"           "$ProjectRoot\frontend\src\components\shared\BulkUploadPortal.jsx"

Write-Host "`n[Backend]" -ForegroundColor Yellow
Copy-File "$PATCH\backend\src\server.js"                                          "$ProjectRoot\backend\src\server.js"
Copy-File "$PATCH\backend\src\models\EnrollmentRequest.js"                        "$ProjectRoot\backend\src\models\EnrollmentRequest.js"
Copy-File "$PATCH\backend\src\models\ResetRequest.js"                             "$ProjectRoot\backend\src\models\ResetRequest.js"
Copy-File "$PATCH\backend\src\controllers\enrollmentController.js"                "$ProjectRoot\backend\src\controllers\enrollmentController.js"
Copy-File "$PATCH\backend\src\controllers\systemController.js"                    "$ProjectRoot\backend\src\controllers\systemController.js"
Copy-File "$PATCH\backend\src\controllers\bulkUploadController.js"                "$ProjectRoot\backend\src\controllers\bulkUploadController.js"
Copy-File "$PATCH\backend\src\routes\enrollment.js"                               "$ProjectRoot\backend\src\routes\enrollment.js"
Copy-File "$PATCH\backend\src\routes\system.js"                                   "$ProjectRoot\backend\src\routes\system.js"
Copy-File "$PATCH\backend\src\routes\bulkUpload.js"                               "$ProjectRoot\backend\src\routes\bulkUpload.js"

Write-Host "`nAll files installed! ($((Get-Date).ToString('HH:mm:ss')))" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  cd $ProjectRoot"
Write-Host "  git add ."
Write-Host "  git commit -m 'Add dual-approval reset + bulk upload + enrollment fix'"
Write-Host "  git push origin main"
