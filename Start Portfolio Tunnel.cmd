@echo off
setlocal
cd /d "%~dp0"
title Shadi Portfolio - Cloudflare Dev Tunnel
echo Starting the portfolio dev server and Cloudflare tunnel...
echo Leave this window open. The public URL will appear below.
echo.
call pnpm dev
echo.
echo The portfolio tunnel has stopped. Press any key to close.
pause >nul
