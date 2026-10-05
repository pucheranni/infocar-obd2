#!/usr/bin/env python3
"""
AutoPulse / Infocar OBD2 - Local Web Server & Wi-Fi OBD2 Bridge
Funciona sem dependências externas (apenas bibliotecas padrão do Python 3).
Serve a interface Web em http://0.0.0.0:8080 e faz a ponte TCP com o adaptador Wi-Fi OBD2 (192.168.0.10:35000).
"""

import sys
import os
import argparse
import ipaddress
import socket
import threading
import time
import json
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT_HTTP = 8080
TCP_OBD_IP = "192.168.0.10"
TCP_OBD_PORT = 35000
ALLOW_LAN = False

obd_socket = None
obd_lock = threading.Lock()
is_obd_connected = False
last_error = ""

def connect_tcp_obd(ip=TCP_OBD_IP, port=TCP_OBD_PORT, timeout=3.0):
    global obd_socket, is_obd_connected, last_error
    with obd_lock:
        try:
            if obd_socket:
                try:
                    obd_socket.close()
                except Exception:
                    pass
            obd_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            obd_socket.settimeout(timeout)
            obd_socket.connect((ip, int(port)))
            is_obd_connected = True
            last_error = ""
            print(f"[OBD2 Bridge] Conectado com sucesso a {ip}:{port}")
            return True, "Conectado"
        except Exception as e:
            is_obd_connected = False
            last_error = str(e)
            print(f"[OBD2 Bridge] Falha ao conectar em {ip}:{port}: {e}")
            return False, str(e)

def send_obd_command(cmd, timeout=2.5):
    global obd_socket, is_obd_connected, last_error
    with obd_lock:
        if not is_obd_connected or not obd_socket:
            return None, "Não conectado ao adaptador OBD2 Wi-Fi"
        try:
            obd_socket.settimeout(timeout)
            data_to_send = (cmd.strip() + "\r").encode('ascii')
            obd_socket.sendall(data_to_send)

            response = ""
            start_time = time.time()
            while time.time() - start_time < timeout:
                chunk = obd_socket.recv(1024).decode('ascii', errors='ignore')
                if not chunk:
                    break
                response += chunk
                if '>' in response:
                    break

            return response, None
        except socket.timeout:
            return response if response else "TIMEOUT", "Timeout"
        except Exception as e:
            is_obd_connected = False
            last_error = str(e)
            return None, str(e)


class OBDRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve files from directory of this script
        base_dir = os.path.dirname(os.path.abspath(__file__))
        super().__init__(*args, directory=base_dir, **kwargs)

    def _api_allowed(self):
        # Páginas de outros sites não conseguem enviar este cabeçalho personalizado sem
        # passar por preflight CORS (que o servidor não autoriza), o que bloqueia CSRF.
        if self.headers.get('X-AutoPulse') != '1':
            return False
        # Validação do Host contra DNS rebinding
        host = (self.headers.get('Host') or '').split(':')[0].strip().lower()
        if host in ('localhost', '127.0.0.1'):
            return True
        if ALLOW_LAN:
            try:
                ipaddress.ip_address(host)
                return True
            except ValueError:
                return False
        return False

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path.startswith('/api/') and not self._api_allowed():
            self._send_json({"error": "Acesso negado"}, status=403)
            return

        # API: Connect to Wi-Fi OBD2
        if parsed.path == '/api/connect':
            params = parse_qs(parsed.query)
            ip = params.get('ip', [TCP_OBD_IP])[0]
            try:
                port = int(params.get('port', [TCP_OBD_PORT])[0])
                if not (1 <= port <= 65535):
                    raise ValueError
                # Somente endereços de rede local: evita usar o servidor para varrer outras redes
                if not ipaddress.ip_address(ip).is_private:
                    raise ValueError
            except ValueError:
                self._send_json({"success": False, "message": "IP/porta inválidos (use um IP de rede local)"}, status=400)
                return
            success, msg = connect_tcp_obd(ip, port)
            self._send_json({"success": success, "message": msg, "ip": ip, "port": port})
            return

        # API: Send OBD2 Command
        if parsed.path == '/api/send':
            params = parse_qs(parsed.query)
            cmd = params.get('cmd', [''])[0]
            if not cmd:
                self._send_json({"error": "Parâmetro 'cmd' obrigatório"}, status=400)
                return

            resp, err = send_obd_command(cmd)
            self._send_json({
                "command": cmd,
                "response": resp,
                "error": err,
                "connected": is_obd_connected
            })
            return

        # API: Status
        if parsed.path == '/api/status':
            self._send_json({
                "connected": is_obd_connected,
                "target_ip": TCP_OBD_IP,
                "target_port": TCP_OBD_PORT,
                "last_error": last_error
            })
            return

        # Default: Serve static files
        super().do_GET()

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # Suppress spammy log messages for cleaner terminal
        try:
            msg = format % args
        except Exception:
            msg = " ".join(str(a) for a in args)
        # Mostra só chamadas da API e erros (ex.: 'Bad request' de HTTPS em porta HTTP)
        if '/api/' in msg or 'code 4' in msg or 'code 5' in msg:
            print(f"[HTTP] {msg}")


def run_server(host, port):
    server_address = (host, port)
    httpd = ThreadingHTTPServer(server_address, OBDRequestHandler)
    print("=" * 60)
    print("🚗 AutoPulse OBD2 - Servidor Iniciado!")
    print(f"📡 Acesse no seu navegador: http://localhost:{port}")
    if ALLOW_LAN:
        print(f"📱 Modo LAN ativo (qualquer aparelho da rede acessa): http://<IP_DO_CELULAR>:{port}")
        print("⚠️  Use --lan somente em rede confiável.")
    else:
        print("🔒 Escutando apenas em 127.0.0.1 (use --lan para liberar a rede local)")
    print(f"🔌 Ponte Wi-Fi configurada para: {TCP_OBD_IP}:{TCP_OBD_PORT}")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor finalizado pelo usuário.")
        if obd_socket:
            obd_socket.close()
        httpd.server_close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="AutoPulse OBD2 - servidor local e ponte Wi-Fi ELM327")
    parser.add_argument('--port', type=int, default=PORT_HTTP, help="Porta HTTP (padrão 8080)")
    parser.add_argument('--lan', action='store_true', help="Escutar em 0.0.0.0 (acessível na rede local)")
    args = parser.parse_args()
    ALLOW_LAN = args.lan
    run_server('0.0.0.0' if ALLOW_LAN else '127.0.0.1', args.port)
