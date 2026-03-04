#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$tempBaseRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$tempBase = Join-Path $tempBaseRoot ("resonix-installers-" + [Guid]::NewGuid().ToString("N"))

try {
    New-Item -ItemType Directory -Force -Path $tempBase | Out-Null

    $homeDir = Join-Path $tempBase "home"
    New-Item -ItemType Directory -Force -Path $homeDir | Out-Null

    $installRoot = if ($env:RESONIX_INSTALL_ROOT) { $env:RESONIX_INSTALL_ROOT } else { Join-Path $tempBase "resonix-install" }
    $sourceDir = if ($env:RESONIX_SOURCE_DIR) { $env:RESONIX_SOURCE_DIR } else { Join-Path $installRoot "source" }
    $binDir = if ($env:RESONIX_BIN_DIR) { $env:RESONIX_BIN_DIR } else { Join-Path $tempBase "resonix-bin" }
    $repoUrl = if ($env:RESONIX_REPO_URL) { $env:RESONIX_REPO_URL } else { "$rootDir" }

    $env:USERPROFILE = $homeDir
    $env:RESONIX_REPO_URL = $repoUrl
    $env:RESONIX_INSTALL_ROOT = $installRoot
    $env:RESONIX_SOURCE_DIR = $sourceDir
    $env:RESONIX_BIN_DIR = $binDir
    $env:RESONIX_INSTALL_SKIP_PATH = "1"

    Write-Host "==> First install"
    & (Join-Path $rootDir "install.ps1")

    $cli = Join-Path $binDir "resonix.cmd"
    if (-not (Test-Path $cli)) {
        throw "CLI launcher not found at $cli"
    }

    & $cli -v
    & $cli --help | Out-Null

    Write-Host "==> Second install (upgrade path)"
    & (Join-Path $rootDir "install.ps1")

    & $cli -v
    & $cli --help | Out-Null

    Write-Host "==> Installer smoke passed"
}
finally {
    Remove-Item -LiteralPath $tempBase -Recurse -Force -ErrorAction SilentlyContinue
}
