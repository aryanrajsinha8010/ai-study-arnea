@echo off
setlocal enabledelayedexpansion

:: ==============================
:: 🔧 EDIT THIS ONLY
:: ==============================
set REPO_URL=https://github.com/aryanrajsinha8010/ai-study-arnea.git
set SCRIPT_NAME=auto git uploader.bat

echo.
echo ===== 🧠 SMART AI GITHUB UPLOADER =====
echo.

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
:: SET USER
:: ==============================
git config --global user.name "aryanrajsinha8010s"
git config --global user.email "jnsfilterbot@gmail.com"

:: ==============================
:: CREATE .gitignore IF NOT EXISTS
:: ==============================
if not exist ".gitignore" (
    echo Creating .gitignore...
    (
        echo %SCRIPT_NAME%
        echo __pycache__/
        echo *.log
        echo *.tmp
        echo node_modules/
        echo .env
        echo *.zip
        echo *.rar
        echo *.mp4
        echo *.bin
    ) > .gitignore
)

:: ==============================
:: INIT REPO
:: ==============================
if not exist ".git" (
    echo Initializing repository...
    git init
    git branch -M main
    git remote add origin %REPO_URL%
)

:: ==============================
:: PERFORMANCE BOOST
:: ==============================
git config core.preloadindex true
git config core.fscache true
git config gc.auto 256

:: ==============================
:: CHECK LARGE FILES (>100MB)
:: ==============================
echo Scanning for large files...
for /r %%F in (*) do (
    if %%~zF GTR 100000000 (
        echo [WARNING] Large file detected: %%F
    )
)

:: ==============================
:: ADD FILES
:: ==============================
echo Adding files...
git add .

:: Remove this script from staging (extra safety)
git reset %SCRIPT_NAME% >nul 2>&1

:: ==============================
:: CHECK CHANGES
:: ==============================
git diff --cached --quiet
if %errorlevel%==0 (
    echo No changes to upload.
    goto END
)

:: ==============================
:: SMART COMMIT MESSAGE
:: ==============================
for /f %%i in ('git diff --cached --name-only ^| find /c /v ""') do set COUNT=%%i
set msg=Updated !COUNT! files - %date% %time%

echo Committing...
git commit -m "!msg!"

:: ==============================
:: PUSH
:: ==============================
echo Uploading to GitHub...
git push -u origin main

:END
echo.
echo ===== 🚀 DONE (SMART MODE) =====
echo.

pause