@echo off
set PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%
cd /d %~dp0
node --env-file=.env node_modules\tsx\dist\cli.mjs src\index.ts
