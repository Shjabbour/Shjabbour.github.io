@echo off
setlocal
cd /d "%~dp0"
title Shadi Portfolio - Local Dev
echo Starting the local portfolio dev server...
echo Open the local URL printed below in your browser.
echo.
call pnpm dev:local
echo.
echo The local dev server has stopped. Press any key to close.
pause >nul
