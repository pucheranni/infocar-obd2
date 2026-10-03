// Web Bluetooth API Transport for ELM327 BLE Adapters
export class BLETransport {
  constructor() {
    this.device = null;
    this.server = null;
    this.rxCharacteristic = null;
    this.txCharacteristic = null;
    this.receiveBuffer = '';
    this.onDataCallback = null;
    this.onDisconnectCallback = null;
  }

  isSupported() {
    return (typeof navigator !== 'undefined' && 'bluetooth' in navigator);
  }

  async connect(onData, onDisconnect) {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth não é suportado neste navegador. Use o Chrome ou Edge.');
    }

    this.onDataCallback = onData;
    this.onDisconnectCallback = onDisconnect;

    // Common ELM327 BLE Service and Characteristic UUIDs
    const targetServices = [
      '0000fff0-0000-1000-8000-00805f9b34fb', // VGate, Veepeak, generic BLE OBD2
      '0000ffe0-0000-1000-8000-00805f9b34fb', // CC2541 / HM-10 generic
      '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2'  // Kiwi / OBDLink BLE
    ];

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'OBD' },
          { namePrefix: 'V-LINK' },
          { namePrefix: 'IOS-VLINK' },
          { namePrefix: 'VEEPEAK' },
          { namePrefix: 'Viecar' },
          { namePrefix: 'ELM' }
        ],
        optionalServices: targetServices
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        if (this.onDisconnectCallback) this.onDisconnectCallback();
      });

      this.server = await this.device.gatt.connect();

      // Find suitable UART service
      let service = null;
      for (const serviceUuid of targetServices) {
        try {
          service = await this.server.getPrimaryService(serviceUuid);
          if (service) break;
        } catch (e) {
          // Continue searching
        }
      }

      if (!service) {
        throw new Error('Serviço de comunicação OBD2 BLE não encontrado no dispositivo.');
      }

      // Find RX and TX characteristics
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.notify || char.properties.indicate) {
          this.rxCharacteristic = char;
        }
        if (char.properties.write || char.properties.writeWithoutResponse) {
          this.txCharacteristic = char;
        }
      }

      if (!this.rxCharacteristic || !this.txCharacteristic) {
        // Fallback: in some adapters, single characteristic handles both
        if (characteristics.length > 0) {
          this.rxCharacteristic = characteristics[0];
          this.txCharacteristic = characteristics[0];
        } else {
          throw new Error('Características de envio/recebimento BLE não encontradas.');
        }
      }

      await this.rxCharacteristic.startNotifications();
      this.rxCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value;
        const decoder = new TextDecoder();
        const text = decoder.decode(value);
        this.receiveBuffer += text;

        if (this.onDataCallback) {
          this.onDataCallback(text);
        }
      });

      return this.device.name || 'Dispositivo OBD2 BLE';
    } catch (err) {
      this.disconnect();
      throw err;
    }
  }

  async send(command) {
    if (!this.txCharacteristic) {
      throw new Error('Não conectado ao OBD2 BLE');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(command + '\r');
    
    // Chunk in 20-byte packets if needed for BLE MTU
    const chunkSize = 20;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (this.txCharacteristic.writeValueWithoutResponse) {
        await this.txCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.txCharacteristic.writeValue(chunk);
      }
    }
  }

  disconnect() {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.rxCharacteristic = null;
    this.txCharacteristic = null;
  }
}
