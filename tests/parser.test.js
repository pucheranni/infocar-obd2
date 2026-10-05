// Testes do núcleo (sem dependências): rode com `npm test` ou `node --test tests/*.test.js`.
// ATENÇÃO: escritos mas ainda NÃO executados (o ambiente do agente não tinha shell).
// Se algum falhar, desconfie primeiro do teste, depois do código.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ELM327Client } from '../js/obd/elm327.js';
import { VirtualECU } from '../js/obd/simulator.js';
import { TripComputer } from '../js/trip.js';
import { ShiftCoach } from '../js/obd/shift-coach.js';

const CAN = 'ISO 15765-4 (CAN 11/500)';
const KWP = 'ISO 14230-4 (KWP FAST)';

function makeClient(protocol) {
  const client = new ELM327Client();
  client.vehicleData.protocol = protocol;
  client.captured = null;
  client.onDTCsReceived = (codes, pending) => {
    client.captured = { codes, pending };
  };
  return client;
}

// ---------------------------------------------------------------- DTC

test('CAN: pula o byte de contagem e decodifica dois DTCs', () => {
  const client = makeClient(CAN);
  const codes = client.parseDTCResponse('43 02 01 33 03 00 00 00 \r\r>');  assert.deepEqual(codes, ['P0133', 'P0300']);
});

test('K-Line: sem byte de contagem', () => {
  const client = makeClient(KWP);
  const codes = client.parseDTCResponse('43 01 33 03 00 00 00 \r\r>');  assert.deepEqual(codes, ['P0133', 'P0300']);
});

test('CAN multi-frame: ignora marcadores 0:/1: e o cabeçalho de tamanho', () => {
  const client = makeClient(CAN);
  const codes = client.parseDTCResponse('00A\r0: 43 03 01 33 03 00\r1: 04 20 00 00 00 00 00\r\r>');  assert.deepEqual(codes, ['P0133', 'P0300', 'P0420']);
});

test('CAN sem falhas devolve lista vazia', () => {
  const client = makeClient(CAN);
  const codes = client.parseDTCResponse('43 00 00 00 00 00 00 \r\r>');  assert.deepEqual(codes, []);
});

test('Mode 07 usa o prefixo 47 e marca como pendente', () => {
  const client = makeClient(CAN);
  const codes = client.parseDTCResponse('47 01 04 20 00 00 00 \r\r>', true);  assert.deepEqual(codes, ['P0420']);
});

test('Ida e volta: simulador -> parser (CAN)', () => {
  const ecu = new VirtualECU();
  ecu.stopSimulation(); // o construtor inicia um setInterval
  ecu.activeDTCs = ['P0300', 'P0171'];
  const client = makeClient(CAN);
  const codes = client.parseDTCResponse(ecu.processCommand('03'));  assert.deepEqual(codes, ['P0300', 'P0171']);
});

// ---------------------------------------------------------------- VIN

test('VIN multi-frame do simulador é remontado', () => {
  const ecu = new VirtualECU();
  ecu.stopSimulation();
  const client = makeClient(CAN);
  client.parseVINResponse(ecu.processCommand('0902'));
  assert.equal(client.vehicleData.vin, ecu.vin);
});

// ---------------------------------------------------------------- Trip

function withClock(fn) {
  const realNow = Date.now;
  let t = 1_000_000;
  Date.now = () => t;
  try {
    fn({ advance: (ms) => { t += ms; } });
  } finally {
    Date.now = realNow;
  }
}

test('Trip: distância e combustível seguem o tempo real, não o número de chamadas', () => {
  withClock((clock) => {
    const trip = new TripComputer();
    try {
      trip.update(60, 10, 2000);
      for (let i = 0; i < 9; i++) {
        clock.advance(200);
        trip.update(60, 10, 2000);
      }
      // 9 intervalos de 0,2 s a 60 km/h
      assert.ok(Math.abs(trip.distanceKm - 60 * (1.8 / 3600)) < 1e-6);
      // 10 g/s de ar, gasolina E27 (AFR 13,2 / 745 g/L) durante 1,8 s
      const litersPerHour = (10 / 13.2 / 745) * 3600;
      assert.ok(Math.abs(trip.fuelConsumedLiters - (litersPerHour / 3600) * 1.8) < 1e-5);
      assert.equal(trip.hardAccelerations, 0);
    } finally {
      clearInterval(trip.timer);
    }
  });
});

test('Trip: variação lenta de velocidade não conta como aceleração brusca', () => {
  withClock((clock) => {
    const trip = new TripComputer();
    try {
      trip.update(40, 8, 2000);
      for (let i = 0; i < 6; i++) {
        clock.advance(200);
        trip.update(i < 5 ? 40 : 43, 8, 2000); // +3 km/h em 1,2 s = 2,5 km/h/s
      }
      assert.equal(trip.hardAccelerations, 0);
    } finally {
      clearInterval(trip.timer);
    }
  });
});

test('Trip: aceleração real (+15 km/h em 1 s) é contada uma vez', () => {
  withClock((clock) => {
    const trip = new TripComputer();
    try {
      trip.update(40, 8, 2000);
      clock.advance(1000);
      trip.update(55, 15, 3500);
      assert.equal(trip.hardAccelerations, 1);
      assert.equal(trip.ecoScore, 98);
    } finally {
      clearInterval(trip.timer);
    }
  });
});

test('PID 0100: decodifica mapa de bits do Clio 2011 (BE 3E B8 11)', () => {
  const client = new ELM327Client();
  client.parseSupportedPIDs('SEARCHING...\r\n41 00 BE 3E B8 11\r\r>');
  // Checa PIDs que o carro do usuário havia dropado incorretamente
  assert.ok(client.ecuSupportedPids.has('0105'), 'PID 0105 Temp. Arrefecimento suportado');
  assert.ok(client.ecuSupportedPids.has('0106'), 'PID 0106 STFT suportado');
  assert.ok(client.ecuSupportedPids.has('0107'), 'PID 0107 LTFT suportado');
  assert.ok(client.ecuSupportedPids.has('0111'), 'PID 0111 TPS suportado');
  assert.ok(client.ecuSupportedPids.has('010B'), 'PID 010B MAP suportado');
  assert.ok(client.ecuSupportedPids.has('010C'), 'PID 010C RPM suportado');
  assert.ok(!client.ecuSupportedPids.has('0110'), 'PID 0110 MAF NÃO suportado (Speed-Density)');
});

test('ELM327: PID suportado pela ECU nunca é jogado em unsupportedPids em NO DATA transitório', () => {
  const client = new ELM327Client();
  client.isPolling = true;
  client.parseSupportedPIDs('41 00 BE 3E B8 11');
  for (let i = 0; i < 10; i++) {
    client.parseResponse('0105', 'NO DATA\r\r>');
    client.parseResponse('0111', 'NO DATA\r\r>');
  }
  assert.ok(!client.unsupportedPids.has('0105'));
  assert.ok(!client.unsupportedPids.has('0111'));
});

test('Trip: motor desligado (RPM < 300) zera consumo e não acumula combustível fantasma', () => {
  withClock((clock) => {
    const trip = new TripComputer();
    try {
      trip.update(0, 0, 0); // ignição ligada, motor desligado
      for (let i = 0; i < 20; i++) {
        clock.advance(500); // 10 segundos parado com ignição ligada
        trip.update(0, 0, 0);
      }
      assert.equal(trip.fuelConsumedLiters, 0);
      assert.equal(trip.instantLitersPerHour, 0);
      assert.equal(trip.instantKmPerLiter, 0);
      assert.equal(trip.getAverageFuelEconomy(), 0);
    } finally {
      clearInterval(trip.timer);
    }
  });
});

// ---------------------------------------------------------------- ShiftCoach (NFS)

test('Shift Coach: mapeia zonas do Renault D4D 1.0 16V (Eco, Power, Lugging, Redline)', () => {
  const coach = new ShiftCoach();

  // Motor parado
  assert.equal(coach.update(0).zone, 'idle');

  // Lugging (sub-torque: RPM < 1500 com carga alta MAP > 70)
  coach.reset();
  const lugging = coach.update(1300, 85);
  assert.equal(lugging.zone, 'lugging');

  // Eco Sweet Spot (1.800 a 2.600 RPM)
  coach.reset();
  const eco = coach.update(2200, 45);
  assert.equal(eco.zone, 'eco');
  assert.ok(eco.badgeText.includes('ECO'));

  // Normal / Cruzeiro (2.600 a 3.800 RPM)
  coach.reset();
  const normal = coach.update(3100, 50);
  assert.equal(normal.zone, 'normal');

  // Power Sweet Spot (3.800 a 4.700 RPM)
  coach.reset();
  const power = coach.update(4250, 95);
  assert.equal(power.zone, 'power');
  assert.ok(power.badgeText.includes('POWER'));

  // Redline / Shift Now (> 5.800 RPM)
  coach.reset();
  const redline = coach.update(6000, 90);
  assert.equal(redline.zone, 'redline');
});

test('Shift Coach: histerese +-75 RPM impede oscilação em fronteiras de rotação', () => {
  const coach = new ShiftCoach();
  
  // Entra no Eco aos 2200 RPM
  coach.update(2200);
  assert.equal(coach.currentZone, 'eco');

  // RPM sobe levemente para 2630 (acima do teto nominal de 2600, mas dentro da histerese de 2675)
  // Permanece em 'eco'
  coach.update(2630);
  assert.equal(coach.currentZone, 'eco');

  // RPM agora ultrapassa 2750 por 1 segundo (20 ticks a 20Hz) -> transita para 'normal'
  for (let i = 0; i < 20; i++) coach.update(2750);
  assert.equal(coach.currentZone, 'normal');
});

