// WebSocket Transport to communicate with Wi-Fi OBD2 (TCP 192.168.0.10:35000 via local bridge)
export class WebSocketTransport {
  constructor() {
    this.socket = null;
    this.onDataCallback = null;
    this.onDisconnectCallback = null;
  }

  connect(wsUrl = 'ws://127.0.0.1:8765', onData, onDisconnect) {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          this.onDataCallback = onData;
          this.onDisconnectCallback = onDisconnect;
          resolve('Ponte Wi-Fi OBD2 Conectada');
        };

        this.socket.onmessage = (event) => {
          if (this.onDataCallback) {
            this.onDataCallback(event.data);
          }
        };

        this.socket.onerror = (err) => {
          reject(new Error('Falha ao conectar à ponte WebSocket OBD2. Verifique se o server.py está rodando.'));
        };

        this.socket.onclose = () => {
          if (this.onDisconnectCallback) {
            this.onDisconnectCallback();
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  send(command) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket não está conectado.');
    }
    this.socket.send(command + '\r');
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
