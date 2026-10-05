// AutoPulse Vehicle Management Agent - Finite State Machine (FSM)
// Baseado na arquitetura formal aprovada pelo GPT-Sol (Fase 4)

export const VehicleState = {
  IDLE_STANDBY: 'IDLE_STANDBY',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  TRIP_ACTIVE: 'TRIP_ACTIVE',
  PARKED_CONSOLIDATING: 'PARKED_CONSOLIDATING',
  SLEEP: 'SLEEP'
};

export class TripStateMachine {
  constructor(options = {}) {
    this.state = VehicleState.IDLE_STANDBY;
    this.options = {
      stallDebounceSeconds: options.stallDebounceSeconds || 60, // Tempo para iniciar consolidacao
      poiFinalizeSeconds: options.poiFinalizeSeconds || 180,    // 3 min dentro do POI encerra viagem
      btDisconnectFinalizeSeconds: options.btDisconnectFinalizeSeconds || 45, // 45s se BT desconectar dentro do POI
      ...options
    };

    this.parkedStartTime = null;
    this.isBtConnected = false;
    this.isInPoi = false;
    this.lastSpeed = 0;
    this.lastRpm = 0;
    this.steadyCruiseTicks = 0;

    // Callbacks
    this.onStateChange = options.onStateChange || null;
    this.onTripFinalized = options.onTripFinalized || null;
  }

  setState(newState, reason = '') {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(newState, oldState, reason);
    }
  }

  // Notificação de conectividade do adaptador OBD2 / Bluetooth
  setBluetoothStatus(connected) {
    this.isBtConnected = connected;
    if (!connected && this.state === VehicleState.TRIP_ACTIVE) {
      // Perda repentina de BT durante viagem ativa -> consolida imediatamente se estiver em POI
      if (this.isInPoi) {
        this.setState(VehicleState.PARKED_CONSOLIDATING, 'Perda de BT dentro de POI');
        this.parkedStartTime = Date.now() - (this.options.poiFinalizeSeconds - this.options.btDisconnectFinalizeSeconds) * 1000;
      }
    }
  }

  // Notificação de presença em POI (vindo do POIManager)
  setPoiStatus(insidePoi) {
    this.isInPoi = !!insidePoi;
  }

  // Avaliação a cada ciclo de telemetria
  update(rpm = 0, speed = 0, now = Date.now()) {
    const isEngineRunning = rpm >= 500;
    const isVehicleMoving = speed > 3;

    // Lógica por estado atual:
    switch (this.state) {
      case VehicleState.IDLE_STANDBY:
        if (this.isBtConnected) {
          this.setState(VehicleState.CONNECTED, 'Bluetooth conectado');
        }
        break;

      case VehicleState.CONNECTED:
        if (isEngineRunning || isVehicleMoving) {
          this.setState(VehicleState.TRIP_ACTIVE, 'Motor ligado / veículo em movimento');
          this.parkedStartTime = null;
        }
        break;

      case VehicleState.TRIP_ACTIVE:
        if (!isEngineRunning && !isVehicleMoving) {
          // Motor desligado e carro parado
          if (!this.parkedStartTime) {
            this.parkedStartTime = now;
          }
          const elapsedStopped = (now - this.parkedStartTime) / 1000;
          if (elapsedStopped >= this.options.stallDebounceSeconds) {
            this.setState(VehicleState.PARKED_CONSOLIDATING, 'Parada prolongada (>60s)');
          }
        } else {
          // Motor funcionando ou em movimento: reseta temporizador de parada
          this.parkedStartTime = null;
        }
        break;

      case VehicleState.PARKED_CONSOLIDATING:
        // Anti-stall / Parada em semáforo: motor voltou a ligar!
        if (isEngineRunning || isVehicleMoving) {
          this.setState(VehicleState.TRIP_ACTIVE, 'Motor religado (retomada de viagem)');
          this.parkedStartTime = null;
          break;
        }

        // Continua desligado: verifica condições de encerramento
        if (this.parkedStartTime) {
          const elapsedStopped = (now - this.parkedStartTime) / 1000;
          const targetSeconds = (this.isInPoi && !this.isBtConnected)
            ? this.options.btDisconnectFinalizeSeconds
            : this.options.poiFinalizeSeconds;

          if (elapsedStopped >= targetSeconds) {
            this.setState(VehicleState.SLEEP, 'Viagem consolidada e encerrada com sucesso');
            if (this.onTripFinalized) {
              this.onTripFinalized({
                endedAt: now,
                inPoi: this.isInPoi,
                stoppedDurationSeconds: Math.round(elapsedStopped)
              });
            }
          }
        }
        break;

      case VehicleState.SLEEP:
        // Veículo volta a ligar -> nova viagem
        if (isEngineRunning || isVehicleMoving) {
          this.setState(VehicleState.TRIP_ACTIVE, 'Nova ignição detectada');
          this.parkedStartTime = null;
        }
        break;
    }

    // Calcula amostragem adaptativa
    return this.calculatePollingInterval(rpm, speed);
  }

  // Intervalo de amostragem adaptativo para economia de bateria e barramento CAN
  calculatePollingInterval(rpm, speed) {
    if (this.state === VehicleState.SLEEP || this.state === VehicleState.IDLE_STANDBY) {
      return 30000; // 30s em standby
    }

    if (this.state === VehicleState.PARKED_CONSOLIDATING) {
      return 5000; // 5s durante consolidação
    }

    // Em TRIP_ACTIVE:
    const deltaSpeed = Math.abs(speed - this.lastSpeed);
    const deltaRpm = Math.abs(rpm - this.lastRpm);
    this.lastSpeed = speed;
    this.lastRpm = rpm;

    // Se velocidade ou rotação estão variando significativamente -> 1Hz (ou 200ms se dinâmico)
    if (deltaSpeed > 3 || deltaRpm > 200) {
      this.steadyCruiseTicks = 0;
      return 200; // Máxima resolução para condução esportiva / NFS Shift
    }

    // Se está em marcha lenta parado (semáforo)
    if (speed <= 1 && rpm < 900) {
      return 1500; // 1.5s
    }

    // Em velocidade de cruzeiro estável
    this.steadyCruiseTicks++;
    if (this.steadyCruiseTicks > 10) {
      return 3000; // 3s em cruzeiro de rodovia estável
    }

    return 500; // 500ms normal
  }

  reset() {
    this.state = VehicleState.IDLE_STANDBY;
    this.parkedStartTime = null;
    this.steadyCruiseTicks = 0;
  }
}
