$ErrorActionPreference = 'Stop'
if (-not $env:SUPABASE_DB_URL) { throw 'Set SUPABASE_DB_URL privately before running this script.' }
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) { throw 'Install the official Supabase CLI first.' }
$taskBackupRoot = Join-Path (Split-Path $PSScriptRoot -Parent) '.local/backups'
$taskBackupPath = Join-Path $taskBackupRoot ([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'))
New-Item -ItemType Directory -Path $taskBackupPath -Force | Out-Null
foreach ($taskPart in @('roles', 'schema', 'data')) {
  $taskOutput = Join-Path $taskBackupPath ($taskPart + '.sql')
  $taskArguments = @('db', 'dump', '--db-url', $env:SUPABASE_DB_URL, '--file', $taskOutput)
  if ($taskPart -eq 'roles') { $taskArguments += '--role-only' }
  if ($taskPart -eq 'data') { $taskArguments += @('--data-only', '--use-copy') }
  & supabase @taskArguments
  if ($LASTEXITCODE -ne 0) { throw "Backup failed at $taskPart. Do not treat the partial output as a usable backup." }
  if (-not (Test-Path -LiteralPath $taskOutput)) { throw "Missing $taskPart dump." }
}
Get-ChildItem -LiteralPath $taskBackupPath -Filter '*.sql' | Get-FileHash -Algorithm SHA256 |
  Select-Object Hash, @{Name='File';Expression={Split-Path $_.Path -Leaf}} |
  ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskBackupPath 'checksums.json')
Write-Output "Backup written to $taskBackupPath. Store an encrypted off-site copy and verify a restore before relying on it."
