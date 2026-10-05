// HTTP REST Transport for Wi-Fi OBD2 bridge (server.py)
// Todas as chamadas levam o cabeçalho X-AutoPulse, exigido pelo servidor (proteção contra CSRF).
const API_HEADERS = { 'X-AutoPulse': '1' };

export class HTTPBridgeTransport {
  constructor() {
    this.baseUrl = window.location.origin;
    this.onDataCallback = null;
    this.onDisconnectCallback = null;
    this.connected = false;
  }

  // wifiTarget: "ip:porta" digitado na tela de Ajustes (padrão 192.168.0.10:35000)
  async connect(hostUrl = '', onData, onDisconnect, wifiTarget = '') {
    if (hostUrl) {
      this.baseUrl = hostUrl;
    }
    this.onDataCallback = onData;
    this.onDisconnectCallback = onDisconnect;

    let ip = '192.168.0.10';
    let port = '35000';
    if (wifiTarget) {
      const [targetIp, targetPort] = wifiTarget.split(':');
      if (targetIp) ip = targetIp.trim();
      if (targetPort) port = targetPort.trim();
    }

    try {
      // Test connect endpoint
      const resp = await fetch(
        `${this.baseUrl}/api/connect?ip=${encodeURIComponent(ip)}&port=${encodeURIComponent(port)}`,
        { headers: API_HEADERS }
      );
      const data = await resp.json();
      if (!data.success) {
        throw new Error(data.message || 'Falha ao conectar ao adaptador OBD2 Wi-Fi');
      }
      this.connected = true;
      return 'Adaptador Wi-Fi OBD2 Conectado via Servidor Local';
    } catch (e) {
      // If server.py is not reachable or direct
      throw new Error(`Falha na ponte Wi-Fi: ${e.message}`);
    }
  }

  async send(command) {
    if (!this.connected) throw new Error('Não conectado à ponte Wi-Fi');
    const resp = await fetch(`${this.baseUrl}/api/send?cmd=${encodeURIComponent(command)}`, {
      headers: API_HEADERS
    });
    const data = await resp.json();
    if (data.response && this.onDataCallback) {
      this.onDataCallback(data.response);
    }
    return data.response;
  }

  disconnect() {
    this.connected = false;
  }
}
