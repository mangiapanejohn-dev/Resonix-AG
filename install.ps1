#!/usr/bin/env pwsh
# Resonix-AG installer for Windows
# Usage: iwr -useb https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$RepoUrl = if ($env:RESONIX_REPO_URL) { $env:RESONIX_REPO_URL } else { "https://github.com/mangiapanejohn-dev/Resonix-AG.git" }
$InstallRoot = if ($env:RESONIX_INSTALL_ROOT) { $env:RESONIX_INSTALL_ROOT } else { Join-Path $env:LOCALAPPDATA "Resonix" }
$SourceDir = if ($env:RESONIX_SOURCE_DIR) { $env:RESONIX_SOURCE_DIR } else { Join-Path $InstallRoot "source" }
$BinDir = if ($env:RESONIX_BIN_DIR) { $env:RESONIX_BIN_DIR } else { Join-Path $InstallRoot "bin" }
$PnpmVersion = if ($env:RESONIX_PNPM_VERSION) { $env:RESONIX_PNPM_VERSION } else { "10.23.0" }
$SkipPathSetup = if ($env:RESONIX_INSTALL_SKIP_PATH) { $env:RESONIX_INSTALL_SKIP_PATH } else { "0" }

$script:PackageManager = "npm"
$script:UseCorepackPnpm = $false

$RESET = "`e[0m"
$BOLD = "`e[1m"
$CYAN = "`e[36m"
$PURPLE = "`e[35m"
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$RED = "`e[31m"

function Write-Banner {
    Write-Host ""
    Write-Host "$PURPLE  RRR    EEE    SSS   OOO   N   N   II   X   X $RESET"
    Write-Host "$PURPLE R   R   E     S     O   O  NN  N    I    X X  $RESET"
    Write-Host "$PURPLE RRRR    EEE    SS   O   O  N N N    I     X   $RESET"
    Write-Host "$PURPLE R   R   E       S   O   O  N  NN    I    X X  $RESET"
    Write-Host "$PURPLE R   R   EEE   SSS    OOO   N   N   II   X   X $RESET"
    Write-Host ""
    Write-Host "$BOLD Resonix-AG Installer$RESET"
    Write-Host " Source: $SourceDir"
    Write-Host " Binary: $BinDir\resonix.cmd"
    Write-Host " Runtime state remains in $env:USERPROFILE\.resonix"
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

function Check-Requirements {
    try {
        $nodeVersion = node --version
    } catch {
        Write-Fail "Node.js not found. Install Node.js 22+ first: https://nodejs.org"
    }

    $nodeMajor = [int](($nodeVersion -replace '^v', '').Split('.')[0])
    if ($nodeMajor -lt 22) {
        Write-Fail "Node.js 22+ is required. Current: $nodeVersion"
    }

    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Fail "Git not found. Install from https://git-scm.com"
    }

    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Fail "npm not found. Reinstall Node.js with npm included."
    }

    Write-Success "Requirements OK (Node $nodeVersion)"
}

function Setup-PackageManager {
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        $script:PackageManager = "pnpm"
        $script:UseCorepackPnpm = $false
        Write-Success "Using pnpm $(pnpm --version)"
        return
    }

    if (Get-Command corepack -ErrorAction SilentlyContinue) {
        Write-Info "pnpm not found, enabling via corepack..."
        try {
            corepack enable | Out-Null
            corepack prepare "pnpm@$PnpmVersion" --activate | Out-Null
            $script:PackageManager = "pnpm"
            $script:UseCorepackPnpm = $true
            Write-Success "Using pnpm via corepack"
            return
        } catch {
            Write-Warn "corepack setup failed: $($_.Exception.Message)"
        }
    }

    try {
        Write-Info "Trying npm global install for pnpm..."
        npm install -g "pnpm@$PnpmVersion" | Out-Host
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            $script:PackageManager = "pnpm"
            $script:UseCorepackPnpm = $false
            Write-Success "Using pnpm after npm global install"
            return
        }
    } catch {
        Write-Warn "Unable to install pnpm globally: $($_.Exception.Message)"
    }

    $script:PackageManager = "npm"
    Write-Warn "pnpm unavailable; falling back to npm"
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

    $stamp = Get-Date -Format "yyyyMMddHHmmss"
    $backup = "$Path.backup.$stamp"
    Move-Item -Path $Path -Destination $backup
    Write-Warn "Preserved existing path as: $backup"
}

function Clone-Fresh {
    if (Test-Path $SourceDir) {
        Backup-Path -Path $SourceDir
    }

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $SourceDir) | Out-Null
    git clone --depth 1 $RepoUrl $SourceDir | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "git clone failed"
    }
}

function Install-OrUpdateSource {
    if (Test-Path (Join-Path $SourceDir ".git")) {
        $dirty = git -C $SourceDir status --porcelain
        if ($LASTEXITCODE -ne 0) {
            throw "git status failed"
        }

        if (-not [string]::IsNullOrWhiteSpace($dirty)) {
            Write-Warn "Local changes detected in $SourceDir; preserving checkout and cloning fresh."
            Clone-Fresh
            return
        }

        Write-Info "Updating existing checkout..."
        git -C $SourceDir remote set-url origin $RepoUrl | Out-Null
        git -C $SourceDir fetch --depth 1 origin main | Out-Host
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Git update failed; recloning source."
            Clone-Fresh
            return
        }

        git -C $SourceDir checkout -q main | Out-Null
        git -C $SourceDir reset --hard origin/main | Out-Host
        return
    }

    if (Test-Path $SourceDir) {
        Write-Warn "Existing non-git path at $SourceDir; preserving and cloning fresh."
    }

    Write-Info "Cloning Resonix-AG source..."
    Clone-Fresh
}

function Install-Dependencies {
    Set-Location $SourceDir

    if ($script:PackageManager -eq "pnpm") {
        try {
            Invoke-Pnpm install --frozen-lockfile
        } catch {
            Write-Warn "Frozen install failed; retrying without lockfile strictness."
            Invoke-Pnpm install
        }
        return
    }

    npm install | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
}

function Build-Source {
    Set-Location $SourceDir

    if ($script:PackageManager -eq "pnpm") {
        Invoke-Pnpm build
        return
    }

    npm run build | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed"
    }
}

function Install-Launcher {
    New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

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

    Set-Content -Path (Join-Path $BinDir "resonix.cmd") -Value $cmdWrapper -Encoding ASCII
    Set-Content -Path (Join-Path $BinDir "resonix.ps1") -Value $psWrapper -Encoding UTF8

    Write-Success "Installed launcher: $(Join-Path $BinDir 'resonix.cmd')"
}

function Ensure-UserPath {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $segments = @()

    if (-not [string]::IsNullOrWhiteSpace($userPath)) {
        $segments = $userPath -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    }

    $hasBin = $false
    foreach ($segment in $segments) {
        if ($segment.TrimEnd('\\') -ieq $BinDir.TrimEnd('\\')) {
            $hasBin = $true
            break
        }
    }

    if (-not $hasBin) {
        $newPath = if ([string]::IsNullOrWhiteSpace($userPath)) { $BinDir } else { "$BinDir;$userPath" }
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Success "Updated user PATH"
    }

    $sessionHasBin = $false
    foreach ($segment in ($env:Path -split ';')) {
        if ($segment.TrimEnd('\\') -ieq $BinDir.TrimEnd('\\')) {
            $sessionHasBin = $true
            break
        }
    }

    if (-not $sessionHasBin) {
        $env:Path = "$BinDir;$env:Path"
    }
}

function Main {
    Write-Banner
    Check-Requirements
    Setup-PackageManager
    Install-OrUpdateSource

    Write-Info "Installing dependencies..."
    Install-Dependencies

    Write-Info "Building Resonix-AG..."
    Build-Source

    Install-Launcher
    if ($SkipPathSetup -eq "1") {
        Write-Warn "Skipping PATH updates (RESONIX_INSTALL_SKIP_PATH=1)"
    } else {
        Ensure-UserPath
    }

    Write-Host ""
    Write-Success "Resonix-AG installed successfully."
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1) Verify command: resonix -v"
    Write-Host "  2) Run onboarding: resonix onboard"
    Write-Host "  3) Start gateway: resonix gateway start"
    Write-Host ""
    Write-Host "If 'resonix' is not found, open a new terminal window."
}

Main
