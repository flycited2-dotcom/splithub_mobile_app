[CmdletBinding()]
param(
  [ValidateSet("Check", "Credentials", "Build", "Submit")]
  [string]$Action = "Check",

  [string]$Profile = "production"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$apiKeyPath = Join-Path $projectRoot "secrets\apple\AuthKey_79JNYJRUN9.p8"

$ascKeyId = "79JNYJRUN9"
$ascIssuerId = "09ff797e-f79b-42d0-99f1-0a5f823e2cc6"
$appleTeamId = "4VJL58Y8J4"
$appleTeamType = "INDIVIDUAL"

function Assert-ApiKeyFile {
  if (-not (Test-Path -LiteralPath $apiKeyPath)) {
    throw "Missing App Store Connect API key file: $apiKeyPath"
  }

  $content = Get-Content -Raw -LiteralPath $apiKeyPath
  if ($content -notmatch "BEGIN PRIVATE KEY" -or $content -notmatch "END PRIVATE KEY") {
    throw "The App Store Connect API key file does not look like a valid .p8 private key."
  }
}

function Set-AscEnvironment {
  $env:EXPO_ASC_API_KEY_PATH = $apiKeyPath
  $env:EXPO_ASC_KEY_ID = $ascKeyId
  $env:EXPO_ASC_ISSUER_ID = $ascIssuerId
  $env:EXPO_APPLE_TEAM_ID = $appleTeamId
  $env:EXPO_APPLE_TEAM_TYPE = $appleTeamType
  $env:EXPO_ASC_AUTO_ACCEPT_CREDENTIALS = "1"
}

Push-Location $projectRoot
try {
  Assert-ApiKeyFile
  Set-AscEnvironment

  Write-Host "SplitHub EAS iOS ASC API key mode"
  Write-Host "Project: $projectRoot"
  Write-Host "ASC key: $ascKeyId"
  Write-Host "Issuer: $ascIssuerId"
  Write-Host "Apple team: $appleTeamId ($appleTeamType)"
  Write-Host "Apple ID login is not used by this script."

  if ($Action -eq "Check") {
    & npx.cmd eas-cli@20.4.0 whoami
    exit $LASTEXITCODE
  }

  if ($Action -eq "Credentials") {
    & npx.cmd eas-cli@20.4.0 credentials:configure-build --platform ios --profile $Profile
    exit $LASTEXITCODE
  }

  if ($Action -eq "Build") {
    & npx.cmd eas-cli@20.4.0 build --platform ios --profile $Profile --non-interactive --no-wait
    exit $LASTEXITCODE
  }

  if ($Action -eq "Submit") {
    & npx.cmd eas-cli@20.4.0 submit --platform ios --profile $Profile --non-interactive --latest
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}
