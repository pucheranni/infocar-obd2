// Bluetooth Clássico (SPP/RFCOMM) para ELM327 — só funciona dentro do APK Android (Capacitor).
// Usa o plugin nativo "BtSerial" (android/app/src/main/java/.../BtSerialPlugin.java).

function getPlugin() {
  const cap = typeof window !== 'undefined' ? window.Capacitor : null;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
  return cap.Plugins.BtSerial || (cap.registerPlugin ? cap.registerPlugin('BtSerial') : null);
}

export function isBtClassicAvailable() {
  return !!getPlugin();
}

export async function listPairedDevices() {
  const plugin = getPlugin();
  if (!plugin) throw new Error('Bluetooth Clássico só funciona no app Android (APK).');
  const { devices } = await plugin.list();
  return devices || [];
}

export class BtClassicTransport {
  constructor() {
    this.plugin = getPlugin();
    this.listeners = [];
  }

  async connect(address, onData, onDisconnect) {
    if (!this.plugin) throw new Error('Bluetooth Clássico só funciona no app Android (APK).');

    if (!address) {
      const devices = await listPairedDevices();
      const guess = devices.find(d => /obd|elm|v-?link|vgate|konnwei|icar/i.test(d.name || ''));
      if (!guess) throw new Error('Nenhum adaptador OBD pareado encontrado. Pareie o ELM327 (PIN 1234 ou 0000) nas configurações do Android.');
      address = guess.address;
    }

    this.listeners.push(await this.plugin.addListener('data', (ev) => onData && onData(ev.value)));
    this.listeners.push(await this.plugin.addListener('disconnected', () => onDisconnect && onDisconnect()));

    const res = await this.plugin.connect({ address });
    return res.name || address;
  }

  async send(command) {
    await this.plugin.write({ value: command + '\r' });
  }

  disconnect() {
    this.listeners.forEach(l => { try { l.remove(); } catch (e) {} });
    this.listeners = [];
    if (this.plugin) this.plugin.disconnect().catch(() => {});
  }
}
