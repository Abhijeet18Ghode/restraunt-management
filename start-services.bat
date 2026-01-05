@echo off
echo Starting Restaurant Management System Services...
echo.

echo Starting Tenant Service...
start "Tenant Service" cmd /k "cd services\tenant-service && node src\app.js"
timeout /t 3 /nobreak >nul

echo Starting Menu Service...
start "Menu Service" cmd /k "cd services\menu-service && node src\app.js"
timeout /t 3 /nobreak >nul

echo Starting Inventory Service...
start "Inventory Service" cmd /k "cd services\inventory-service && node src\app.js"
timeout /t 3 /nobreak >nul

echo Starting POS Service...
start "POS Service" cmd /k "cd services\pos-service && node src\app.js"
timeout /t 3 /nobreak >nul

echo Starting Payment Service...
start "Payment Service" cmd /k "cd services\payment-service && node src\app.js"
timeout /t 3 /nobreak >nul

echo Starting Analytics Service...
start "Analytics Service" cmd /k "cd services\analytics-service && node src\app.js"
timeout /t 3 /nobreak >nul

echo.
echo Services are starting in separate windows...
echo Wait 10-15 seconds for all services to initialize.
echo.
pause