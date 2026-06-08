# start_servers.ps1

Write-Host "Starting Go Backend..."
Set-Location ".\backend"
go build ./cmd/server
Start-Process -FilePath ".\server.exe" -WindowStyle Normal

Write-Host "Starting Next.js Frontend..."
Set-Location "..\frontend"
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WindowStyle Normal

Write-Host "Servers are starting in new windows!"
