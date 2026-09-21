@echo off
cd /d "%~dp0"
echo ===================================================
echo   Starting mace-man 3D Builder...
echo ===================================================

if not exist "node_modules\" (
    echo Installing dependencies (First time setup)...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies.
        pause
        exit /b %errorlevel%
    )
)

echo Opening browser at http://localhost:3000/ ...
start http://localhost:3000/

echo Starting local server...
call npm.cmd run dev
pause
