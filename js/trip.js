// Trip Computer, Fuel Economy & Driving Style Analyzer (Infocar style)
export class TripComputer {
  constructor() {
    this.fuelPricePerLiter = 5.89; // Default BRL R$/L
    this.fuelType = 'gasoline';   // 'gasoline' (E27), 'ethanol' (E100 hidratado) ou 'mix'
    this.ethanolMix = 0.5;        // fração de etanol hidratado no tanque quando fuelType = 'mix'
    this.displacementL = 1.0;     // Clio 2011 1.0 16V Hi-Flex (D4D). Use 1.6 para o K4M.
    this.volumetricEff = 0.85;    // Eficiência volumétrica média de um 16V aspirado
    this.calibration = 1.0;       // Ajuste do usuário (litros bomba ÷ litros app)
    this.airSource = '---';       // 'MAF' | 'MAP' | 'RPM' (estimativa)
    
    // Trip metrics
    this.startTime = null;
    this.durationSeconds = 0;
    this.distanceKm = 0;
    this.maxSpeed = 0;
    this.speedSum = 0;
    this.speedSamples = 0;
    this.fuelConsumedLiters = 0;
    
    // Driving style events
    this.hardAccelerations = 0;
    this.hardBrakings = 0;
    this.lastSpeed = 0;
    this.lastUpdateTime = 0;        // instante da última chamada de update() (integração por tempo real)
    this.lastSpeedChangeTime = 0;   // instante em que a velocidade mudou pela última vez
    this.lastSpeedChangeValue = 0;  // velocidade registrada nessa última mudança
    this.ecoScore = 100;

    // Real-time calculations
    this.instantLitersPerHour = 0;
    this.instantKmPerLiter = 0;

    this.timer = null;
  }

  start() {
    this.startTime = Date.now();
    this.timer = setInterval(() => {
      if (this.startTime) {
        this.durationSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      }
    }, 1000);
  }

  reset() {
    this.startTime = Date.now();
    this.durationSeconds = 0;
    this.distanceKm = 0;
    this.maxSpeed = 0;
    this.speedSum = 0;
    this.speedSamples = 0;
    this.fuelConsumedLiters = 0;
    this.hardAccelerations = 0;
    this.hardBrakings = 0;
    this.lastSpeed = 0;
    this.lastUpdateTime = 0;
    this.lastSpeedChangeTime = 0;
    this.lastSpeedChangeValue = 0;
    this.ecoScore = 100;
  }

  // Propriedades da mistura no tanque: AFR estequiométrico (base massa) e densidade (g/L).
  // Gasolina C (E27): AFR 13.2, 745 g/L. Etanol hidratado (E100): AFR 8.4, 809 g/L.
  getFuelProps() {
    let e = 0;
    if (this.fuelType === 'ethanol') e = 1;
    else if (this.fuelType === 'mix') e = Math.min(1, Math.max(0, this.ethanolMix));
    const mG = (1 - e) * 745;
    const mE = e * 809;
    return { afr: (mG * 13.2 + mE * 8.4) / (mG + mE), density: mG + mE };
  }

  // Massa de ar admitida (g/s). O Clio 2011 não tem MAF: usa speed-density com MAP + IAT.
  estimateAirMass(maf, rpm, extra) {
    if (maf && maf > 0) { this.airSource = 'MAF'; return maf; }
    const map = extra.map;
    if (map && map > 0 && rpm > 0) {
      this.airSource = 'MAP';
      const iatK = (extra.intakeTemp ?? 30) + 273.15;
      // m = P·V/(R·T) por ciclo [kPa·L = J; R_ar = 0,287 J/(g·K)] × ciclos/s (4 tempos = rpm/120)
      return (map * this.displacementL * this.volumetricEff) / (0.287 * iatK) * (rpm / 120);
    }
    this.airSource = 'RPM';
    return Math.max(1.0, (rpm * this.displacementL * 0.5) / 60);
  }

  update(speed, maf, rpm, extra = {}) {
    const now = Date.now();
    if (!this.startTime) this.start();

    // Delta de tempo REAL desde a última amostra. update() é chamado a cada PID recebido
    // (várias vezes por ciclo), então distância e combustível precisam ser integrados
    // pelo tempo decorrido e não por um passo fixo.
    const rawDt = this.lastUpdateTime > 0 ? (now - this.lastUpdateTime) / 1000 : 0;
    this.lastUpdateTime = now;
    // Ignora lacunas longas (ex.: link caído) para não "inventar" distância/combustível
    const dtSeconds = (rawDt > 0 && rawDt < 5) ? rawDt : 0;

    // Max speed
    if (speed > this.maxSpeed) this.maxSpeed = speed;

    // Average speed
    this.speedSum += speed;
    this.speedSamples++;

    // Distância percorrida: velocidade média do trecho * tempo
    if (dtSeconds > 0) {
      const avgChunkSpeed = (speed + this.lastSpeed) / 2;
      this.distanceKm += avgChunkSpeed * (dtSeconds / 3600);
    }

    // Análise de aceleração (km/h por segundo).
    // A velocidade só é atualizada a cada ciclo completo de PIDs (~1s em K-Line), então a taxa
    // é calculada entre MUDANÇAS reais de velocidade, e não entre chamadas de update().
    if (speed !== this.lastSpeedChangeValue) {
      if (this.lastSpeedChangeTime > 0) {
        const dtChange = (now - this.lastSpeedChangeTime) / 1000;
        if (dtChange >= 0.3 && dtChange < 3.0) {
          const accelRate = (speed - this.lastSpeedChangeValue) / dtChange; // (km/h)/s

          // Hard acceleration > 12 km/h per second
          if (accelRate > 12) {
            this.hardAccelerations++;
            this.ecoScore = Math.max(30, this.ecoScore - 2);
          }
          // Hard braking < -15 km/h per second
          if (accelRate < -15) {
            this.hardBrakings++;
            this.ecoScore = Math.max(30, this.ecoScore - 2);
          }
        }
      }
      this.lastSpeedChangeTime = now;
      this.lastSpeedChangeValue = speed;
    }

    this.lastSpeed = speed;

    const { afr, density } = this.getFuelProps();
    const air = this.estimateAirMass(maf, rpm, extra);

    // Correção de malha fechada da ECU (STFT + LTFT, PIDs 06/07)
    const trim = 1 + ((extra.stft || 0) + (extra.ltft || 0)) / 100;

    // Cut-off em desaceleração: borboleta fechada, rotação alta e carro andando → injeção cortada
    const tps = extra.throttlePos;
    const decelCut = tps !== undefined && tps <= 2 && rpm > 1400 && speed > 10;

    this.instantLitersPerHour = decelCut
      ? 0
      : (air / afr * trim / density) * 3600 * this.calibration;

    if (speed > 3) {
      // km/L = (km/h) / (L/h); em cut-off mostra o teto
      this.instantKmPerLiter = this.instantLitersPerHour > 0
        ? Math.min(45, Math.max(0.5, speed / this.instantLitersPerHour))
        : 45;
    } else {
      this.instantKmPerLiter = 0; // idling in place (show L/h)
    }

    // Acumula combustível pelo tempo real decorrido
    this.fuelConsumedLiters += (this.instantLitersPerHour / 3600) * dtSeconds;

    return this.getSummary();
  }

  getAverageSpeed() {
    return this.speedSamples > 0 ? Math.round(this.speedSum / this.speedSamples) : 0;
  }

  getAverageFuelEconomy() {
    if (this.fuelConsumedLiters > 0.01 && this.distanceKm > 0.05) {
      return Math.round((this.distanceKm / this.fuelConsumedLiters) * 10) / 10;
    }
    return 0;
  }

  getEstimatedCost() {
    return (this.fuelConsumedLiters * this.fuelPricePerLiter).toFixed(2);
  }

  formatDuration() {
    const mins = Math.floor(this.durationSeconds / 60);
    const secs = this.durationSeconds % 60;
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getSummary() {
    return {
      durationFormatted: this.formatDuration(),
      distanceKm: this.distanceKm.toFixed(1),
      avgSpeed: this.getAverageSpeed(),
      maxSpeed: Math.round(this.maxSpeed),
      instantKmPerLiter: this.instantKmPerLiter.toFixed(1),
      instantLitersPerHour: this.instantLitersPerHour.toFixed(1),
      avgKmPerLiter: this.getAverageFuelEconomy(),
      fuelConsumedLiters: this.fuelConsumedLiters.toFixed(2),
      estimatedCostBrl: this.getEstimatedCost(),
      hardAccelerations: this.hardAccelerations,
      hardBrakings: this.hardBrakings,
      ecoScore: Math.round(this.ecoScore),
      airSource: this.airSource,
      fuelType: this.fuelType
    };
  }
}
