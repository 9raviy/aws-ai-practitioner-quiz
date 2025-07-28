@echo off
echo Testing backend connectivity...
echo.

echo 1. Checking if backend is running on port 3001...
curl -s http://localhost:3001/api/v1/health > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is running and accessible
    curl http://localhost:3001/api/v1/health
) else (
    echo ❌ Backend is not accessible on port 3001
    echo.
    echo Troubleshooting:
    echo 1. Make sure backend is running: cd backend ^&^& npm run dev
    echo 2. Check for error messages in the backend terminal
    echo 3. Verify AWS credentials are configured
    echo 4. Check if port 3001 is available
)

echo.
echo 2. Checking frontend configuration...
if exist "..\frontend\.env.local" (
    echo ✅ Frontend environment file exists
    type "..\frontend\.env.local"
) else (
    echo ❌ Frontend environment file missing
)

pause
