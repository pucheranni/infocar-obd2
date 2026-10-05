@echo off
chcp 65001 >nul
echo Iniciando Microsoft Edge com Remote Debugging na porta 9222 para o GPT-Sol...

:: Caminho padrão do executável do Microsoft Edge
set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_PATH%" (
    set "EDGE_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

if not exist "%EDGE_PATH%" (
    echo [ERRO] Executavel do Microsoft Edge nao encontrado.
    pause
    exit /b 1
)

:: Inicia o Edge apontando para o Microsoft 365 Copilot com a porta CDP 9222
start "" "%EDGE_PATH%" --remote-debugging-port=9222 --remote-allow-origins=* "https://m365.cloud.microsoft/chat"

echo [OK] Microsoft Edge iniciado na porta 9222.
echo Verifique se a sua conta corporativa esta conectada no Copilot.
timeout /t 3 >nul
