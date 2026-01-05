@echo off
echo Testing Restaurant Management System...
echo.

echo Testing Tenant Service (Port 3001)...
curl -s http://localhost:3001/health
echo.

echo Testing Menu Service (Port 3002)...
curl -s http://localhost:3002/health
echo.

echo Testing POS Service (Port 3004)...
curl -s http://localhost:3004/health
echo.

echo Testing Payment Service (Port 3009)...
curl -s http://localhost:3009/health
echo.

echo.
echo Test completed. Check the responses above.
pause