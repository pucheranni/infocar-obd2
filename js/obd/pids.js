// Base OBD-II PIDs and calculations
export const OBD_PIDS = {
  // Mode 01: Current Data
  SUPPORTED_PIDS_1_20: { mode: '01', pid: '00', name: 'PIDs Suportados [01-20]', unit: '' },
  STATUS_DTC: { mode: '01', pid: '01', name: 'Status do Monitor e MIL', unit: '' },
  FREEZE_DTC: { mode: '01', pid: '02', name: 'DTC de Freeze Frame', unit: '' },
  FUEL_SYSTEM_STATUS: { mode: '01', pid: '03', name: 'Status do Sistema de Combustível', unit: '' },
  ENGINE_LOAD: { 
    mode: '01', pid: '04', name: 'Carga do Motor', unit: '%', min: 0, max: 100,
    decode: (bytes) => Math.round((bytes[0] * 100) / 255)
  },
  COOLANT_TEMP: { 
    mode: '01', pid: '05', name: 'Temp. Arrefecimento', unit: '°C', min: -40, max: 150,
    decode: (bytes) => bytes[0] - 40
  },
  SHORT_TERM_FUEL_TRIM_1: { 
    mode: '01', pid: '06', name: 'Ajuste Curto Prazo B1', unit: '%', min: -100, max: 99.2,
    decode: (bytes) => Math.round(((bytes[0] - 128) * 100) / 128)
  },
  LONG_TERM_FUEL_TRIM_1: { 
    mode: '01', pid: '07', name: 'Ajuste Longo Prazo B1', unit: '%', min: -100, max: 99.2,
    decode: (bytes) => Math.round(((bytes[0] - 128) * 100) / 128)
  },
  INTAKE_PRESSURE: { 
    mode: '01', pid: '0B', name: 'Pressão Coletor (MAP)', unit: 'kPa', min: 0, max: 255,
    decode: (bytes) => bytes[0]
  },
  ENGINE_RPM: { 
    mode: '01', pid: '0C', name: 'Rotação (RPM)', unit: 'RPM', min: 0, max: 8000,
    decode: (bytes) => Math.round(((bytes[0] * 256) + bytes[1]) / 4)
  },
  VEHICLE_SPEED: { 
    mode: '01', pid: '0D', name: 'Velocidade', unit: 'km/h', min: 0, max: 240,
    decode: (bytes) => bytes[0]
  },
  TIMING_ADVANCE: { 
    mode: '01', pid: '0E', name: 'Avanço de Ignição', unit: '°', min: -64, max: 63.5,
    decode: (bytes) => Math.round((bytes[0] / 2 - 64) * 10) / 10
  },
  INTAKE_TEMP: { 
    mode: '01', pid: '0F', name: 'Temp. Ar de Admissão', unit: '°C', min: -40, max: 100,
    decode: (bytes) => bytes[0] - 40
  },
  MAF_AIR_FLOW: { 
    mode: '01', pid: '10', name: 'Fluxo de Massa de Ar (MAF)', unit: 'g/s', min: 0, max: 655.35,
    decode: (bytes) => Math.round(((bytes[0] * 256) + bytes[1]) / 100 * 10) / 10
  },
  THROTTLE_POS: { 
    mode: '01', pid: '11', name: 'Posição Borboleta (TPS)', unit: '%', min: 0, max: 100,
    decode: (bytes) => Math.round((bytes[0] * 100) / 255)
  },
  OBD_STANDARDS: { mode: '01', pid: '1C', name: 'Padrão OBD Suportado', unit: '' },
  OXYGEN_SENSORS_PRESENT: { mode: '01', pid: '1D', name: 'Sensores O2 Presentes', unit: '' },
  RUN_TIME_ENGINE: { 
    mode: '01', pid: '1F', name: 'Tempo de Motor Ligado', unit: 's', min: 0, max: 65535,
    decode: (bytes) => (bytes[0] * 256) + bytes[1]
  },
  FUEL_TANK_LEVEL: { 
    mode: '01', pid: '2F', name: 'Nível de Combustível', unit: '%', min: 0, max: 100,
    decode: (bytes) => Math.round((bytes[0] * 100) / 255)
  },
  BAROMETRIC_PRESSURE: { 
    mode: '01', pid: '33', name: 'Pressão Barométrica', unit: 'kPa', min: 0, max: 255,
    decode: (bytes) => bytes[0]
  },
  CONTROL_MODULE_VOLTAGE: { 
    mode: '01', pid: '42', name: 'Tensão Módulo Controle', unit: 'V', min: 0, max: 20,
    decode: (bytes) => Math.round(((bytes[0] * 256) + bytes[1]) / 1000 * 100) / 100
  },
  AMBIENT_AIR_TEMP: { 
    mode: '01', pid: '46', name: 'Temp. Ambiente', unit: '°C', min: -40, max: 80,
    decode: (bytes) => bytes[0] - 40
  },
  ETHANOL_PERCENTAGE: { 
    mode: '01', pid: '52', name: 'Teor de Etanol', unit: '%', min: 0, max: 100,
    decode: (bytes) => Math.round((bytes[0] * 100) / 255)
  }
};
