@echo off
echo ========================================
echo Admin Dashboard Backend Testing
echo ========================================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

echo Node.js found. Starting backend testing...
echo.

echo Installing required dependencies...
npm install axios colors >nul 2>&1

echo.
echo Running admin dashboard backend tests...
echo.

node quick-admin-dashboard-test.js

echo.
echo Testing completed. Check the results above.
echo.
echo Next steps:
echo 1. Open Postman
echo 2. Import Restaurant_Management_System_API.postman_collection.json
echo 3. Follow ADMIN_DASHBOARD_TESTING_PLAN.md for detailed testing
echo.
pause