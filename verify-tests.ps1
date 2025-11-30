# PowerShell script to run and verify Karma tests
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Running Karma Tests" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Run npm test and capture output
$output = npm test --single-run 2>&1 | Out-String

# Display output
Write-Host $output

# Check for success indicators
if ($output -match "TOTAL:.*103.*SUCCESS") {
    Write-Host ""
    Write-Host "✓ All 103 tests passed successfully!" -ForegroundColor Green
    exit 0
} elseif ($output -match "process is not defined") {
    Write-Host ""
    Write-Host "✗ ERROR: process.env issue still exists" -ForegroundColor Red
    exit 1
} elseif ($output -match "ERROR") {
    Write-Host ""
    Write-Host "✗ Tests completed with errors" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host ""
    Write-Host "? Unable to determine test results" -ForegroundColor Yellow
    Write-Host "Please check the output above manually" -ForegroundColor Yellow
    exit 2
}

