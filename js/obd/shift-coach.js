// Assistente de Condução e Shift Light estilo Need for Speed calibrado para Renault Clio 1.0 16V Hi-Flex (D4D)
// Validado pelo GPT-Sol com filtro EMA (alpha = 0.15) e histerese de +-75 RPM

export class ShiftCoach {
  constructor() {
    this.rpmFiltered = 0;
    this.currentZone = 'idle';
  }

  reset() {
    this.rpmFiltered = 0;
    this.currentZone = 'idle';
  }

  update(rpm, map = 0) {
    if (this.rpmFiltered === 0) {
      this.rpmFiltered = rpm;
    } else {
      this.rpmFiltered += 0.15 * (rpm - this.rpmFiltered);
    }
    const filtered = Math.round(this.rpmFiltered);

    let targetZone = this.currentZone;

    if (rpm < 300) {
      targetZone = 'idle';
    } else if (rpm >= 5800) {
      targetZone = 'redline';
    } else if (rpm >= 5400) {
      targetZone = 'alert';
    } else if (this.currentZone === 'power') {
      if (filtered < 3725) targetZone = (filtered >= 2600) ? 'normal' : 'eco';
      else if (filtered > 4775) targetZone = 'normal';
    } else if (this.currentZone === 'eco') {
      if (filtered > 2675) targetZone = (filtered >= 3800) ? 'power' : 'normal';
      else if (filtered < 1725) targetZone = (map > 70 && filtered < 1600) ? 'lugging' : 'idle';
    } else if (this.currentZone === 'lugging') {
      if (filtered > 1600 || map < 65) targetZone = (filtered >= 1800) ? 'eco' : 'idle';
    } else {
      if (filtered >= 3800 && filtered <= 4700) {
        targetZone = 'power';
      } else if (filtered >= 1800 && filtered <= 2600) {
        targetZone = 'eco';
      } else if (filtered < 1500 && map > 70) {
        targetZone = 'lugging';
      } else if (filtered >= 2600 && filtered < 3800) {
        targetZone = 'normal';
      } else {
        targetZone = 'idle';
      }
    }

    this.currentZone = targetZone;

    return {
      filteredRpm: filtered,
      zone: targetZone,
      barPercent: Math.min(100, Math.max(0, (filtered / 6800) * 100)),
      badgeText: this.getBadgeText(targetZone, rpm),
      hintIcon: this.getHintIcon(targetZone),
      hintText: this.getHintText(targetZone, filtered, rpm)
    };
  }

  getBadgeText(zone, rpm) {
    switch (zone) {
      case 'eco': return '✨ ECO SWEET SPOT ✨';
      case 'power': return '🔥 POWER SWEET SPOT 🔥';
      case 'normal': return 'CRUZEIRO URBANO';
      case 'lugging': return '⚠️ SUB-TORQUE';
      case 'alert': return '⚡ PREPARE SHIFT';
      case 'redline': return '🚨 TROQUE AGORA!';
      default: return rpm >= 300 ? 'MARCHA LENTA' : 'STANDBY';
    }
  }

  getHintIcon(zone) {
    switch (zone) {
      case 'eco': return '🟢';
      case 'power': return '🟣';
      case 'normal': return '🔵';
      case 'lugging': return '🔻';
      case 'alert': return '🟠';
      case 'redline': return '🔴';
      default: return '⚪';
    }
  }

  getHintText(zone, filtered, rpm) {
    switch (zone) {
      case 'eco': return 'Mantenha • 1.8k-2.6k Eficiência Máxima';
      case 'power': return 'Torque Máximo • 10,3 kgfm (4.250 RPM)';
      case 'normal': return filtered > 3200 ? '↑ Suba a Marcha para Economizar' : 'Condução Progressiva';
      case 'lugging': return 'Reduza a Marcha • Motor em Esforço';
      case 'alert': return 'Giro Alto • Prepare Próxima Marcha';
      case 'redline': return 'SHIFT NOW • Corte de Giro';
      default: return rpm >= 300 ? 'Motor Operando em Ponto Morto' : 'Motor Desligado';
    }
  }
}
