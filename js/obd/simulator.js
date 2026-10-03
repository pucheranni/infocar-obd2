// Virtual ELM327 and ECU Simulator
export class VirtualECU {
  constructor() {
    this.speed = 0;           // km/h
    this.rpm = 850;           // RPM (idle)
    this.coolantTemp = 75;    // °C
    this.engineLoad = 18;     // %
    this.throttle = 12;       // %
    this.fuelLevel = 78;      // %
    this.voltage = 14.1;      // V
    this.intakeTemp = 28;     // °C
    this.maf = 3.2;           // g/s
    this.vin = "9BG114876NA012345";
    
    // Active DTCs simulated
    this.activeDTCs = ["P0300", "P0171"];
    this.pendingDTCs = ["P0420"];
    
    // Simulation state
    this.isAccelerating = true;
    this.gear = 1;
    this.simTimer = null;
    this.startSimulation();
  }

  startSimulation() {
    this.simTimer = setInterval(() => {
      this.tick();
    }, 150);
  }

  stopSimulation() {
    if (this.simTimer) clearInterval(this.simTimer);
  }

  tick() {
    // Dynamic driving cycle simulation
    if (this.isAccelerating) {
      this.throttle = Math.min(68, this.throttle + 2.5);
      this.rpm += 85;
      this.speed += 1.2;

      // Gear shifting logic
      if (this.rpm > 3400 && this.gear < 5) {
        this.gear++;
        this.rpm = Math.max(1600, this.rpm - 1400);
      }

      if (this.speed >= 115) {
        this.isAccelerating = false;
      }
    } else {
      // Decelerating / cruising
      this.throttle = Math.max(8, this.throttle - 2.0);
      this.speed = Math.max(0, this.speed - 1.4);
      this.rpm = Math.max(850, this.rpm - 65);

      if (this.speed <= 25) {
        this.gear = 2;
      }
      if (this.speed <= 2) {
        this.speed = 0;
        this.gear = 1;
        this.rpm = 850 + Math.floor(Math.sin(Date.now() / 400) * 30);
        this.throttle = 10;
        // Start next acceleration cycle after brief stop
        if (Math.random() > 0.7) {
          this.isAccelerating = true;
        }
      }
    }

    // Engine Load follows throttle & speed
    this.engineLoad = Math.min(95, Math.max(12, Math.round((this.throttle * 0.9) + (this.speed * 0.15))));
    
    // MAF calculation based on RPM and load
    this.maf = Math.round(((this.rpm * 0.005) + (this.engineLoad * 0.15)) * 10) / 10;

    // Coolant temp slowly warms to 90-92°C
    if (this.coolantTemp < 91) {
      this.coolantTemp += 0.05;
    }

    // Slight voltage fluctuation (alternator)
    this.voltage = Math.round((14.1 + (Math.sin(Date.now() / 1000) * 0.2)) * 10) / 10;

    // Gradual fuel consumption
    this.fuelLevel = Math.max(5, this.fuelLevel - 0.0005);
  }

  // Inject or clear fault codes dynamically
  injectDTC(code) {
    if (!this.activeDTCs.includes(code)) {
      this.activeDTCs.push(code);
    }
  }

  clearDTCs() {
    this.activeDTCs = [];
    this.pendingDTCs = [];
  }

  // Process ELM327 ASCII AT / OBD commands
  processCommand(rawCmd) {
    const cmd = rawCmd.trim().toUpperCase().replace(/\s+/g, '');
    
    // AT Commands
    if (cmd.startsWith('AT')) {
      if (cmd === 'ATZ' || cmd === 'ATWS') return 'ELM327 v1.5\r\r>';
      if (cmd === 'ATE0' || cmd === 'ATE1') return 'OK\r\r>';
      if (cmd === 'ATH0' || cmd === 'ATH1') return 'OK\r\r>';
      if (cmd === 'ATL0' || cmd === 'ATL1') return 'OK\r\r>';
      if (cmd === 'ATS0' || cmd === 'ATS1') return 'OK\r\r>';
      if (cmd.startsWith('ATSP')) return 'OK\r\r>';
      if (cmd === 'ATDP') return 'ISO 15765-4 (CAN 11/500)\r\r>';
      if (cmd === 'ATDPN') return 'A6\r\r>';
      if (cmd === 'ATRV') return `${this.voltage.toFixed(1)}V\r\r>`;
      if (cmd === 'ATIGN') return 'ON\r\r>';
      return 'OK\r\r>';
    }

    // Mode 01: Current Data
    if (cmd.startsWith('01')) {
      const pid = cmd.substring(2, 4);
      return this.handleMode01(pid);
    }

    // Mode 03: Request Stored Diagnostic Trouble Codes (DTC)
    if (cmd === '03') {
      return this.handleMode03();
    }

    // Mode 04: Clear Trouble Codes & Reset MIL
    if (cmd === '04') {
      this.clearDTCs();
      return '44\r\r>';
    }

    // Mode 07: Request Pending Trouble Codes
    if (cmd === '07') {
      return this.handleMode07();
    }

    // Mode 09: Vehicle Information (VIN)
    if (cmd === '0902') {
      return this.handleMode09VIN();
    }

    return 'NO DATA\r\r>';
  }

  handleMode01(pid) {
    switch (pid) {
      case '00': // PIDs supported [01-20]
        return '41 00 BE 3F B8 11\r\r>';
      case '20': // PIDs supported [21-40]
        return '41 20 80 07 20 01\r\r>';
      case '01': // Status since DTCs cleared
        const milOn = this.activeDTCs.length > 0 ? 0x80 : 0x00;
        const dtcCount = this.activeDTCs.length & 0x7F;
        const aByte = (milOn | dtcCount).toString(16).padStart(2, '0').toUpperCase();
        return `41 01 ${aByte} 00 00 00\r\r>`;
      case '04': // Engine Load
        const loadVal = Math.round((this.engineLoad * 255) / 100);
        return `41 04 ${loadVal.toString(16).padStart(2, '0').toUpperCase()}\r\r>`;
      case '05': // Coolant Temp
        const tempVal = Math.round(this.coolantTemp + 40);
        return `41 05 ${tempVal.toString(16).padStart(2, '0').toUpperCase()}\r\r>`;
      case '0C': // Engine RPM: ((A*256)+B)/4
        const rpmScaled = Math.round(this.rpm * 4);
        const rpmA = Math.floor(rpmScaled / 256).toString(16).padStart(2, '0').toUpperCase();
        const rpmB = (rpmScaled % 256).toString(16).padStart(2, '0').toUpperCase();
        return `41 0C ${rpmA} ${rpmB}\r\r>`;
      case '0D': // Vehicle Speed: A
        const spdVal = Math.round(this.speed).toString(16).padStart(2, '0').toUpperCase();
        return `41 0D ${spdVal}\r\r>`;
      case '0F': // Intake Air Temp
        const iatVal = Math.round(this.intakeTemp + 40).toString(16).padStart(2, '0').toUpperCase();
        return `41 0F ${iatVal}\r\r>`;
      case '10': // MAF: ((A*256)+B)/100
        const mafScaled = Math.round(this.maf * 100);
        const mafA = Math.floor(mafScaled / 256).toString(16).padStart(2, '0').toUpperCase();
        const mafB = (mafScaled % 256).toString(16).padStart(2, '0').toUpperCase();
        return `41 10 ${mafA} ${mafB}\r\r>`;
      case '11': // Throttle Position (TPS)
        const tpsVal = Math.round((this.throttle * 255) / 100).toString(16).padStart(2, '0').toUpperCase();
        return `41 11 ${tpsVal}\r\r>`;
      case '2F': // Fuel Tank Level
        const fuelVal = Math.round((this.fuelLevel * 255) / 100).toString(16).padStart(2, '0').toUpperCase();
        return `41 2F ${fuelVal}\r\r>`;
      case '42': // Control Module Voltage: ((A*256)+B)/1000
        const vScaled = Math.round(this.voltage * 1000);
        const vA = Math.floor(vScaled / 256).toString(16).padStart(2, '0').toUpperCase();
        const vB = (vScaled % 256).toString(16).padStart(2, '0').toUpperCase();
        return `41 42 ${vA} ${vB}\r\r>`;
      default:
        return 'NO DATA\r\r>';
    }
  }

  // Encode DTC string like "P0300" into 2 OBD bytes
  encodeDTC(code) {
    const prefix = code[0].toUpperCase();
    let typeBits = 0; // P = 00
    if (prefix === 'C') typeBits = 1;      // 01
    else if (prefix === 'B') typeBits = 2; // 10
    else if (prefix === 'U') typeBits = 3; // 11

    const num1 = parseInt(code[1], 10) || 0;
    const byte1 = ((typeBits << 6) | (num1 << 4) | (parseInt(code[2], 16) || 0)).toString(16).padStart(2, '0').toUpperCase();
    const byte2 = code.substring(3, 5).toUpperCase();
    return `${byte1} ${byte2}`;
  }

  handleMode03() {
    if (this.activeDTCs.length === 0) {
      return '43 00 00 00 00 00 00\r\r>';
    }
    const pairs = this.activeDTCs.map(dtc => this.encodeDTC(dtc));
    const count = this.activeDTCs.length.toString(16).padStart(2, '0').toUpperCase();
    return `43 ${count} ${pairs.join(' ')}\r\r>`;
  }

  handleMode07() {
    if (this.pendingDTCs.length === 0) {
      return '47 00 00 00 00 00 00\r\r>';
    }
    const pairs = this.pendingDTCs.map(dtc => this.encodeDTC(dtc));
    const count = this.pendingDTCs.length.toString(16).padStart(2, '0').toUpperCase();
    return `47 ${count} ${pairs.join(' ')}\r\r>`;
  }

  handleMode09VIN() {
    // Return standard multiline response for VIN (09 02)
    // 9BG114876NA012345 in ASCII hex
    const vinChars = this.vin.split('');
    const hexBytes = vinChars.map(c => c.charCodeAt(0).toString(16).toUpperCase());
    
    // CAN multiline frame representation
    return `49 02 01 ${hexBytes.slice(0, 3).join(' ')}\r\n` +
           `49 02 02 ${hexBytes.slice(3, 10).join(' ')}\r\n` +
           `49 02 03 ${hexBytes.slice(10, 17).join(' ')}\r\r>`;
  }
}
