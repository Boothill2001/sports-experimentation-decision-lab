@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [1/4] Creating Python 3.11 environment...
  py -3.11 -m venv .venv || goto :failed
)

echo [2/4] Installing the experiment lab...
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q -e .
if errorlevel 1 goto :failed

echo [3/4] Exporting deterministic scenario evidence...
".venv\Scripts\sports-exp.exe" export-pages
if errorlevel 1 goto :failed

echo [4/4] Opening http://localhost:8091 ...
start "sports-experiment-lab" cmd /k "cd /d %~dp0 && .venv\Scripts\python.exe -m uvicorn sports_exp.api:app --port 8091"
timeout /t 3 /nobreak >nul
start http://localhost:8091
exit /b 0

:failed
echo [ERROR] Setup failed. Review the message above.
pause
exit /b 1

