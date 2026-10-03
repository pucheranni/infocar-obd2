#!/bin/sh
# Script de inicialização rápida do AutoPulse OBD2 no Termux

cd "$(dirname "$0")" || exit 1

echo "=================================================="
echo "🚗 Iniciando AutoPulse OBD2..."
echo "=================================================="

# Se o comando termux-wake-lock existir (Termux:API), ativa para manter o processo vivo
if command -v termux-wake-lock >/dev/null 2>&1; then
    termux-wake-lock
    echo "⚡ Termux Wake Lock ativado (evita suspensão pelo Android)"
fi

# Inicia o servidor Python
python server.py "$@"
