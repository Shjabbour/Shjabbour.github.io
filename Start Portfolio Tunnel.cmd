@echo off
setlocal
cd /d "%~dp0"
title Shadi Portfolio - Cloudflare Dev Tunnel
echo Starting the portfolio dev server and Cloudflare tunnel...
echo Leave this window open. The public URL will appear below, open in your browser,
echo and be copied to your clipboard automatically.
echo.
call pnpm dev
echo.
echo The portfolio tunnel has stopped. Press any key to close.
pause >nul
