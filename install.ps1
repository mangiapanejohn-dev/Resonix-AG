#!/usr/bin/env pwsh
# Resonix-AG installer for Windows
# Usage: iwr -useb https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.ps1 | iex
# Updated: 2026-03-12 (Robust error handling + fallbacks)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-UserHome {
    $candidates = @(
        $env:USERPROFILE,
        [Environment]::GetFolderPath("UserProfile"),
        $HOME
    )

    foreach ($candidate in $candidates) {
        if (-not [string]::IsNullOrWhiteSpace($candidate)) {
            return $candidate
        }
    }

    throw "Unable to resolve user home path."
}

function Resolve-LocalAppData {
    param([string]$UserHome)

    $candidates = @(
        $env:LOCALAPPDATA,
        [Environment]::GetFolderPath("LocalApplicationData")
    )

    foreach ($candidate in $candidates) {
        if (-not [string]::IsNullOrWhiteSpace($candidate)) {
            return $candidate
        }
    }

    return (Join-Path $UserHome "AppData\Local")
}

$UserHome = Resolve-UserHome
$LocalAppData = Resolve-LocalAppData -UserHome $UserHome

$RepoUrl = if ($env:RESONIX_REPO_URL) { $env:RESONIX_REPO_URL } else { "https://github.com/mangiapanejohn-dev/Resonix-AG.git" }
$InstallRoot = if ($env:RESONIX_INSTALL_ROOT) { $env:RESONIX_INSTALL_ROOT } else { Join-Path $LocalAppData "Resonix" }
$SourceDir = if ($env:RESONIX_SOURCE_DIR) { $env:RESONIX_SOURCE_DIR } else { Join-Path $InstallRoot "source" }
$BinDir = if ($env:RESONIX_BIN_DIR) { $env:RESONIX_BIN_DIR } else { Join-Path $InstallRoot "bin" }
$PnpmVersion = if ($env:RESONIX_PNPM_VERSION) { $env:RESONIX_PNPM_VERSION } else { "10.23.0" }
$SkipPathSetup = if ($env:RESONIX_INSTALL_SKIP_PATH) { $env:RESONIX_INSTALL_SKIP_PATH } else { "0" }

$script:PackageManager = "npm"
$script:UseCorepackPnpm = $false

$supportsAnsi = $false
try {
    if ($Host.UI -and $Host.UI.SupportsVirtualTerminal) {
        $supportsAnsi = $true
    }
} catch {
    $supportsAnsi = $false
}

if ($supportsAnsi) {
    $RESET = "`e[0m"
    $BOLD = "`e[1m"
    $CYAN = "`e[36m"
    $PURPLE = "`e[35m"
    $GREEN = "`e[32m"
    $YELLOW = "`e[33m"
    $RED = "`e[31m"
} else {
    $RESET = ""
    $BOLD = ""
    $CYAN = ""
    $PURPLE = ""
    $GREEN = ""
    $YELLOW = ""
    $RED = ""
}

function Write-Banner {
    Write-Host ""
    Write-Host "$PURPLE RRRR    EEEE   SSS   OOO   N   N   III  X   X $RESET"
    Write-Host "$PURPLE R   R   E     S     O   O  NN  N    I    X X  $RESET"
    Write-Host "$PURPLE RRRR    EEE    SS   O   O  N N N    I     X   $RESET"
    Write-Host "$PURPLE R   R   E        S  O   O  N  NN    I    X X  $RESET"
    Write-Host "$PURPLE R   R   EEEE  SSS    OOO   N   N   III  X   X $RESET"
    Write-Host ""
    Write-Host "$BOLD👾 Resonix Installer (Windows)$RESET"
    Write-Host " Source: $SourceDir"
    Write-Host " Binary: $BinDir\resonix.cmd"
    Write-Host " State directory: $UserHome\.resonix"
    Write-Host ""
    Write-Host "[$CYAN INFO$RESET] Hey bro, Resonix is tying its shoelaces..."
    Write-Host ""
}

function Write-Info {
    param([string]$Message)
    Write-Host "[$CYAN INFO$RESET] $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Host "[$GREEN OK$RESET] $Message"
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[$YELLOW WARN$RESET] $Message"
}

function Write-Fail {
    param([string]$Message)
    Write-Host "[$RED ERROR$RESET] $Message"
    exit 1
}

function Get-NodeVersion {
    try {
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
        if (-not $nodeCmd) {
            return $null
        }
        $version = & node --version 2>$null
        if ($LASTEXITCODE -ne 0 -or $null -eq $version) {
            return $null
        }
        return $version.Trim()
    } catch {
        return $null
    }
}

function Check-Requirements {
    $nodeVersion = Get-NodeVersion

    if ([string]::IsNullOrWhiteSpace($nodeVersion)) {
        Write-Fail "Node.js not found. Install Node.js 22+ from: https://nodejs.org (LTS recommended)"
    }

    try {
        $nodeMajor = [int](($nodeVersion -replace '^v', '').Split('.')[0])
    } catch {
        Write-Fail "Unable to parse Node.js version: $nodeVersion"
    }

    if ($nodeMajor -lt 22) {
        Write-Warn "Node.js version is $nodeVersion. Resonix works best with Node 22+."
        Write-Info "If installation fails, upgrade Node.js: https://nodejs.org"
    }

    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitCmd) {
        Write-Warn "Git not found. Attempting to install..."
        try {
            winget install --id Git.Git --exact --silent --accept-source-agreements --accept-package-agreements 2>$null
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            $gitCmd = Get-Command git -ErrorAction SilentlyContinue
            if (-not $gitCmd) {
                Write-Fail "Git installation failed. Install manually from: https://git-scm.com"
            }
            Write-Success "Git installed successfully"
        } catch {
            Write-Fail "Cannot install Git automatically. Install from: https://git-scm.com"
        }
    }

    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmCmd) {
        Write-Fail "npm not found. Reinstall Node.js from: https://nodejs.org"
    }

    Write-Success "Requirements checked (Node $nodeVersion)"
}

function Setup-PackageManager {
    $pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
    if ($pnpmCmd) {
        $script:PackageManager = "pnpm"
        $script:UseCorepackPnpm = $false
        $version = & pnpm --version 2>$null
        Write-Success "Using pnpm ($version)"
        return
    }

    $corepackCmd = Get-Command corepack -ErrorAction SilentlyContinue
    if ($corepackCmd) {
        Write-Info "pnpm not found, trying corepack..."
        try {
            corepack enable 2>$null | Out-Null
            corepack prepare "pnpm@$PnpmVersion" --activate 2>$null | Out-Null
            $script:PackageManager = "pnpm"
            $script:UseCorepackPnpm = $true
            Write-Success "pnpm enabled via corepack"
            return
        } catch {
            Write-Warn "corepack setup failed: $($_.Exception.Message)"
        }
    }

    try {
        Write-Info "Trying npm global install for pnpm..."
        npm install -g "pnpm@$PnpmVersion" 2>&1 | Out-Host
        $pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
        if ($pnpmCmd) {
            $script:PackageManager = "pnpm"
            $script:UseCorepackPnpm = $false
            $version = & pnpm --version 2>$null
            Write-Success "Using pnpm ($version) after npm global install"
            return
        }
    } catch {
        Write-Warn "Unable to install pnpm globally: $($_.Exception.Message)"
    }

    $script:PackageManager = "npm"
    Write-Warn "pnpm unavailable; using npm. Resonix can still cook."
}

function Invoke-Pnpm {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)

    if ($script:UseCorepackPnpm) {
        & corepack pnpm @Args
    } else {
        & pnpm @Args
    }

    if ($LASTEXITCODE -ne 0) {
        throw "pnpm command failed: $($Args -join ' ')"
    }
}

function Backup-Path {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    $stamp = Get-Date -Format "yyyyMMddHHmmss"
    $backup = "$Path.backup.$stamp"

    try {
        Move-Item -Path $Path -Destination $backup -Force
        Write-Warn "Preserved existing path as: $backup"
    } catch {
        Write-Warn "Failed to backup: $($_.Exception.Message)"
    }
}

function Clone-Fresh {
    if (Test-Path $SourceDir) {
        Backup-Path -Path $SourceDir
    }

    $parentDir = Split-Path -Parent $SourceDir
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
    }

    Write-Info "Cloning Resonix source (this may take a moment)..."
    git clone --depth 1 $RepoUrl $SourceDir 2>&1 | Out-Host

    if ($LASTEXITCODE -ne 0) {
        Write-Fail "git clone failed. Check your internet connection and try again."
    }
}

function Install-OrUpdateSource {
    $gitDir = Join-Path $SourceDir ".git"

    if (Test-Path $gitDir) {
        try {
            $dirty = git -C $SourceDir status --porcelain 2>$null

            if (-not [string]::IsNullOrWhiteSpace($dirty)) {
                Write-Warn "Local changes detected in $SourceDir; cloning fresh to keep your edits safe."
                Clone-Fresh
                return
            }

            Write-Info "Updating existing checkout..."
            git -C $SourceDir remote set-url origin $RepoUrl 2>$null | Out-Null

            $fetchResult = git -C $SourceDir fetch --depth 1 origin main 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Warn "Git update failed; recloning source."
                Clone-Fresh
                return
            }

            git -C $SourceDir checkout -q main 2>$null | Out-Null
            git -C $SourceDir reset --hard origin/main 2>&1 | Out-Null
            return
        } catch {
            Write-Warn "Git error: $($_.Exception.Message); recloning source."
            Clone-Fresh
            return
        }
    }

    if (Test-Path $SourceDir) {
        Write-Warn "Existing non-git path at $SourceDir; preserving and cloning fresh."
    }

    Write-Info "Cloning Resonix source..."
    Clone-Fresh
}

function Install-Dependencies {
    if (-not (Test-Path $SourceDir)) {
        Write-Fail "Source directory not found: $SourceDir"
    }

    Set-Location $SourceDir

    if ($script:PackageManager -eq "pnpm") {
        try {
            Write-Info "Installing dependencies with pnpm (Resonix is stocking the fridge)."
            Invoke-Pnpm install --frozen-lockfile 2>&1 | Out-Host
        } catch {
            Write-Warn "Frozen install failed; retrying without lockfile strictness."
            Invoke-Pnpm install 2>&1 | Out-Host
        }
        return
    }

    Write-Info "Installing dependencies with npm"
    $npmResult = npm install 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "npm install failed. Try running as Administrator or check your network."
    }
}

function Ensure-KoffiNative {
    if (-not (Test-Path $SourceDir)) {
        return
    }

    Set-Location $SourceDir
    Write-Info "Verifying native dependency: koffi"

    if ($script:PackageManager -eq "pnpm") {
        try {
            Invoke-Pnpm rebuild koffi 2>&1 | Out-Host
        } catch {
            Write-Warn "pnpm rebuild koffi failed; retrying once."
            Invoke-Pnpm rebuild koffi 2>&1 | Out-Host
        }
    } else {
        $npmResult = npm rebuild koffi 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "npm rebuild koffi reported issues (this may be okay)"
        }
    }

    try {
        $testResult = node -e "try { require('sqlite-vec'); console.log('OK'); } catch(e) { console.error(e.message); process.exit(1); }" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Native dependency check had warnings (may still work)"
        }
    } catch {
        Write-Warn "Native dependency check: $($_.Exception.Message)"
    }

    Write-Success "Native dependency check completed"
}

function Build-Source {
    if (-not (Test-Path $SourceDir)) {
        Write-Fail "Source directory not found: $SourceDir"
    }

    Set-Location $SourceDir
    Write-Info "Building Resonix CLI and runtime..."

    if ($script:PackageManager -eq "pnpm") {
        Invoke-Pnpm build 2>&1 | Out-Host
        return
    }

    $buildResult = npm run build 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "npm run build failed. Check the error messages above."
    }
}

function Install-Launcher {
    if (-not (Test-Path $BinDir)) {
        New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
    }

    $cmdTemplate = @'
@echo off
setlocal
set "RESONIX_SOURCE_DIR=__SOURCE_DIR__"
if not exist "%RESONIX_SOURCE_DIR%\resonix.mjs" (
  echo [resonix] CLI entry not found at "%RESONIX_SOURCE_DIR%\resonix.mjs"
  echo [resonix] Re-run installer.
  exit /b 1
)
node "%RESONIX_SOURCE_DIR%\resonix.mjs" %*
'@

    $psTemplate = @'
#!/usr/bin/env pwsh
$sourceDir = if ($env:RESONIX_SOURCE_DIR) { $env:RESONIX_SOURCE_DIR } else { "__SOURCE_DIR__" }
$entry = Join-Path $sourceDir "resonix.mjs"
if (-not (Test-Path $entry)) {
    Write-Error "[resonix] CLI entry not found at $entry"
    exit 1
}
& node $entry @args
'@

    $cmdWrapper = $cmdTemplate.Replace("__SOURCE_DIR__", $SourceDir)
    $psWrapper = $psTemplate.Replace("__SOURCE_DIR__", $SourceDir)

    try {
        Set-Content -Path (Join-Path $BinDir "resonix.cmd") -Value $cmdWrapper -Encoding ASCII -Force
        Set-Content -Path (Join-Path $BinDir "resonix.ps1") -Value $psWrapper -Encoding UTF8 -Force
        Write-Success "Launcher installed: $(Join-Path $BinDir 'resonix.cmd')"
    } catch {
        Write-Fail "Failed to install launcher: $($_.Exception.Message)"
    }
}

function Ensure-UserPath {
    try {
        $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
        $segments = @()

        if (-not [string]::IsNullOrWhiteSpace($userPath)) {
            $segments = $userPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        }

        $hasBin = $false
        foreach ($segment in $segments) {
            if ($segment.TrimEnd('\') -ieq $BinDir.TrimEnd('\')) {
                $hasBin = $true
                break
            }
        }

        if (-not $hasBin) {
            $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $BinDir } else { "$BinDir;$userPath" }
            [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
            Write-Success "Updated user PATH"
        }

        $sessionPath = if ($env:Path) { $env:Path } else { "" }
        $sessionHasBin = $false
        foreach ($segment in ($sessionPath -split ';')) {
            if (-not [string]::IsNullOrWhiteSpace($segment) -and $segment.TrimEnd('\') -ieq $BinDir.TrimEnd('\')) {
                $sessionHasBin = $true
                break
            }
        }

        if (-not $sessionHasBin) {
            $env:Path = if ([string]::IsNullOrWhiteSpace($sessionPath)) { $BinDir } else { "$BinDir;$sessionPath" }
        }
    } catch {
        Write-Warn "PATH update failed: $($_.Exception.Message)"
    }
}

function Print-Success {
    Write-Host ""
    Write-Success "Resonix installed successfully. Your digital roommate just moved in."
    Write-Host ""
    Write-Host "$BOLD Next steps$RESET"
    Write-Host "  1) Verify: resonix -v"
    Write-Host "  2) Onboard: resonix onboard"
    Write-Host "  3) Start gateway: resonix gateway start"
    Write-Host ""
    Write-Host "If 'resonix' is not found yet, open a new PowerShell window."
}

function Main {
    Write-Banner
    Check-Requirements
    Setup-PackageManager
    Install-OrUpdateSource
    Install-Dependencies
    Ensure-KoffiNative
    Build-Source
    Install-Launcher

    if ($SkipPathSetup -eq "1") {
        Write-Warn "Skipping PATH updates (RESONIX_INSTALL_SKIP_PATH=1)"
    } else {
        Ensure-UserPath
    }

    Print-Success
}

try {
    Main
} catch {
    Write-Fail "Installer failed: $($_.Exception.Message)"
}
