[CmdletBinding()]
param(
  [ValidateSet("Status", "Credentials", "Build", "MarkCooldown", "ClearCooldown")]
  [string]$Action = "Status",

  [string]$Profile = "production",

  [int]$CooldownHours = 24,

  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Get-StateDir {
  $base = $env:LOCALAPPDATA
  if ([string]::IsNullOrWhiteSpace($base)) {
    $base = [System.IO.Path]::GetTempPath()
  }

  return Join-Path $base "SplitHubMobileApp\eas-ios-guard"
}

function Read-State($path) {
  if (-not (Test-Path -LiteralPath $path)) {
    return [ordered]@{}
  }

  try {
    $json = Get-Content -Raw -LiteralPath $path
    $object = $json | ConvertFrom-Json
    $result = [ordered]@{}
    foreach ($property in $object.PSObject.Properties) {
      $result[$property.Name] = $property.Value
    }
    return $result
  } catch {
    return [ordered]@{}
  }
}

function Write-State($path, $state) {
  $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $path -Encoding UTF8
}

function Get-UtcNow {
  return [DateTime]::UtcNow
}

function Get-DateOrNull($value) {
  if ([string]::IsNullOrWhiteSpace([string]$value)) {
    return $null
  }

  return [DateTime]::Parse([string]$value).ToUniversalTime()
}

function Format-LocalTime($utc) {
  return $utc.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss")
}

function Get-RunningEasIosProcesses {
  $currentPid = $PID
  return Get-CimInstance Win32_Process |
    Where-Object {
      $_.ProcessId -ne $currentPid -and
      ($_.Name -eq "node.exe" -or $_.Name -eq "cmd.exe" -or $_.Name -eq "powershell.exe") -and
      $_.CommandLine -and
      $_.CommandLine -match "eas-cli" -and
      ($_.CommandLine -match "credentials(:configure-build)? .*--platform ios" -or $_.CommandLine -match "build .*--platform ios")
    } |
    Select-Object ProcessId, ParentProcessId, Name, CommandLine
}

$stateDir = Get-StateDir
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

$statePath = Join-Path $stateDir "state.json"
$lockPath = Join-Path $stateDir "lock.json"
$state = Read-State $statePath

if ($Action -eq "ClearCooldown") {
  $state.lastFailureUtc = $null
  $state.cooldownHours = $CooldownHours
  $state.lastClearUtc = (Get-UtcNow).ToString("o")
  Write-State $statePath $state
  if (Test-Path -LiteralPath $lockPath) {
    Remove-Item -LiteralPath $lockPath -Force
  }
  Write-Host "Cleared local EAS iOS guard cooldown."
  exit 0
}

if ($Action -eq "MarkCooldown") {
  $state.lastFailureUtc = (Get-UtcNow).ToString("o")
  $state.cooldownHours = $CooldownHours
  $state.lastAction = "ManualCooldown"
  Write-State $statePath $state
  Write-Host "Marked Apple auth cooldown for $CooldownHours hour(s)."
  exit 0
}

$lastAttempt = Get-DateOrNull $state.lastAttemptUtc
$lastFailure = Get-DateOrNull $state.lastFailureUtc
$lastSuccess = Get-DateOrNull $state.lastSuccessUtc
$cooldown = [TimeSpan]::FromHours($CooldownHours)
$cooldownUntil = $null

if ($lastFailure) {
  $cooldownUntil = $lastFailure.Add($cooldown)
}

Write-Host "SplitHub EAS iOS guard"
Write-Host "State: $statePath"
if ($lastAttempt) { Write-Host "Last attempt: $(Format-LocalTime $lastAttempt)" }
if ($lastFailure) { Write-Host "Last failure: $(Format-LocalTime $lastFailure)" }
if ($lastSuccess) { Write-Host "Last success: $(Format-LocalTime $lastSuccess)" }
if ($cooldownUntil) { Write-Host "Cooldown until: $(Format-LocalTime $cooldownUntil)" }

$running = @(Get-RunningEasIosProcesses)
if ($running.Count -gt 0) {
  Write-Host ""
  Write-Host "Existing iOS EAS process detected. Do not start another Apple auth attempt:" -ForegroundColor Yellow
  $running | Format-Table ProcessId, Name, CommandLine -Wrap

  if ($Action -ne "Status") {
    Write-Host "Stop or finish the existing process first." -ForegroundColor Red
    exit 2
  }
}

if ($Action -eq "Status") {
  if ($cooldownUntil -and (Get-UtcNow) -lt $cooldownUntil) {
    Write-Host "Status: cooldown active. Wait before Apple login." -ForegroundColor Yellow
  } else {
    Write-Host "Status: clear for one carefully controlled attempt." -ForegroundColor Green
  }
  exit 0
}

if ($cooldownUntil -and (Get-UtcNow) -lt $cooldownUntil -and -not $Force) {
  Write-Host ""
  Write-Host "Apple auth cooldown is active. This guard will not start another login attempt." -ForegroundColor Red
  Write-Host "Wait until $(Format-LocalTime $cooldownUntil), or rerun with -Force only if you are sure Apple is ready."
  exit 3
}

$command = @()
if ($Action -eq "Credentials") {
  $command = @("eas-cli", "credentials:configure-build", "--platform", "ios", "--profile", $Profile)
} elseif ($Action -eq "Build") {
  $command = @("eas-cli", "build", "--platform", "ios", "--profile", $Profile, "--no-wait")
} else {
  throw "Unsupported action: $Action"
}

Write-Host ""
Write-Host "About to run: npx.cmd $($command -join ' ')" -ForegroundColor Cyan
Write-Host "Use exactly one Apple login attempt. If Apple says too many verification codes, stop and wait at least 24 hours." -ForegroundColor Yellow
Write-Host "Do not paste Apple password or 2FA into chat. Type them only in this terminal." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Type START to run this single guarded attempt"
if ($confirm -ne "START") {
  Write-Host "Canceled. No Apple login attempt was made."
  exit 0
}

$lock = [ordered]@{
  pid = $PID
  action = $Action
  startedUtc = (Get-UtcNow).ToString("o")
}
Write-State $lockPath $lock

$state.lastAttemptUtc = (Get-UtcNow).ToString("o")
$state.lastAction = $Action
$state.cooldownHours = $CooldownHours
Write-State $statePath $state

try {
  & npx.cmd @command
  $exitCode = $LASTEXITCODE
} finally {
  if (Test-Path -LiteralPath $lockPath) {
    Remove-Item -LiteralPath $lockPath -Force
  }
}

$state = Read-State $statePath
if ($exitCode -eq 0) {
  $state.lastSuccessUtc = (Get-UtcNow).ToString("o")
  $state.lastFailureUtc = $null
  $state.lastExitCode = 0
  Write-State $statePath $state
  Write-Host "EAS iOS command finished successfully." -ForegroundColor Green
} else {
  $state.lastFailureUtc = (Get-UtcNow).ToString("o")
  $state.lastExitCode = $exitCode
  Write-State $statePath $state
  Write-Host "EAS iOS command failed. Cooldown started to protect Apple 2FA limits." -ForegroundColor Red
}

exit $exitCode
