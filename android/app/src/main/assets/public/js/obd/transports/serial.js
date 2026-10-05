// Web Serial API Transport for USB-OTG and FTDI/CH340/PL2303 OBD2 cables
export class SerialTransport {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.keepReading = false;
  }

  isSupported() {
    return (typeof navigator !== 'undefined' && 'serial' in navigator);
  }

  async connect(baudRate = 38400, onData, onDisconnect) {
    if (!this.isSupported()) {
      throw new Error('Web Serial não é suportado neste navegador. Use o Chrome no desktop ou Android com suporte habilitado.');
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: parseInt(baudRate, 10) });

      this.writer = this.port.writable.getWriter();
      this.keepReading = true;

      // Start read loop
      this.readLoop(onData, onDisconnect);
      return 'Dispositivo USB OBD2 Conectado';
    } catch (err) {
      this.disconnect();
      throw err;
    }
  }

  async readLoop(onData, onDisconnect) {
    const textDecoder = new TextDecoderStream();
    this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (this.keepReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value && onData) {
          onData(value);
        }
      }
    } catch (err) {
      console.warn('Erro na leitura serial:', err);
    } finally {
      if (onDisconnect) onDisconnect();
    }
  }

  async send(command) {
    if (!this.writer) throw new Error('Não conectado via Serial');
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(command + '\r'));
  }

  async disconnect() {
    this.keepReading = false;
    if (this.reader) {
      try { await this.reader.cancel(); } catch (e) {}
      this.reader = null;
    }
    if (this.writer) {
      try { await this.writer.close(); } catch (e) {}
      this.writer = null;
    }
    if (this.port) {
      try { await this.port.close(); } catch (e) {}
      this.port = null;
    }
  }
}
