# ==============================================================================
# LM-Vision: Allow Android Emulator to reach AI Engine on port 3001
# Run this script ONCE as Administrator to unblock the backend from the emulator.
# ==============================================================================

$ruleName = "LM-Vision AI Engine Port 3001"

# Remove old rule if it exists (idempotent)
netsh advfirewall firewall delete rule name=$ruleName | Out-Null

# Allow inbound TCP on port 3001 from any profile (domain/private/public)
netsh advfirewall firewall add rule `
    name=$ruleName `
    dir=in `
    action=allow `
    protocol=TCP `
    localport=3001 `
    profile=any

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Firewall rule '$ruleName' added successfully." -ForegroundColor Green
    Write-Host "     Android emulator can now reach http://10.0.2.2:3001" -ForegroundColor Cyan
} else {
    Write-Host "[FAIL] Could not add firewall rule. Check admin privileges." -ForegroundColor Red
}
