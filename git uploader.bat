@echo off
setlocal enabledelayedexpansion

set REPO_URL=https://github.com/aryanrajsinha8010/ai-study-arnea.git
set BRANCH=main

echo.
echo ===== AI STUDY ARENA - GITHUB UPLOADER =====
echo.

cd /d "%~dp0"

:: Check Git installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed.
    echo Download from: https://git-scm.com
    pause
    exit /b
)

:: Set user
git config --global user.name "aryanrajsinha8010"
git config --global user.email "techzsmart709@gmail.com"

:: Create .gitignore if missing
if not exist ".gitignore" (
    echo Creating .gitignore...
    (
        echo node_modules/
        echo .env
        echo *.log
        echo *.tmp
        echo dist/
        echo build/
        echo .DS_Store
    ) > .gitignore
    echo [OK] .gitignore created.
)

:: Init repo if first time
if not exist ".git" (
    echo Initializing git repository...
    git init
    git branch -M %BRANCH%
    git remote add origin %REPO_URL%
    echo [OK] Repo initialized.
) else (
    git remote set-url origin %REPO_URL% >nul 2>&1
)

:: Performance config
git config core.preloadindex true
git config core.fscache true
git config gc.auto 256

:: Stage all changes
echo Staging changes...
git add .
git reset -- "git uploader.bat" >nul 2>&1

:: Commit if there are changes
git diff --cached --quiet
if %errorlevel% neq 0 (
    for /f %%i in ('git diff --cached --name-only ^| find /c /v ""') do set COUNT=%%i
    echo.
    echo Files changed:
    git diff --cached --name-only
    echo.
    git commit -m "update !COUNT! file(s) - %date% %time:~0,8%"
    echo [OK] Committed.
) else (
    echo [INFO] No new changes to commit.
)

:: Push to GitHub
echo.
echo Pushing to GitHub...
git push -u origin %BRANCH%
if %errorlevel% neq 0 (
    echo [WARN] Push failed. Trying force push...
    git push -u origin %BRANCH% --force
)

echo.
echo ===== UPLOAD COMPLETE =====
echo Repo : %REPO_URL%
echo Branch: %BRANCH%
echo.
pause