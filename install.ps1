#!/usr/bin/env pwsh
# Resonix-AG Windows Installer
# One-line install: iwr -useb https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

# ANSI color codes
$RESET = "`e[0m"
$BOLD = "`e[1m"
$CYAN = "`e[36m"
$PURPLE = "`e[35m"
$GREEN = "`e[32m"
$YELLOW = "`e[33m"

function Write-Banner {
    Write-Host ""
    Write-Host "$PURPLE██████╗██████╗██████╗██████╗$RESET" -ForegroundColor Magenta
    Write-Host "$PURPLE██╔══██╗██╔══██╗██╔══██╗██╔══██╗$RESET" -ForegroundColor Magenta
    Write-Host "$PURPLE██║██████╔╝██║██████╔╝██████╔╝$RESET" -ForegroundColor Magenta
    Write-Host "$PURPLE██║██╔══██╗██║██╔══██╗██╔══██╗$RESET" -ForegroundColor Magenta
    Write-Host "$PURPLE██║██║██████╔╝██║██████╔╝██████╔╝$RESET" -ForegroundColor Magenta
    Write-Host "$PURPLE╚═╝╚═╝╚═╝╚═╝╚═╝╚═╝╚═╝╚═╝$RESET" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "$PURPLE👾 RESONIX 👾$RESET $BOLD$CYANAutonomous AI Agent$RESET" -ForegroundColor White
    Write-Host "$BOLD  Created by MarkEllington  |  v1.2.7$RESET" -ForegroundColor Gray
    Write-Host ""
}

function Write-Info {
    param([string]$Message)
    Write-Host "[$CYAN INFO$RESET] $Message"
}

function Write-Success {
    param([string]$Message)
    Write-Host "[$GREEN SUCCESS$RESET] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[$YELLOW WARN$RESET] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[$PURPLE ERROR$RESET] $Message" -ForegroundColor Red
}

# Detect installation directory
$INST_DIR = if ($env:RESONIX_HOME) { $env:RESONIX_HOME } else { "$env:USERPROFILE\.resonix" }
$RESONIX_REPO = "https://github.com/mangiapanejohn-dev/Resonix-AG.git"
$RESONIX_RAW = "https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main"

# Main installation
function Install-Resonix {
    Write-Banner
    Write-Host "$BOLD$CYAN Resonix-AG Installer v1.2.7$RESET" -ForegroundColor Cyan
    Write-Host ""
    
    # Check prerequisites
    Write-Info "Checking requirements..."
    
    # Check Node.js
    try {
        $nodeVersion = (node --version 2>$null)
        if ($nodeVersion) {
            $nodeMajor = [int]($nodeVersion -replace 'v','' -split '\.')[0]
            if ($nodeMajor -ge 20) {
                Write-Success "Node.js $nodeVersion (>= 20)"
            } else {
                Write-Warn "Node.js $nodeVersion found, but v20+ recommended"
            }
        } else {
            throw "Node.js not found"
        }
    } catch {
        Write-Error "Node.js not found. Please install from https://nodejs.org"
        Write-Host "  Download: https://nodejs.org (LTS version)" -ForegroundColor Gray
        exit 1
    }
    
    # Check git
    try {
        $gitVersion = (git --version 2>$null)
        if (-not $gitVersion) {
            throw "Git not found"
        }
        Write-Success $gitVersion
    } catch {
        Write-Error "Git not found. Please install from https://git-scm.com"
        exit 1
    }
    
    # Check pnpm (optional)
    $pnpmAvailable = $false
    try {
        $pnpmVersion = (pnpm --version 2>$null)
        if ($pnpmVersion) {
            $pnpmAvailable = $true
            Write-Success "pnpm $pnpmVersion"
        }
    } catch {
        Write-Warn "pnpm not found, will use npm"
    }
    
    Write-Host ""
    Write-Info "Installing Resonix-AG to: $INST_DIR"
    
    # Clone or update repository
    if (Test-Path $INST_DIR) {
        Write-Info "Updating existing installation..."
        Set-Location $INST_DIR
        git pull origin main 2>$null
    } else {
        Write-Info "Cloning Resonix-AG from GitHub..."
        git clone $RESONIX_REPO $INST_DIR --depth 1
        Set-Location $INST_DIR
    }
    
    # Install dependencies
    Write-Host ""
    Write-Info "Installing dependencies..."
    if ($pnpmAvailable) {
        pnpm install --no-frozen-lockfile 2>&1 | Out-Host
    } else {
        npm install 2>&1 | Out-Host
    }
    
    # Build
    Write-Host ""
    Write-Info "Building Resonix-AG..."
    if ($pnpmAvailable) {
        pnpm build 2>&1 | Out-Host
    } else {
        npm run build 2>&1 | Out-Host
    }
    
    # Create shortcuts
    Write-Host ""
    Write-Info "Creating shortcuts..."
    
    # Add to PATH (user level)
    $pathEntry = "$INST_DIR"
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($currentPath -notlike "*$pathEntry*") {
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$pathEntry", "User")
        Write-Success "Added to PATH"
    }
    
    # Create resonix.ps1 wrapper in the installation directory
    $wrapperContent = @"
#!/usr/bin/env pwsh
# Resonix wrapper script
`$scriptDir = Split-Path -Parent (`$MyInvocation.MyCommand.Path)
node "`$scriptDir\resonix.mjs" `$args
"@
    $wrapperContent | Out-File -FilePath "$INST_DIR\resonix.ps1" -Encoding UTF8
    
    Write-Host ""
    Write-Success "$BOLD Resonix-AG installed successfully!$RESET" -ForegroundColor Green
    Write-Host ""
    Write-Host "$BOLD Next steps:$RESET" -ForegroundColor White
    Write-Host "  1. Restart PowerShell or run: `$env:PATH += `";$INST_DIR`""
    Write-Host "  2. Run onboarding: $CYANresonix onboard$RESET"
    Write-Host "  3. Start gateway: $CYANresonix gateway start$RESET"
    Write-Host "  4. Get help: $CYANresonix --help$RESET"
    Write-Host ""
    Write-Host "$BOLD Join community:$RESET $CYANhttps://discord.gg/FKXPBAtPwG$RESET"
    Write-Host "$BOLD Follow updates:$RESET $CYANhttps://x.com/moralesjavx1032$RESET"
    Write-Host ""
}

# Run installation
Install-Resonix
