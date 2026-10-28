@echo off
chcp 65001 > nul
title Edge Studio & GitHub Frontend Extractor
echo =======================================================
echo   استوديو التقاط واجهات Microsoft Edge واستخراج GitHub
echo =======================================================
echo.
echo تشغيل الخادم المحلي على http://localhost:3000 ...
start "" "http://localhost:3000"
node src/server.js
pause
