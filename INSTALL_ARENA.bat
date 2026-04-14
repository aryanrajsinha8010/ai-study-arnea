@echo off
setlocal enabledelayedexpansion
title AI Study Arena - Universal Bootstrapper

echo.
echo ========================================================
echo          AI STUDY ARENA - UNIVERSAL BOOTSTRAPPER
echo ========================================================
echo.

:: --- CONFIGURATION ---
set "REPO_URL=https://github.com/aryanrajsinha8010/ai-study-arnea.git"
set "FOLDER_NAME=ai-study-arena"

set "GEMINI_KEY=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"
set "OPENAI_KEY=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"
set "SUPABASE_URL=https://fvvgvjybiqzhdadlcncp.supabase.co"
set "SUPABASE_ANON=sb_publishable_6DChJgvi9ORTlz0eEmPtxg_mHUQFiYP"
:: ---------------------

:: 1. Git Verification
echo [1/4] Verifying Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed!
    echo Please install Git from https://git-scm.com
    pause
    exit /b
)
echo [OK] Git detected.

:: 2. Repository Acquisition
echo [2/4] Cloning repository from GitHub...
if exist "%FOLDER_NAME%" (
    echo [INFO] Folder already exists. Skipping clone...
) else (
    git clone %REPO_URL% %FOLDER_NAME%
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to clone repository.
        pause
        exit /b
    )
)
cd %FOLDER_NAME%

:: 3. Credential Injection
echo [3/4] Injecting secure credentials...
if not exist "backend" mkdir "backend"

(
    echo GEMINI_API_KEY=%GEMINI_KEY%
    echo OPENAI_API_KEY=%OPENAI_KEY%
    echo SUPABASE_URL=%SUPABASE_URL%
    echo SUPABASE_ANON_KEY=%SUPABASE_ANON%
) > "backend\.env"

echo [OK] Environment configured.

:: 4. Handoff to Setup
echo [4/4] Handing off to main setup engine...
echo.
echo ========================================================
echo    BOOTSTRAP COMPLETE. STARTING SYSTEM SETUP...
echo ========================================================
echo.

if exist "SETUP_AND_RUN.bat" (
    call SETUP_AND_RUN.bat
) else (
    echo [ERROR] Main setup script missing in repository!
    pause
)
