@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================================
echo    🌌 AI STUDY ARENA - UNIVERSAL INSTALLER
echo ========================================================
echo.

:: 1. Check for Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed!
    echo Please install Git from https://git-scm.com/ and try again.
    pause
    exit /b
)

:: 2. Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node from https://nodejs.org/ and try again.
    pause
    exit /b
)

:: 3. Clone the Repository
set REPO_URL=https://github.com/aryanrajsinha8010/study-arena.git
set TARGET_DIR=study-arena

echo [1/3] Downloading the Arena from GitHub...
if exist "%TARGET_DIR%" (
    echo [INFO] Folder "%TARGET_DIR%" already exists.
    set /p delDir="Wipe existing folder and fresh install? (Y/N): "
    if /i "!delDir!"=="Y" (
        rd /s /q "%TARGET_DIR%"
        git clone %REPO_URL%
    )
) else (
    git clone %REPO_URL%
)

:: 4. Transition to Project Setup
if exist "%TARGET_DIR%" (
    echo.
    echo [2/3] Repository cloned successfully!
    cd "%TARGET_DIR%"
    
    echo [3/3] Handing over to internal setup...
    if exist "SETUP_AND_RUN.bat" (
        call SETUP_AND_RUN.bat
    ) else (
        echo [ERROR] Internal setup script missing in the repository.
        pause
    )
) else (
    echo [ERROR] Failed to clone. Please check your internet connection or Repo URL.
    pause
)
