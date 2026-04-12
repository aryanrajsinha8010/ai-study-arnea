@echo off
setlocal enabledelayedexpansion

:: ==============================
:: 🔧 EDIT THIS ONLY
:: ==============================
set REPO_URL=https://github.com/aryanrajsinha8010/study-arena.git

echo.
echo ===== SMART GITHUB UPLOADER (FINAL) =====
echo.

:: Go to this file's folder (your project)
cd /d "%~dp0"

:: ==============================
:: CHECK GIT
:: ==============================
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git not installed
    echo Download: https://git-scm.com
    pause
    exit /b
)

:: ==============================
:: SET USER (already done, but safe)
:: ==============================
git config --global user.name "aryanrajsinha8010s"
git config --global user.email "jnsfilterbot@gmail.com"

:: ==============================
:: INIT REPO IF NEEDED
:: ==============================
if not exist ".git" (
    echo Initializing repository...
    git init
    git branch -M main
    git remote add origin %REPO_URL%
)

:: ==============================
:: PERFORMANCE OPTIMIZATION
:: ==============================
git config core.preloadindex true
git config core.fscache true
git config gc.auto 256

:: ==============================
:: ADD FILES
:: ==============================
echo Scanning files...
git add .

:: ==============================
:: CHECK IF CHANGES EXIST
:: ==============================
git diff --cached --quiet
if %errorlevel%==0 (
    echo No changes to upload.
    goto END
)

:: ==============================
:: COMMIT
:: ==============================
set msg=Auto Update - %date% %time%
echo Committing...
git commit -m "!msg!"

:: ==============================
:: PUSH
:: ==============================
echo Uploading to GitHub...
git push -u origin main

:END
echo.
echo ===== DONE 🚀 =====
echo.

pause