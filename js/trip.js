// Trip Computer, Fuel Economy & Driving Style Analyzer (Infocar style)
export class TripComputer {
  constructor() {
    this.fuelPricePerLiter = 5.89; // Default BRL R$/L
    this.fuelType = 'gasoline';   // 'gasoline' (gasolina C/E27, AFR ~13.3) or 'ethanol' (AFR 9.0)
    
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

  update(speed, maf, rpm) {
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

    // Calculate fuel consumption:
    // Air Fuel Ratio (AFR): ~13.3:1 para gasolina brasileira (E27), ~9.0:1 para etanol
    // Densidade: ~745 g/L gasolina C, ~789 g/L etanol
    const afr = this.fuelType === 'ethanol' ? 9.0 : 13.3;
    const density = this.fuelType === 'ethanol' ? 789 : 745;

    let effectiveMaf = maf;
    // Fallback if MAF is 0: estimate from RPM (aproximação grosseira; o Clio usa sensor MAP — ver plano, Fase 3)
    if (!effectiveMaf || effectiveMaf <= 0) {
      effectiveMaf = Math.max(1.5, (rpm * 1.6 * 0.5) / 60); // approx estimation for 1.6L engine
    }

    // Fuel grams/sec = MAF / AFR
    // Liters/sec = (MAF / AFR) / density
    // Liters/hour = Liters/sec * 3600
    this.instantLitersPerHour = (effectiveMaf / afr / density) * 3600;

    if (speed > 3) {
      // km/L = (km/h) / (L/h)
      this.instantKmPerLiter = Math.min(45, Math.max(0.5, speed / this.instantLitersPerHour));
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
      ecoScore: Math.round(this.ecoScore)
    };
  }
}
