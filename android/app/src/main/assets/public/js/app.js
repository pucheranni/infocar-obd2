// Main Application Controller for AutoPulse OBD2 (Infocar Style)
import { ELM327Client, ConnectionStatus } from './obd/elm327.js';
import { TripComputer } from './trip.js';
import { lookupDTC } from './obd/dtc-db.js';
import { listPairedDevices, isBtClassicAvailable } from './obd/transports/bt-classic.js';
import { ShiftCoach } from './obd/shift-coach.js';

class AutoPulseApp {
  constructor() {
    this.client = new ELM327Client();
    this.trip = new TripComputer();
    this.shiftCoach = new ShiftCoach();
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

    // Need for Speed Shift Light & Coach Elements
    this.nfsCard = document.getElementById('nfs-shift-assistant');
    this.nfsRpmBar = document.getElementById('nfs-rpm-bar');
    this.nfsModeBadge = document.getElementById('nfs-mode-badge');
    this.nfsRpmFiltered = document.getElementById('nfs-rpm-filtered');
    this.nfsHintIcon = document.getElementById('nfs-hint-icon');
    this.nfsHintText = document.getElementById('nfs-hint-text');
    this.rpmEmaFiltered = 0;
    this.currentNfsZone = 'idle';

    // Sensors
    this.valInstantFuel = document.getElementById('val-instant-fuel');
    this.unitInstantFuel = document.getElementById('unit-instant-fuel');
    this.barInstantFuel = document.getElementById('bar-instant-fuel');
    this.valAvgFuel = document.getElementById('val-avg-fuel');
    this.barAvgFuel = document.getElementById('bar-avg-fuel');
    this.valTripDist = document.getElementById('val-trip-dist');
    this.barTripDist = document.getElementById('bar-trip-dist');
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
    this.tripInstantLh = document.getElementById('trip-instant-lh');
    this.tripAirSource = document.getElementById('trip-air-source');
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
    this.btSettings = document.getElementById('bt-settings');
    this.selectBtDevice = document.getElementById('select-bt-device');
    this.btnBtRefresh = document.getElementById('btn-bt-refresh');
    this.inputEthanolMix = document.getElementById('input-ethanol-mix');
    this.groupEthanolMix = document.getElementById('group-ethanol-mix');
    this.inputDisplacement = document.getElementById('input-displacement');
    this.inputFuelCal = document.getElementById('input-fuel-cal');
    this.selectNavOffset = document.getElementById('select-nav-offset');
  }

  updateConnTypeUI() {
    const t = this.selectConnType.value;
    this.wifiSettings.style.display = t === 'wifi' ? 'block' : 'none';
    this.btSettings.style.display = t === 'btclassic' ? 'block' : 'none';
    this.groupEthanolMix.style.display = this.selectFuelType.value === 'mix' ? 'block' : 'none';
  }

  applyFuelSettings() {
    this.trip.fuelType = this.selectFuelType.value;
    const mix = parseFloat(this.inputEthanolMix.value);
    if (!isNaN(mix)) this.trip.ethanolMix = Math.min(100, Math.max(0, mix)) / 100;
    const disp = parseFloat(this.inputDisplacement.value);
    if (!isNaN(disp) && disp > 0.5) this.trip.displacementL = disp;
    const cal = parseFloat(this.inputFuelCal.value);
    if (!isNaN(cal) && cal > 0.3) this.trip.calibration = cal;
    const price = parseFloat(this.inputFuelPrice.value);
    if (!isNaN(price) && price > 0) this.trip.fuelPricePerLiter = price;
    this.updateConnTypeUI();
  }

  async refreshBtDevices(silent = false) {
    try {
      const devices = await listPairedDevices();
      const saved = this.selectBtDevice.dataset.saved || this.selectBtDevice.value;
      this.selectBtDevice.innerHTML = devices.length
        ? devices.map(d => `<option value="${d.address}">${d.name || 'Sem nome'} (${d.address})</option>`).join('')
        : '<option value="">Nenhum dispositivo pareado</option>';
      const guess = devices.find(d => d.address === saved) ||
        devices.find(d => /obd|elm|v-?link|vgate/i.test(d.name || ''));
      if (guess) this.selectBtDevice.value = guess.address;
    } catch (err) {
      if (!silent) alert(err.message);
    }
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
    this.selectConnType.addEventListener('change', () => {
      this.updateConnTypeUI();
      if (this.selectConnType.value === 'btclassic') this.refreshBtDevices(true);
    });
    this.btnBtRefresh.addEventListener('click', () => this.refreshBtDevices());

    if (this.milIndicator) {
      this.milIndicator.addEventListener('click', () => this.switchView('scanner'));
    }

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
    const scanLabel = this.btnScanDTC.innerHTML;
    this.btnScanDTC.addEventListener('click', async () => {
      if (!this.client.isConnected()) {
        alert('Adaptador OBD2 não conectado. Vá em Ajustes e toque em Conectar.');
        return;
      }
      this.btnScanDTC.disabled = true;
      this.btnScanDTC.innerText = 'Escaneando...';
      try {
        await this.client.requestDTCs();
      } catch (err) {
        alert(`Erro na leitura de falhas: ${err.message}`);
      } finally {
        this.btnScanDTC.disabled = false;
        this.btnScanDTC.innerHTML = scanLabel;
      }
    });

    const clearLabel = this.btnClearDTC.innerHTML;
    this.btnClearDTC.addEventListener('click', async () => {
      if (!this.client.isConnected()) {
        alert('Adaptador OBD2 não conectado. Vá em Ajustes e toque em Conectar.');
        return;
      }
      if (!confirm('Apagar a memória de falhas da ECU e a luz de injeção? (Faça com motor desligado e ignição ligada)')) return;
      this.btnClearDTC.disabled = true;
      this.btnClearDTC.innerText = 'Limpando...';
      try {
        await this.client.clearDTCs();
        this.renderDTCs([]);
        alert('Falhas apagadas com sucesso.');
      } catch (err) {
        alert(`Erro ao limpar falhas: ${err.message}`);
      } finally {
        this.btnClearDTC.disabled = false;
        this.btnClearDTC.innerHTML = clearLabel;
      }
    });

    // Test fault injection for simulator
    this.btnInjectFault.addEventListener('click', () => {
      const sampleCodes = ['P0300', 'P0171', 'P0420', 'P0115', 'P0335'];
      const chosen = sampleCodes[Math.floor(Math.random() * sampleCodes.length)];
      if (this.client.injectSimulatorFault(chosen)) {
        alert(`Código de teste (${chosen}) injetado no simulador. Toque em "Escanear Falhas da ECU".`);
      } else {
        alert('Disponível apenas no Modo Simulador (Ajustes > Método de Conexão).');
      }
    });

    // Reset Trip
    const resetLabel = this.btnResetTrip.innerHTML;
    this.btnResetTrip.addEventListener('click', () => {
      this.trip.reset();
      this.updateTripUI();
      this.btnResetTrip.innerText = '✓ Viagem zerada!';
      setTimeout(() => { this.btnResetTrip.innerHTML = resetLabel; }, 1500);
    });

    // Fuel settings
    [this.selectFuelType, this.inputFuelPrice, this.inputEthanolMix, this.inputDisplacement, this.inputFuelCal]
      .forEach(el => {
        el.addEventListener('input', () => this.applyFuelSettings());
        el.addEventListener('change', () => this.applyFuelSettings());
      });

    // Polling rate (o loop sequencial lê o valor a cada PID)
    this.selectPollingRate.addEventListener('change', (e) => {
      this.client.pollingRateMs = parseInt(e.target.value, 10);
    });

    // Terminal
    this.terminalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cmd = this.terminalInput.value.trim();
      if (!cmd) return;
      this.terminalInput.value = '';
      this.appendTerminalLog(`> ${cmd}`, 'info');

      try {
        const resp = await this.client.sendManual(cmd, 3500);
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
      this.trip.update(data.speed, data.maf, data.rpm, {
        map: data.map,
        intakeTemp: data.intakeTemp || undefined,
        stft: data.stft,
        ltft: data.ltft,
        throttlePos: data.throttlePos
      });
      this.updateTripUI();
    };

    // DTC received
    this.client.onDTCsReceived = (codes) => {
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
      if (type === 'btclassic') {
        if (!isBtClassicAvailable()) {
          alert('Bluetooth Clássico só funciona no app Android (APK). No navegador use o Modo Simulador.');
          return;
        }
        options.btAddress = this.selectBtDevice.value || '';
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
      ['pollingRate', this.selectPollingRate],
      ['btDevice', this.selectBtDevice],
      ['ethanolMix', this.inputEthanolMix],
      ['displacement', this.inputDisplacement],
      ['fuelCal', this.inputFuelCal],
      ['navOffset', this.selectNavOffset]
    ];

    fields.forEach(([key, el]) => {
      if (el && saved[key] !== undefined && saved[key] !== null) el.value = saved[key];
    });
    if (saved.btDevice) this.selectBtDevice.dataset.saved = saved.btDevice;
    if (this.selectConnType.value === 'btclassic' && isBtClassicAvailable()) this.refreshBtDevices(true);

    // Aplica os valores restaurados aos módulos
    if (this.selectVehicleProfile) this.client.setProfile(this.selectVehicleProfile.value);
    this.applyFuelSettings();
    this.client.pollingRateMs = parseInt(this.selectPollingRate.value, 10) || 200;

    // Configura elevação da barra para evitar sobreposição no Galaxy S23 / Android
    this.applyNavClearance(saved.navOffset);
    if (this.selectNavOffset) {
      this.selectNavOffset.addEventListener('change', () => {
        this.applyNavClearance(this.selectNavOffset.value);
      });
    }

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

  // Ajusta dinamicamente a posição do dock de navegação para nunca sobrepor
  // os botões de navegação físicos ou virtuais (Voltar / Início) do Android / Samsung S23
  applyNavClearance(explicitOffset) {
    if (explicitOffset !== undefined && explicitOffset !== null && explicitOffset !== '') {
      document.documentElement.style.setProperty('--nav-bottom-offset', `${explicitOffset}px`);
      if (this.selectNavOffset) this.selectNavOffset.value = String(explicitOffset);
      return;
    }

    // Auto-detecção inicial para Android / Samsung S23:
    // Se estiver em Android e a safe area inferior for baixa ou zero (típico de PWA/Capacitor),
    // eleva em 56px para limpar a barra clássica de 3 botões do sistema.
    const isAndroid = /Android/i.test(navigator.userAgent);
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom, 0px);pointer-events:none;visibility:hidden;';
    document.body.appendChild(testDiv);
    const safeBottom = testDiv.offsetHeight || 0;
    document.body.removeChild(testDiv);

    const autoOffset = (isAndroid && safeBottom < 24) ? 56 : 14;
    document.documentElement.style.setProperty('--nav-bottom-offset', `${autoOffset}px`);
    if (this.selectNavOffset) this.selectNavOffset.value = String(autoOffset);
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

    // Need for Speed Shift Coach & Sweet Spot Assistant
    this.updateNfsShiftAssistant(rpm, data.map || 0);

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

    // Throttle TPS (se presente no layout)
    if (this.valThrottle) {
      this.valThrottle.innerText = data.throttlePos;
      if (this.barThrottle) this.barThrottle.style.width = `${data.throttlePos}%`;
    }

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

    // MAP (0 - 105 kPa) — Clio 2011; cai para MAF se a ECU tiver
    const mapVal = data.map || 0;
    this.valMaf.innerText = mapVal ? mapVal : (data.maf ? data.maf.toFixed(1) : '--');
    const mafPct = Math.min(100, Math.max(0, (mapVal / 105) * 100));
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

  // Assistente de Condução e Shift Light estilo Need for Speed para motor Renault D4D 1.0 16V
  // Mapeamento aprovado pelo GPT-Sol com filtro EMA (alpha = 0.15) e histerese de +-75 RPM
  updateNfsShiftAssistant(rpm, map = 0) {
    if (!this.nfsCard || !this.nfsRpmBar) return;
    const res = this.shiftCoach.update(rpm, map);

    if (this.nfsRpmFiltered) this.nfsRpmFiltered.innerText = res.filteredRpm;
    this.nfsRpmBar.style.width = `${res.barPercent}%`;
    this.nfsCard.className = `nfs-shift-card zone-${res.zone}`;
    if (this.nfsModeBadge) this.nfsModeBadge.innerText = res.badgeText;
    if (this.nfsHintIcon) this.nfsHintIcon.innerText = res.hintIcon;
    if (this.nfsHintText) this.nfsHintText.innerText = res.hintText;
  }

  updateTripUI() {
    const summary = this.trip.getSummary();
    const speed = this.client.vehicleData.speed || 0;
    const isRunning = (this.client.vehicleData.rpm || 0) >= 300;

    // Atualiza cards de consumo no Dashboard Cockpit principal
    if (this.valInstantFuel && this.unitInstantFuel) {
      if (!isRunning) {
        this.valInstantFuel.innerText = '--';
        this.unitInstantFuel.innerText = 'km/L';
        if (this.barInstantFuel) this.barInstantFuel.style.width = '0%';
      } else if (speed <= 3) {
        // Parado ou marcha lenta: exibe vazão horária em L/h
        const lh = parseFloat(summary.instantLitersPerHour) || 0;
        this.valInstantFuel.innerText = lh > 0 ? lh.toFixed(1) : '0.0';
        this.unitInstantFuel.innerText = 'L/h';
        if (this.barInstantFuel) {
          const pct = Math.min(100, Math.max(0, (lh / 4) * 100));
          this.barInstantFuel.style.width = `${pct}%`;
          this.barInstantFuel.style.background = 'var(--accent-cyan)';
        }
      } else {
        // Em movimento: exibe eficiência instantânea em km/L
        const kml = parseFloat(summary.instantKmPerLiter) || 0;
        this.valInstantFuel.innerText = kml > 0 ? kml.toFixed(1) : '--';
        this.unitInstantFuel.innerText = 'km/L';
        if (this.barInstantFuel) {
          const pct = Math.min(100, Math.max(0, (kml / 25) * 100));
          this.barInstantFuel.style.width = `${pct}%`;
          this.barInstantFuel.style.background = kml >= 12 ? 'var(--accent-green)' : (kml >= 8 ? 'var(--accent-cyan)' : 'var(--accent-yellow)');
        }
      }
    }

    if (this.valAvgFuel) {
      const avg = summary.avgKmPerLiter;
      this.valAvgFuel.innerText = avg > 0 ? avg.toFixed(1) : '--';
      if (this.barAvgFuel) {
        const pct = Math.min(100, Math.max(0, (avg / 25) * 100));
        this.barAvgFuel.style.width = `${pct}%`;
        this.barAvgFuel.style.background = avg >= 12 ? 'var(--accent-green)' : (avg >= 8 ? 'var(--accent-cyan)' : 'var(--accent-yellow)');
      }
    }

    if (this.valTripDist) {
      this.valTripDist.innerText = summary.distanceKm;
      if (this.barTripDist) {
        const distNum = parseFloat(summary.distanceKm) || 0;
        const pct = Math.min(100, (distNum % 50) * 2);
        this.barTripDist.style.width = `${pct}%`;
      }
    }

    // Tela de Viagem (TAB 3)
    if (this.tripEcoScore) this.tripEcoScore.innerText = summary.ecoScore;
    if (this.tripInstantKml) this.tripInstantKml.innerText = summary.instantKmPerLiter;
    if (this.tripInstantLh) this.tripInstantLh.innerText = summary.instantLitersPerHour;
    if (this.tripAirSource) this.tripAirSource.innerText = `(${summary.airSource})`;
    if (this.tripAvgKml) this.tripAvgKml.innerText = summary.avgKmPerLiter > 0 ? summary.avgKmPerLiter.toFixed(1) : '--';
    if (this.tripDistance) this.tripDistance.innerText = summary.distanceKm;
    if (this.tripDuration) this.tripDuration.innerText = summary.durationFormatted;
    if (this.tripCost) this.tripCost.innerText = summary.estimatedCostBrl;
    if (this.tripFuelUsed) this.tripFuelUsed.innerText = summary.fuelConsumedLiters;
    if (this.tripMaxSpeed) this.tripMaxSpeed.innerText = summary.maxSpeed;
    if (this.tripHardAccel) this.tripHardAccel.innerText = summary.hardAccelerations;
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
    codes.forEach(item => {
      const code = typeof item === 'string' ? item : item.code;
      const pendingOnly = typeof item === 'object' && item.isPending && !item.isConfirmed;
      const info = lookupDTC(code);
      html += `
        <div class="dtc-card">
          <div class="dtc-header">
            <span class="dtc-code">${info.code}</span>
            <span class="dtc-severity">${pendingOnly ? 'Pendente' : info.severity}</span>
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
    // No APK o Service Worker só atrapalha (cache velho após atualizar)
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return;
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
