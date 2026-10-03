// Main Application Controller for AutoPulse OBD2 (Infocar Style)
import { ELM327Client, ConnectionStatus } from './obd/elm327.js';
import { TripComputer } from './trip.js';
import { lookupDTC } from './obd/dtc-db.js';

class AutoPulseApp {
  constructor() {
    this.client = new ELM327Client();
    this.trip = new TripComputer();
    this.currentView = 'dashboard';
    this.isHUD = false;
    this.isHUDMirrored = false;

    // SVG Gauge circumference: 2 * PI * r (r=70) => ~439.82
    this.GAUGE_CIRCUMFERENCE = 440;

    this.initDOM();
    this.setupEventListeners();
    this.setupOBDCallbacks();
    this.registerPWA();

    // Restaura ajustes salvos. O app NÃO conecta sozinho: o simulador é um modo explícito
    // escolhido em Ajustes, para nunca exibir dados falsos como se fossem do carro.
    this.loadSettings();
  }

  initDOM() {
    // Top bar
    this.statusIndicator = document.getElementById('status-indicator');
    this.statusText = document.getElementById('status-text');
    this.connectionPill = document.getElementById('connection-pill');
    this.milIndicator = document.getElementById('mil-indicator');
    this.btnToggleHud = document.getElementById('btn-toggle-hud');
    this.btnExitHud = document.getElementById('btn-exit-hud');

    // Navigation & Views
    this.navItems = document.querySelectorAll('.nav-item');
    this.views = document.querySelectorAll('.view-section');

    // Gauges
    this.valSpeed = document.getElementById('val-speed');
    this.speedProgress = document.getElementById('speed-progress');
    this.valRpm = document.getElementById('val-rpm');
    this.rpmProgress = document.getElementById('rpm-progress');

    // Sensors
    this.valCoolant = document.getElementById('val-coolant');
    this.barCoolant = document.getElementById('bar-coolant');
    this.valLoad = document.getElementById('val-load');
    this.barLoad = document.getElementById('bar-load');
    this.valThrottle = document.getElementById('val-throttle');
    this.barThrottle = document.getElementById('bar-throttle');
    this.valVoltage = document.getElementById('val-voltage');
    this.barVoltage = document.getElementById('bar-voltage');
    this.valMaf = document.getElementById('val-maf');
    this.barMaf = document.getElementById('bar-maf');
    this.valFuel = document.getElementById('val-fuel');
    this.barFuel = document.getElementById('bar-fuel');

    // DTC Scanner
    this.btnScanDTC = document.getElementById('btn-scan-dtc');
    this.btnClearDTC = document.getElementById('btn-clear-dtc');
    this.btnInjectFault = document.getElementById('btn-inject-fault');
    this.dtcResults = document.getElementById('dtc-results');

    // Trip Computer
    this.tripEcoScore = document.getElementById('trip-eco-score');
    this.tripInstantKml = document.getElementById('trip-instant-kml');
    this.tripAvgKml = document.getElementById('trip-avg-kml');
    this.tripDistance = document.getElementById('trip-distance');
    this.tripDuration = document.getElementById('trip-duration');
    this.tripCost = document.getElementById('trip-cost');
    this.tripFuelUsed = document.getElementById('trip-fuel-used');
    this.tripMaxSpeed = document.getElementById('trip-max-speed');
    this.tripHardAccel = document.getElementById('trip-hard-accel');
    this.btnResetTrip = document.getElementById('btn-reset-trip');

    // Terminal & ECU info
    this.infoVin = document.getElementById('info-vin');
    this.infoProtocol = document.getElementById('info-protocol');
    this.terminalOutput = document.getElementById('terminal-output');
    this.terminalForm = document.getElementById('terminal-form');
    this.terminalInput = document.getElementById('terminal-input');
    this.btnClearTerminal = document.getElementById('btn-clear-terminal');
    this.quickChips = document.querySelectorAll('.quick-chip');

    // Settings
    this.selectConnType = document.getElementById('select-conn-type');
    this.selectVehicleProfile = document.getElementById('select-vehicle-profile');
    this.wifiSettings = document.getElementById('wifi-settings');
    this.btnConnect = document.getElementById('btn-connect');
    this.btnDisconnect = document.getElementById('btn-disconnect');
    this.selectFuelType = document.getElementById('select-fuel-type');
    this.inputFuelPrice = document.getElementById('input-fuel-price');
    this.selectPollingRate = document.getElementById('select-polling-rate');
  }

  setupEventListeners() {
    // Tab switching
    this.navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetView = btn.dataset.view;
        this.switchView(targetView);
      });
    });

    // Connection pill shortcut
    this.connectionPill.addEventListener('click', () => {
      this.switchView('settings');
    });

    // HUD Toggles
    this.btnToggleHud.addEventListener('click', () => this.toggleHUD());
    this.btnExitHud.addEventListener('click', () => this.toggleHUD(false));

    // Connection Select Change
    this.selectConnType.addEventListener('change', (e) => {
      this.wifiSettings.style.display = e.target.value === 'wifi' ? 'block' : 'none';
    });

    if (this.selectVehicleProfile) {
      this.selectVehicleProfile.addEventListener('change', (e) => {
        this.client.setProfile(e.target.value);
      });
    }

    // Connect & Disconnect Buttons
    this.btnConnect.addEventListener('click', () => {
      const type = this.selectConnType.value;
      if (this.selectVehicleProfile) {
        this.client.setProfile(this.selectVehicleProfile.value);
      }
      this.connectOBD(type);
    });

    this.btnDisconnect.addEventListener('click', () => {
      this.client.disconnect();
    });

    // DTC Scanner Actions
    this.btnScanDTC.addEventListener('click', async () => {
      this.btnScanDTC.disabled = true;
      this.btnScanDTC.innerText = 'Escaneando...';
      try {
        await this.client.requestDTCs();
      } finally {
        this.btnScanDTC.disabled = false;
        this.btnScanDTC.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg> Escanear Falhas da ECU`;
      }
    });

    this.btnClearDTC.addEventListener('click', async () => {
      const confirmClear = confirm('Tem certeza que deseja apagar a memória de falhas da central (ECU) e resetar a luz de injeção?');
      if (confirmClear) {
        await this.client.clearDTCs();
        this.renderDTCs([]);
      }
    });

    // Test fault injection for simulator
    this.btnInjectFault.addEventListener('click', () => {
      const sampleCodes = ['P0300', 'P0171', 'P0420', 'P0115', 'P0335'];
      const chosen = sampleCodes[Math.floor(Math.random() * sampleCodes.length)];
      this.client.injectSimulatorFault(chosen);
      alert(`Código de teste simulado (${chosen}) injetado na ECU! Clique em "Escanear Falhas da ECU" para diagnosticar.`);
    });

    // Reset Trip
    this.btnResetTrip.addEventListener('click', () => {
      this.trip.reset();
      this.updateTripUI();
    });

    // Fuel settings
    this.selectFuelType.addEventListener('change', (e) => {
      this.trip.fuelType = e.target.value;
    });

    this.inputFuelPrice.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        this.trip.fuelPricePerLiter = val;
      }
    });

    // Polling rate
    this.selectPollingRate.addEventListener('change', (e) => {
      this.client.pollingRateMs = parseInt(e.target.value, 10);
      if (this.client.isPolling) {
        this.client.startPolling();
      }
    });

    // Terminal
    this.terminalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cmd = this.terminalInput.value.trim();
      if (!cmd) return;
      this.terminalInput.value = '';
      this.appendTerminalLog(`> ${cmd}`, 'info');

      try {
        const resp = await this.client.executeCommand(cmd, 3500);
        this.appendTerminalLog(resp, 'success');
      } catch (err) {
        this.appendTerminalLog(`Erro: ${err.message}`, 'error');
      }
    });

    this.btnClearTerminal.addEventListener('click', () => {
      this.terminalOutput.innerHTML = '';
    });

    this.quickChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.dataset.cmd;
        this.terminalInput.value = cmd;
        this.terminalForm.dispatchEvent(new Event('submit'));
      });
    });
  }

  setupOBDCallbacks() {
    // Status changes
    this.client.onStatusChange = (status) => {
      this.statusText.innerText = status;
      this.statusIndicator.className = 'status-dot';

      if (status === ConnectionStatus.CONNECTED) {
        this.statusIndicator.classList.add('connected');
        this.btnConnect.style.display = 'none';
        this.btnDisconnect.style.display = 'block';
      } else if (status === ConnectionStatus.CONNECTING || status === ConnectionStatus.INITIALIZING) {
        this.statusIndicator.classList.add('connecting');
      } else {
        this.btnConnect.style.display = 'block';
        this.btnDisconnect.style.display = 'none';
      }
    };

    // Telemetry updates
    this.client.onDataUpdate = (data) => {
      this.renderTelemetry(data);
      this.trip.update(data.speed, data.maf, data.rpm);
      this.updateTripUI();
    };

    // DTC received
    this.client.onDTCsReceived = (codes, isPending) => {
      this.renderDTCs(codes);
    };

    // Logger
    this.client.onLog = (msg, type) => {
      this.appendTerminalLog(`[${new Date().toLocaleTimeString()}] ${msg}`, type);
    };
  }

  async connectOBD(type) {
    try {
      let options = {};
      if (type === 'wifi') {
        options.wifiTarget = document.getElementById('input-wifi-ip').value.trim();
        options.wsUrl = `ws://${window.location.hostname}:8765`;
        options.hostUrl = window.location.origin;
      }
      await this.client.connect(type, options);
      this.acquireWakeLock();
    } catch (err) {
      alert(`Falha na conexão: ${err.message}`);
    }
  }

  // Mantém a tela ligada enquanto o app está conectado: com a tela apagada o Chrome
  // estrangula os timers e a leitura dos sensores para.
  async acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      if (!this.wakeLockListenerAdded) {
        this.wakeLockListenerAdded = true;
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && this.client.status === ConnectionStatus.CONNECTED) {
            this.acquireWakeLock();
          }
        });
      }
    } catch (err) {
      console.warn('Wake Lock indisponível:', err);
    }
  }

  // Restaura e persiste os ajustes (perfil, conexão, combustível, taxa de atualização)
  loadSettings() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem('autopulse.settings') || '{}');
    } catch (e) {
      saved = {};
    }

    const fields = [
      ['connType', this.selectConnType],
      ['vehicleProfile', this.selectVehicleProfile],
      ['fuelType', this.selectFuelType],
      ['fuelPrice', this.inputFuelPrice],
      ['pollingRate', this.selectPollingRate]
    ];

    fields.forEach(([key, el]) => {
      if (el && saved[key] !== undefined && saved[key] !== null) el.value = saved[key];
    });

    // Aplica os valores restaurados aos módulos
    this.wifiSettings.style.display = this.selectConnType.value === 'wifi' ? 'block' : 'none';
    if (this.selectVehicleProfile) this.client.setProfile(this.selectVehicleProfile.value);
    this.trip.fuelType = this.selectFuelType.value;
    const price = parseFloat(this.inputFuelPrice.value);
    if (!isNaN(price) && price > 0) this.trip.fuelPricePerLiter = price;
    this.client.pollingRateMs = parseInt(this.selectPollingRate.value, 10) || 200;

    // Salva a cada alteração
    const persist = () => {
      const data = {};
      fields.forEach(([key, el]) => {
        if (el) data[key] = el.value;
      });
      try {
        localStorage.setItem('autopulse.settings', JSON.stringify(data));
      } catch (e) {
        // armazenamento indisponível: segue sem persistir
      }
    };
    fields.forEach(([, el]) => {
      if (!el) return;
      el.addEventListener('change', persist);
      el.addEventListener('input', persist);
    });
  }

  switchView(viewName) {
    this.currentView = viewName;
    this.navItems.forEach(item => {
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    this.views.forEach(section => {
      if (section.id === `view-${viewName}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });
  }

  toggleHUD(forceState) {
    this.isHUD = (forceState !== undefined) ? forceState : !this.isHUD;
    if (this.isHUD) {
      document.body.classList.add('hud-active');
      this.switchView('dashboard');
      // Ask user if they want mirror mode for windshield projection
      const mirror = confirm('Ativar Modo Espelho (para refletir a imagem no para-brisa do carro à noite)?');
      if (mirror) {
        document.body.classList.add('hud-mirror');
      }
    } else {
      document.body.classList.remove('hud-active', 'hud-mirror');
    }
  }

  renderTelemetry(data) {
    // Speedometer (0 - 240 km/h)
    const speed = data.speed || 0;
    this.valSpeed.innerText = speed;
    const speedRatio = Math.min(1, Math.max(0, speed / 240));
    const speedOffset = this.GAUGE_CIRCUMFERENCE - (speedRatio * this.GAUGE_CIRCUMFERENCE);
    this.speedProgress.style.strokeDashoffset = speedOffset;

    // Tachometer / RPM (0 - 8000 RPM)
    const rpm = data.rpm || 0;
    this.valRpm.innerText = rpm;
    const rpmRatio = Math.min(1, Math.max(0, rpm / 8000));
    const rpmOffset = this.GAUGE_CIRCUMFERENCE - (rpmRatio * this.GAUGE_CIRCUMFERENCE);
    this.rpmProgress.style.strokeDashoffset = rpmOffset;

    if (rpm > 6200) {
      this.rpmProgress.classList.add('danger');
    } else if (rpm > 5000) {
      this.rpmProgress.classList.add('warning');
      this.rpmProgress.classList.remove('danger');
    } else {
      this.rpmProgress.classList.remove('warning', 'danger');
    }

    // Coolant Temp (-40 to 140 °C)
    const coolant = data.coolantTemp;
    this.valCoolant.innerText = coolant !== undefined ? coolant : '--';
    const coolantPct = Math.min(100, Math.max(0, ((coolant - 40) / 80) * 100));
    this.barCoolant.style.width = `${coolantPct}%`;
    if (coolant > 105) {
      this.barCoolant.style.background = 'var(--accent-red)';
    } else if (coolant > 95) {
      this.barCoolant.style.background = 'var(--accent-yellow)';
    } else {
      this.barCoolant.style.background = 'var(--accent-cyan)';
    }

    // Engine Load (0 - 100%)
    this.valLoad.innerText = data.engineLoad;
    this.barLoad.style.width = `${data.engineLoad}%`;

    // Throttle TPS (0 - 100%)
    this.valThrottle.innerText = data.throttlePos;
    this.barThrottle.style.width = `${data.throttlePos}%`;

    // Voltage (9 - 16 V)
    const volt = data.voltage || 0;
    this.valVoltage.innerText = volt ? volt.toFixed(1) : '--';
    const voltPct = Math.min(100, Math.max(0, ((volt - 10) / 5) * 100));
    this.barVoltage.style.width = `${voltPct}%`;
    if (volt > 0 && volt < 12.0) {
      this.barVoltage.style.background = 'var(--accent-red)';
    } else {
      this.barVoltage.style.background = 'var(--accent-green)';
    }

    // MAF (0 - 80 g/s)
    this.valMaf.innerText = data.maf ? data.maf.toFixed(1) : '--';
    const mafPct = Math.min(100, Math.max(0, (data.maf / 50) * 100));
    this.barMaf.style.width = `${mafPct}%`;

    // Fuel Tank
    this.valFuel.innerText = data.fuelLevel !== undefined ? Math.round(data.fuelLevel) : '--';
    this.barFuel.style.width = `${data.fuelLevel || 0}%`;

    // Check Engine Indicator (MIL)
    if (data.milStatus || data.dtcCount > 0) {
      this.milIndicator.classList.add('active');
    } else {
      this.milIndicator.classList.remove('active');
    }

    // ECU Info
    if (data.vin && data.vin !== '---') this.infoVin.innerText = data.vin;
    if (data.protocol && data.protocol !== '---') this.infoProtocol.innerText = data.protocol;
  }

  updateTripUI() {
    const summary = this.trip.getSummary();
    this.tripEcoScore.innerText = summary.ecoScore;
    this.tripInstantKml.innerText = summary.instantKmPerLiter;
    this.tripAvgKml.innerText = summary.avgKmPerLiter;
    this.tripDistance.innerText = summary.distanceKm;
    this.tripDuration.innerText = summary.durationFormatted;
    this.tripCost.innerText = summary.estimatedCostBrl;
    this.tripFuelUsed.innerText = summary.fuelConsumedLiters;
    this.tripMaxSpeed.innerText = summary.maxSpeed;
    this.tripHardAccel.innerText = summary.hardAccelerations;
  }

  renderDTCs(codes) {
    if (!codes || codes.length === 0) {
      this.dtcResults.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon" style="color: var(--accent-green);">✓</div>
          <h3 style="color: var(--accent-green);">Nenhum Código de Falha Encontrado!</h3>
          <p>O sistema de injeção eletrônica e sensores do veículo estão operando normalmente sem erros armazenados na ECU.</p>
        </div>`;
      return;
    }

    let html = '';
    codes.forEach(code => {
      const info = lookupDTC(code);
      html += `
        <div class="dtc-card">
          <div class="dtc-header">
            <span class="dtc-code">${info.code}</span>
            <span class="dtc-severity">${info.severity}</span>
          </div>
          <div class="dtc-title">${info.title}</div>
          <div class="dtc-detail-row">
            <strong>Sistema:</strong> <span>${info.system}</span>
          </div>
          <div class="dtc-detail-row">
            <strong>Causas Prováveis:</strong> <span>${info.cause}</span>
          </div>
        </div>`;
    });

    this.dtcResults.innerHTML = html;
  }

  appendTerminalLog(text, type = 'info') {
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.innerText = text;
    this.terminalOutput.appendChild(line);
    this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
  }

  registerPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((err) => {
          console.warn('Falha no Service Worker:', err);
        });
      });
    }
  }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
  window.autoPulseApp = new AutoPulseApp();
});
