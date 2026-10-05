// ELM327 Protocol Driver and OBD-II State Machine
import { OBD_PIDS } from './pids.js';
import { VirtualECU } from './simulator.js';
import { BLETransport } from './transports/ble.js';
import { SerialTransport } from './transports/serial.js';
import { WebSocketTransport } from './transports/websocket.js';
import { HTTPBridgeTransport } from './transports/http-bridge.js';
import { BtClassicTransport } from './transports/bt-classic.js';

export const ConnectionStatus = {
  DISCONNECTED: 'Desconectado',
  CONNECTING: 'Conectando ao adaptador...',
  INITIALIZING: 'Inicializando protocolo ELM327...',
  CONNECTED: 'Conectado à ECU',
  ERROR: 'Erro de Conexão'
};

export const VEHICLE_PROFILES = {
  clio2011_can: {
    id: 'clio2011_can',
    name: 'Renault Clio 2011 (CAN 11-bit / 500k - ATSP6)',
    desc: 'Clio II Campus / Clio III (ECU SIM32 / Valeo V42 / EMS3132). Padrão OBDBr-2.',
    protocol: 'ATSP6',
    initCommands: [
      'ATZ',
      'ATE0',
      'ATL0',
      'ATS1',
      'ATH0',      // Sem headers nos dados para máxima velocidade
      'ATSP6',     // Forçar ISO 15765-4 CAN 11bit 500k (broadcast 7DF padrão)
      'ATCAF1',    // CAN Auto Formatting
      'ATAT1',     // Adaptive Timing Auto 1
      'ATST64'     // Timeout seguro (~400ms) para acomodar latência Bluetooth sem perder pacotes
    ],
    // RPM/MAP/velocidade/TPS a cada volta (base do consumo); demais intercalados
    pidsToPoll: [
      '010C', '010B', '010D', '0111', '010F',
      '010C', '010B', '010D', '0111', '0106',
      '010C', '010B', '010D', '0111', '0107',
      '010C', '010B', '010D', '0111', '0105',
      '010C', '010B', '010D', '0111', '0104', 'ATRV'
    ],
    keepAliveIntervalMs: 0
  },
  clio2005_fast: {
    id: 'clio2005_fast',
    name: 'Renault Clio 2005 (K-Line KWP2000 Fast Init - ATSP5)',
    desc: 'Clio II D4D 1.0 16V / K4M 1.6 (ECU IAW 5NR / Sirius 32/34). Inicialização rápida K-Line.',
    protocol: 'ATSP5',
    initCommands: [
      'ATZ',
      'ATE0',
      'ATL0',
      'ATS1',
      'ATH0',        // Sem headers/checksum nas respostas (parser mais simples e seguro)
      'ATSP5',       // Forçar ISO 14230-4 KWP (Fast Init) — header padrão EOBD (81 33 F1)
      'ATST64'       // Timeout K-Line seguro (~256ms)
    ],
    pidsToPoll: ['010C', '010D', '0105', '0104', '0111', 'ATRV'],
    keepAliveIntervalMs: 0 // O próprio ELM327 envia wakeup periódico (padrão ~3s)
  },
  clio2005_slow: {
    id: 'clio2005_slow',
    name: 'Renault Clio 2005 (K-Line ISO 9141 / 5-Baud Slow Init - ATSP4/3)',
    desc: 'Clio II com inicialização lenta por pulso de 5 bauds (ECU Siemens Sirius 32 / Sagem).',
    protocol: 'ATSP4',
    initCommands: [
      'ATZ',
      'ATE0',
      'ATL0',
      'ATS1',
      'ATH0',
      'ATSP4',       // ISO 14230-4 KWP com init lento (5 baud) — endereço padrão EOBD (0x33)
      'ATST96'
    ],
    pidsToPoll: ['010C', '010D', '0105', '0104', '0111', 'ATRV'],
    keepAliveIntervalMs: 0
  },
  generic: {
    id: 'generic',
    name: 'OBD-II Padrão Automático (ATSP0)',
    desc: 'Busca automática de protocolo para outros veículos compatíveis com OBD2.',
    protocol: 'ATSP0',
    initCommands: [
      'ATZ',
      'ATE0',
      'ATL0',
      'ATS1',
      'ATH0',
      'ATSP0'
    ],
    pidsToPoll: ['010C', '010D', '0105', '0104', '0111', 'ATRV'],
    keepAliveIntervalMs: 0
  }
};

export class ELM327Client {
  constructor() {
    this.status = ConnectionStatus.DISCONNECTED;
    this.activeTransport = null;
    this.transportType = 'simulator'; // 'simulator', 'ble', 'wifi', 'serial'
    this.vehicleProfile = 'clio2011_can';
    this.virtualECU = null;
    this.keepAliveInterval = null;
    
    // Command queue & execution
    this.commandQueue = [];
    this.isProcessingQueue = false;
    this.currentCommand = null;
    this.buffer = '';
    
    // Polling settings
    this.pollingInterval = null;
    this.pollingRateMs = 200; // 5 Hz
    this.isPolling = false;
    this.pidsToPoll = [...VEHICLE_PROFILES.clio2011_can.pidsToPoll];
    this.unsupportedPids = new Set();
    this.ecuSupportedPids = new Set();
    this.noDataCount = {};
    this.pollIndex = 0;
    
    // Vehicle & ECU state
    this.vehicleData = {
      rpm: 0,
      speed: 0,
      coolantTemp: 0,
      engineLoad: 0,
      throttlePos: 0,
      fuelLevel: 0,
      voltage: 0,
      intakeTemp: 0,
      maf: 0,
      map: 0,
      stft: 0,
      ltft: 0,
      ethanolPercentage: null,
      vin: '---',
      protocol: '---',
      milStatus: false,
      dtcCount: 0
    };

    // Event callbacks
    this.onStatusChange = null;
    this.onDataUpdate = null;
    this.onDTCsReceived = null;
    this.onLog = null;
  }

  log(msg, type = 'info') {
    if (this.onLog) this.onLog(msg, type);
  }

  setStatus(status) {
    this.status = status;
    if (this.onStatusChange) this.onStatusChange(status);
  }

  async connect(type = 'simulator', options = {}) {
    // Garante que nenhuma sessão anterior (ex.: simulador) continue rodando em paralelo
    if (this.activeTransport) {
      this.disconnect();
    }
    this.transportType = type;
    this.setStatus(ConnectionStatus.CONNECTING);
    this.buffer = '';
    this.commandQueue = [];
    this.unsupportedPids = new Set();
    this.ecuSupportedPids = new Set();
    this.noDataCount = {};
    this.pollIndex = 0;

    try {
      if (type === 'simulator') {
        this.virtualECU = new VirtualECU();
        this.activeTransport = {
          send: async (cmd) => {
            const resp = this.virtualECU.processCommand(cmd);
            // Simulate realistic 25ms OBD2 CAN bus latency
            setTimeout(() => {
              this.handleRawData(resp);
            }, 25);
          },
          disconnect: () => {
            if (this.virtualECU) {
              this.virtualECU.stopSimulation();
              this.virtualECU = null;
            }
          }
        };
        this.log('Conectado ao Simulador Virtual de ECU & ELM327', 'success');
      } else if (type === 'btclassic') {
        this.activeTransport = new BtClassicTransport();
        const devName = await this.activeTransport.connect(
          options.btAddress,
          (data) => this.handleRawData(data),
          () => this.handleUnexpectedDisconnect()
        );
        this.log(`Conectado via Bluetooth Clássico: ${devName}`, 'success');
      } else if (type === 'ble') {
        this.activeTransport = new BLETransport();
        const devName = await this.activeTransport.connect(
          (data) => this.handleRawData(data),
          () => this.handleUnexpectedDisconnect()
        );
        this.log(`Conectado ao dispositivo BLE: ${devName}`, 'success');
      } else if (type === 'wifi') {
        try {
          this.activeTransport = new WebSocketTransport();
          const wsUrl = options.wsUrl || 'ws://127.0.0.1:8765';
          await this.activeTransport.connect(
            wsUrl,
            (data) => this.handleRawData(data),
            () => this.handleUnexpectedDisconnect()
          );
          this.log(`Conectado à ponte WebSocket Wi-Fi OBD2 (${wsUrl})`, 'success');
        } catch (wsErr) {
          this.log(`Tentando ponte HTTP local para Wi-Fi OBD2...`, 'info');
          this.activeTransport = new HTTPBridgeTransport();
          await this.activeTransport.connect(
            options.hostUrl || '',
            (data) => this.handleRawData(data),
            () => this.handleUnexpectedDisconnect(),
            options.wifiTarget
          );
          this.log('Conectado ao adaptador Wi-Fi OBD2 via ponte HTTP!', 'success');
        }
      } else if (type === 'serial') {
        this.activeTransport = new SerialTransport();
        await this.activeTransport.connect(
          options.baudRate || 38400,
          (data) => this.handleRawData(data),
          () => this.handleUnexpectedDisconnect()
        );
        this.log('Conectado ao cabo USB OBD2 Serial', 'success');
      }

      this.setStatus(ConnectionStatus.INITIALIZING);
      await this.runInitSequence();
      this.setStatus(ConnectionStatus.CONNECTED);
      this.startPolling();
      return true;
    } catch (err) {
      this.log(`Erro ao conectar: ${err.message}`, 'error');
      this.disconnect();
      this.setStatus(ConnectionStatus.ERROR);
      throw err;
    }
  }

  setProfile(profileId) {
    if (VEHICLE_PROFILES[profileId]) {
      this.vehicleProfile = profileId;
      const profile = VEHICLE_PROFILES[profileId];
      if (profile.pidsToPoll) {
        this.pidsToPoll = [...profile.pidsToPoll];
      }
      this.log(`Perfil de comunicação definido: ${profile.name}`, 'info');
    }
  }

  async runInitSequence() {
    const profile = VEHICLE_PROFILES[this.vehicleProfile] || VEHICLE_PROFILES.clio2011_can;
    this.log(`Iniciando handshake para perfil: ${profile.name}...`, 'info');
    
    // Executa comandos específicos de inicialização do perfil (headers, protocolos, timeouts)
    for (const cmd of profile.initCommands) {
      const isSlow = cmd === 'ATZ' || cmd === 'ATSP5' || cmd === 'ATSP4' || cmd === 'ATSP0';
      const timeout = isSlow ? 2000 : 700;
      await this.executeCommand(cmd, timeout);
    }

    // Testa comunicação inicial com a ECU solicitando PIDs Suportados (0100)
    const pidsResp = await this.executeCommand('0100', 8000);
    this.log(`Resposta ECU PIDs: ${pidsResp}`, 'info');
    this.parseSupportedPIDs(pidsResp);

    // Consulta protocolo ativo no ELM327
    const protoResp = await this.executeCommand('ATDP', 1000);
    this.vehicleData.protocol = protoResp.replace(/(\r|\n|>)/g, '').trim();

    // Consulta VIN / Chassi
    this.requestVIN();

    // Ativa Watchdog de Keep-Alive para protocolos K-Line que expiram sessão (P3 Max)
    if (profile.keepAliveIntervalMs > 0) {
      this.startKeepAlive(profile.keepAliveIntervalMs);
    }
  }

  startKeepAlive(intervalMs) {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(async () => {
      if (this.status === ConnectionStatus.CONNECTED && !this.isProcessingQueue && this.commandQueue.length === 0) {
        try {
          // TesterPresent 3E 00 para manter sessão KWP2000 ativa
          await this.executeCommand('3E00', 800);
        } catch (e) {}
      }
    }, intervalMs);
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  handleUnexpectedDisconnect() {
    if (!this.activeTransport) return;
    this.log('Dispositivo OBD2 desconectado inesperadamente.', 'warn');
    this.disconnect();
  }

  disconnect() {
    this.stopPolling();
    this.stopKeepAlive();
    // Cancela comando em andamento e esvazia a fila (senão a fila trava para sempre)
    const pending = [];
    if (this.currentCommand) pending.push(this.currentCommand);
    pending.push(...this.commandQueue);
    this.currentCommand = null;
    this.commandQueue = [];
    this.isProcessingQueue = false;
    this.buffer = '';
    pending.forEach(item => {
      if (item.timer) clearTimeout(item.timer);
      try { item.reject(new Error('Conexão encerrada')); } catch (e) {}
    });

    const transport = this.activeTransport;
    this.activeTransport = null;
    if (transport) {
      try { transport.disconnect(); } catch (e) {}
    }
    this.setStatus(ConnectionStatus.DISCONNECTED);
    this.log('Conexão OBD2 finalizada.', 'info');
  }

  isConnected() {
    return !!this.activeTransport && this.status === ConnectionStatus.CONNECTED;
  }

  // Enqueue a command with promise resolution
  executeCommand(command, timeoutMs = 2500) {
    if (!this.activeTransport) {
      return Promise.reject(new Error('Adaptador OBD2 desconectado. Conecte em Ajustes.'));
    }
    return new Promise((resolve, reject) => {
      this.commandQueue.push({
        command: command.trim().toUpperCase(),
        timeoutMs,
        resolve,
        reject,
        timer: null
      });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.commandQueue.length === 0) return;
    if (!this.activeTransport) return;
    this.isProcessingQueue = true;

    const item = this.commandQueue.shift();
    this.currentCommand = item;
    this.buffer = '';

    // Set command timeout guard
    item.timer = setTimeout(() => {
      if (this.currentCommand === item) {
        this.log(`Timeout aguardando resposta do comando: ${item.command}`, 'warn');
        this.currentCommand = null;
        this.isProcessingQueue = false;
        item.resolve('TIMEOUT');
        this.processQueue();
      }
    }, item.timeoutMs);

    try {
      await this.activeTransport.send(item.command);
    } catch (err) {
      clearTimeout(item.timer);
      if (this.currentCommand === item) {
        this.currentCommand = null;
        this.isProcessingQueue = false;
      }
      item.reject(err);
      this.processQueue();
    }
  }

  handleRawData(data) {
    this.buffer += data;

    // ELM327 signals completion of response with '>' prompt character
    if (this.buffer.includes('>')) {
      const fullResponse = this.buffer;
      this.buffer = '';

      if (this.currentCommand) {
        clearTimeout(this.currentCommand.timer);
        const cmd = this.currentCommand.command;
        const resolve = this.currentCommand.resolve;
        this.currentCommand = null;
        this.isProcessingQueue = false;

        // Parse and process response
        this.parseResponse(cmd, fullResponse);
        resolve(fullResponse);

        // Continue next queued command
        setTimeout(() => this.processQueue(), 10);
      }
    }
  }

  parseResponse(cmd, response) {
    // Clean response
    const cleaned = response.replace(/>/g, '').trim();

    // Check for battery voltage ATRV
    if (cmd === 'ATRV') {
      const match = cleaned.match(/([0-9]+\.?[0-9]*)\s*V?/i);
      if (match) {
        this.vehicleData.voltage = parseFloat(match[1]);
        this.notifyUpdate();
      }
      return;
    }

    // Check for Mode 01 response (starts with 41)
    if (cmd.startsWith('01') && /NO DATA/i.test(cleaned) && this.isPolling) {
      // Se a ECU já confirmou suporte em 0100, NUNCA remove da leitura (foi apenas perda temporária de pacote no Bluetooth)
      if (this.ecuSupportedPids && this.ecuSupportedPids.has(cmd)) {
        return;
      }
      // PIDs essenciais de telemetria e injeção protegidos contra drop
      const protectedPids = ['010C', '010D', '010B', '0105', '0111', '0104', '0106', '0107', '010F'];
      if (protectedPids.includes(cmd)) {
        return;
      }

      this.noDataCount = this.noDataCount || {};
      this.noDataCount[cmd] = (this.noDataCount[cmd] || 0) + 1;
      if (this.noDataCount[cmd] >= 5) {
        this.unsupportedPids.add(cmd);
        this.log(`PID ${cmd} não suportado pela ECU — removido da leitura.`, 'warn');
      }
      return;
    }

    if (cmd.startsWith('01') && cleaned.includes('41')) {
      // Resposta bem-sucedida: reseta contador de falhas do PID
      if (this.noDataCount && this.noDataCount[cmd]) {
        this.noDataCount[cmd] = 0;
      }
      if (cmd === '0100' || cmd === '01 00') {
        this.parseSupportedPIDs(cleaned);
      }
      const lines = cleaned.split(/[\r\n]+/);
      for (const line of lines) {
        const tokens = line.trim().split(/\s+/);
        const idx41 = tokens.indexOf('41');
        if (idx41 !== -1 && tokens.length > idx41 + 1) {
          const pid = tokens[idx41 + 1].toUpperCase();
          const byteTokens = tokens.slice(idx41 + 2);
          const bytes = byteTokens.map(t => parseInt(t, 16)).filter(n => !isNaN(n));
          this.decodePID(pid, bytes);
        }
      }
      return;
    }

    // Mode 03 / 07 são tratados em requestDTCs() (evita que o 07 apague o resultado do 03)

    // Check for Mode 04 (Clear DTCs)
    if (cmd === '04') {
      if (cleaned.includes('44') || cleaned.includes('OK')) {
        this.log('Códigos de falha (DTC) apagados com sucesso na ECU!', 'success');
        this.vehicleData.dtcCount = 0;
        this.vehicleData.milStatus = false;
        if (this.virtualECU) this.virtualECU.clearDTCs();
        if (this.onDTCsReceived) this.onDTCsReceived([]);
        this.notifyUpdate();
      }
      return;
    }

    // Check for Mode 09 PID 02 (VIN)
    if (cmd === '0902' || cmd === '09 02') {
      this.parseVINResponse(cleaned);
      return;
    }
  }

  decodePID(pid, bytes) {
    if (bytes.length === 0) return;

    switch (pid) {
      case '0C': // RPM
        if (bytes.length >= 2) {
          this.vehicleData.rpm = Math.round(((bytes[0] * 256) + bytes[1]) / 4);
        }
        break;
      case '0D': // Speed
        this.vehicleData.speed = bytes[0];
        break;
      case '05': // Coolant Temp
        this.vehicleData.coolantTemp = bytes[0] - 40;
        break;
      case '04': // Engine Load
        this.vehicleData.engineLoad = Math.round((bytes[0] * 100) / 255);
        break;
      case '11': // Throttle Position
        this.vehicleData.throttlePos = Math.round((bytes[0] * 100) / 255);
        break;
      case '0F': // Intake Air Temp
        this.vehicleData.intakeTemp = bytes[0] - 40;
        break;
      case '10': // MAF Air Flow
        if (bytes.length >= 2) {
          this.vehicleData.maf = Math.round(((bytes[0] * 256) + bytes[1]) / 100 * 10) / 10;
        }
        break;
      case '2F': // Fuel Tank Level
        this.vehicleData.fuelLevel = Math.round((bytes[0] * 100) / 255);
        break;
      case '42': // Control Module Voltage
        if (bytes.length >= 2) {
          this.vehicleData.voltage = Math.round(((bytes[0] * 256) + bytes[1]) / 1000 * 100) / 100;
        }
        break;
      case '01': // MIL Status & DTC Count
        this.vehicleData.milStatus = (bytes[0] & 0x80) !== 0;
        this.vehicleData.dtcCount = bytes[0] & 0x7F;
        break;
      case '0B': // MAP (kPa) — base do cálculo de consumo no Clio (sem MAF)
        this.vehicleData.map = bytes[0];
        break;
      case '06': // STFT banco 1 (%)
        this.vehicleData.stft = Math.round(((bytes[0] - 128) * 100 / 128) * 10) / 10;
        break;
      case '07': // LTFT banco 1 (%)
        this.vehicleData.ltft = Math.round(((bytes[0] - 128) * 100 / 128) * 10) / 10;
        break;
      case '52': // Ethanol Percentage (PID 0152 - Veículos Hi-Flex Brasil)
        this.vehicleData.ethanolPercentage = Math.round((bytes[0] * 100) / 255);
        this.log(`Teor de Etanol ECU (Hi-Flex): ${this.vehicleData.ethanolPercentage}%`, 'info');
        break;
    }

    this.notifyUpdate();
  }

  // Decodifica a máscara de bits do PID 0100 para registrar os PIDs suportados pela ECU
  parseSupportedPIDs(response) {
    if (!response) return;
    const clean = response.replace(/[\r\n>]/g, ' ').replace(/SEARCHING\.\.\.?/gi, ' ').trim();
    const tokens = clean.split(/\s+/).filter(Boolean);
    const idx = tokens.indexOf('41');
    if (idx !== -1 && tokens[idx + 1] === '00' && tokens.length >= idx + 6) {
      const bytes = tokens.slice(idx + 2, idx + 6).map(t => parseInt(t, 16)).filter(n => !isNaN(n));
      if (bytes.length === 4) {
        for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
          const byteVal = bytes[byteIdx];
          for (let bit = 0; bit < 8; bit++) {
            if ((byteVal & (0x80 >> bit)) !== 0) {
              const pidNum = (byteIdx * 8) + bit + 1;
              const pidHex = '01' + pidNum.toString(16).toUpperCase().padStart(2, '0');
              this.ecuSupportedPids.add(pidHex);
            }
          }
        }
        this.log(`PIDs suportados pela ECU detectados: ${this.ecuSupportedPids.size} PIDs`, 'info');
        return;
      }
    }
    // Formato sem separação de espaço (ex.: 4100BE3EB811)
    const match = clean.match(/4100([0-9A-F]{8})/i);
    if (match) {
      const hex = match[1];
      for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
        const byteVal = parseInt(hex.substr(byteIdx * 2, 2), 16);
        for (let bit = 0; bit < 8; bit++) {
          if ((byteVal & (0x80 >> bit)) !== 0) {
            const pidNum = (byteIdx * 8) + bit + 1;
            const pidHex = '01' + pidNum.toString(16).toUpperCase().padStart(2, '0');
            this.ecuSupportedPids.add(pidHex);
          }
        }
      }
      this.log(`PIDs suportados pela ECU detectados: ${this.ecuSupportedPids.size} PIDs`, 'info');
    }
  }

  // Extrai a lista de DTCs de uma resposta de modo 03 (confirmados) ou 07 (pendentes)
  parseDTCResponse(response, isPending = false) {
    const codes = [];
    const prefixHex = isPending ? '47' : '43';
    
    // Extract hex pairs from multiline or single line OBD response.
    // Remove marcadores de quadro multi-frame do ELM327 ("0:", "1:", ...) para não virarem bytes.
    const tokens = response
      .replace(/[\r\n]+/g, ' ')
      .split(/\s+/)
      .filter(t => t && !/^[0-9A-F]:$/i.test(t));

    // Em CAN (ISO 15765-4) a resposta dos modos 03/07 traz um byte de contagem de DTCs
    // logo após o SID (ex.: "43 02 01 33 ..."); em K-Line (ISO 9141/14230) não traz.
    const dtcProfile = VEHICLE_PROFILES[this.vehicleProfile];
    const isCAN = this.vehicleData.protocol && this.vehicleData.protocol !== '---'
      ? /CAN/i.test(this.vehicleData.protocol)
      : (dtcProfile && dtcProfile.protocol === 'ATSP6');
    
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === prefixHex) {
        // Pula o byte de contagem de DTCs presente em respostas CAN
        let startIndex = i + 1;
        if (isCAN) startIndex += 1;

        // Process in 2-byte pairs
        for (let j = startIndex; j < tokens.length - 1; j += 2) {
          const b1Hex = tokens[j];
          const b2Hex = tokens[j + 1];
          if (!b1Hex || !b2Hex || b1Hex === '>' || b2Hex === '>') break;

          const b1 = parseInt(b1Hex, 16);
          const b2 = parseInt(b2Hex, 16);

          if (isNaN(b1) || isNaN(b2)) continue;
          if (b1 === 0 && b2 === 0) continue; // 00 00 is padding / no code

          // DTC decoding formula:
          // Bits 7-6: 00=P, 01=C, 10=B, 11=U
          // Bits 5-4: 0-3
          // Bits 3-0: 0-9, A-F
          const typeBits = (b1 >> 6) & 0x03;
          const typePrefix = ['P', 'C', 'B', 'U'][typeBits];
          const secondChar = (b1 >> 4) & 0x03;
          const thirdChar = (b1 & 0x0F).toString(16).toUpperCase();
          const lastTwo = b2Hex.toUpperCase().padStart(2, '0');

          const dtcString = `${typePrefix}${secondChar}${thirdChar}${lastTwo}`;
          if (!codes.includes(dtcString)) {
            codes.push(dtcString);
          }
        }
      }
    }

    return codes;
  }

  parseVINResponse(response) {
    // Process line by line or scan frames
    const lines = response.split(/[\r\n]+/);
    const vinChars = [];
    
    for (const line of lines) {
      const tokens = line.trim().split(/\s+/).filter(t => t && !/^[0-9A-F]:$/i.test(t));
      const idx = tokens.indexOf('49');
      if (idx !== -1 && tokens[idx + 1] === '02') {
        const frameNum = tokens[idx + 2];
        const dataBytes = tokens.slice(idx + 3);
        // Standard ISO 15765-4 Mode 09 PID 02:
        // Frame 01: 3 VIN bytes (plus optionally count)
        // Subsequent frames: up to 7 VIN bytes
        for (const hex of dataBytes) {
          if (hex === '>' || hex === 'OK') break;
          const code = parseInt(hex, 16);
          if (code >= 32 && code <= 126) {
            vinChars.push(String.fromCharCode(code));
          }
        }
      }
    }

    const vin = vinChars.join('').trim();
    if (vin.length >= 11) {
      this.vehicleData.vin = vin;
      this.notifyUpdate();
      this.log(`Número de Chassi (VIN) detectado: ${vin}`, 'success');
    }
  }

  // Polling sequencial: só envia o próximo PID quando o anterior respondeu.
  // Nunca enfileira mais de um comando de polling, então comandos manuais não ficam presos.
  startPolling() {
    this.stopPolling();
    this.isPolling = true;
    const session = (this.pollSession = (this.pollSession || 0) + 1);

    const loop = async () => {
      while (this.isPolling && this.pollSession === session && this.activeTransport) {
        const started = Date.now();
        if (this.commandQueue.length === 0) {
          let pid = null;
          for (let i = 0; i < this.pidsToPoll.length; i++) {
            const cand = this.pidsToPoll[this.pollIndex];
            this.pollIndex = (this.pollIndex + 1) % this.pidsToPoll.length;
            if (!this.unsupportedPids.has(cand)) { pid = cand; break; }
          }
          if (!pid) break;
          try {
            await this.executeCommand(pid, 1000);
          } catch (e) {
            break; // desconectado
          }
        }
        // Ritmo mínimo entre PIDs (configurável em Ajustes) dividido pelo nº de PIDs rápidos
        const minGap = Math.max(20, this.pollingRateMs / 4);
        const wait = minGap - (Date.now() - started);
        await new Promise(r => setTimeout(r, Math.max(10, wait)));
      }
    };
    loop();
  }

  stopPolling() {
    this.isPolling = false;
    this.pollSession = (this.pollSession || 0) + 1;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Executa uma ação com o polling pausado e o retoma depois
  async withPollingPaused(fn) {
    const was = this.isPolling;
    if (was) this.stopPolling();
    // espera o PID em voo terminar
    const t0 = Date.now();
    while (this.isProcessingQueue && Date.now() - t0 < 1500) {
      await new Promise(r => setTimeout(r, 20));
    }
    try {
      return await fn();
    } finally {
      if (was && this.activeTransport) this.startPolling();
    }
  }

  notifyUpdate() {
    if (this.onDataUpdate) {
      this.onDataUpdate({ ...this.vehicleData });
    }
  }

  // Diagnostic action triggers
  async requestDTCs() {
    if (!this.isConnected()) throw new Error('Adaptador OBD2 desconectado. Conecte em Ajustes.');
    return this.withPollingPaused(async () => {
      this.log('Varrendo códigos de falha (DTC)...', 'info');
      const map = new Map();
      const r03 = await this.executeCommand('03', 5000);
      this.parseDTCResponse(r03, false).forEach(c => map.set(c, { code: c, isConfirmed: true, isPending: false }));
      const r07 = await this.executeCommand('07', 5000);
      this.parseDTCResponse(r07, true).forEach(c => {
        if (map.has(c)) map.get(c).isPending = true;
        else map.set(c, { code: c, isConfirmed: false, isPending: true });
      });
      const list = [...map.values()];
      const confirmed = list.filter(d => d.isConfirmed).length;
      this.vehicleData.dtcCount = confirmed;
      this.vehicleData.milStatus = confirmed > 0;
      this.notifyUpdate();
      if (this.onDTCsReceived) this.onDTCsReceived(list);
      return list;
    });
  }

  async clearDTCs() {
    if (!this.isConnected()) throw new Error('Adaptador OBD2 desconectado. Conecte em Ajustes.');
    return this.withPollingPaused(async () => {
      this.log('Enviando comando para apagar códigos de falha e apagar luz de injeção...', 'warn');
      const resp = await this.executeCommand('04', 5000);
      if (!/44|OK/.test(resp)) throw new Error(`ECU não confirmou (resposta: ${resp.replace(/[\r\n>]/g, ' ').trim()})`);
      return true;
    });
  }

  async sendManual(cmd, timeoutMs = 3500) {
    if (!this.isConnected()) throw new Error('Adaptador OBD2 desconectado. Conecte em Ajustes.');
    return this.withPollingPaused(() => this.executeCommand(cmd, timeoutMs));
  }

  async requestVIN() {
    try { await this.executeCommand('0902', 3000); } catch (e) {}
  }

  // Test injection in simulator mode
  injectSimulatorFault(code) {
    if (this.virtualECU) {
      this.virtualECU.injectDTC(code);
      this.log(`Falha simulada injetada na ECU: ${code}`, 'warn');
      return true;
    }
    return false;
  }
}
