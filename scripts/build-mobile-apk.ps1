# Build HydroGauge SL release APK (requires JDK 17 — not Java 26).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/build-mobile-apk.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Find-Jdk17 {
  $localJdk = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft\jdk-17*'
  $candidates = @(
    $localJdk,
    'C:\Program Files\Microsoft\jdk-17*',
    'C:\Program Files\Eclipse Adoptium\jdk-17*',
    'C:\Program Files\Android\Android Studio\jbr',
    (Join-Path ${env:ProgramFiles} 'Android\Android Studio\jbr')
  )
  foreach ($pattern in $candidates) {
    if (-not $pattern) { continue }
    $resolved = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($resolved -and (Test-Path (Join-Path $resolved.FullName 'bin\java.exe'))) {
      return $resolved.FullName
    }
  }
  return $null
}

$jdk = Find-Jdk17
if (-not $jdk) {
  Write-Host 'JDK 17 not found. Install with:' -ForegroundColor Yellow
  Write-Host '  winget install Microsoft.OpenJDK.17' -ForegroundColor Cyan
  Write-Host 'Then re-run this script.' -ForegroundColor Yellow
  exit 1
}

$env:JAVA_HOME = $jdk
$env:PATH = "$jdk\bin;$env:PATH"
Write-Host "Using JAVA_HOME=$jdk" -ForegroundColor Green

$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path $sdk)) {
  Write-Host 'Android SDK not found. Install Android Studio and SDK, or set ANDROID_HOME.' -ForegroundColor Yellow
  exit 1
}
$env:ANDROID_HOME = $sdk
Write-Host "Using ANDROID_HOME=$sdk" -ForegroundColor Green

Push-Location $root
try {
  npm run sync:env
  Push-Location (Join-Path $root 'mobile')
  $androidDir = Join-Path (Get-Location) 'android'
  $sdkDir = $sdk -replace '\\', '/'
  $localProps = Join-Path $androidDir 'local.properties'
  if (Test-Path $androidDir) {
    "sdk.dir=$sdkDir" | Set-Content -Path $localProps -Encoding ASCII
  }
  if (-not (Test-Path $androidDir)) {
    npx expo prebuild --platform android
  }
  "sdk.dir=$sdkDir" | Set-Content -Path (Join-Path $androidDir 'local.properties') -Encoding ASCII
  Push-Location android
  # arm64-v8a: all phones from ~2017+. armeabi-v7a fails on Windows when the project path contains spaces.
  .\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a"
  $apk = Get-Item 'app\build\outputs\apk\release\app-release.apk' -ErrorAction SilentlyContinue
  if ($apk) {
    $dest = Join-Path $root 'mobile\HydroGauge-SL-release.apk'
    Copy-Item $apk.FullName $dest -Force
    Write-Host "`nAPK ready: $dest" -ForegroundColor Green
  }
} finally {
  Pop-Location
  Pop-Location
  Pop-Location
}
