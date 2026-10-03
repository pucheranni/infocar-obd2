// Testes do núcleo (sem dependências): rode com `npm test` ou `node --test tests/*.test.js`.
// ATENÇÃO: escritos mas ainda NÃO executados (o ambiente do agente não tinha shell).
// Se algum falhar, desconfie primeiro do teste, depois do código.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ELM327Client } from '../js/obd/elm327.js';
import { VirtualECU } from '../js/obd/simulator.js';
import { TripComputer } from '../js/trip.js';

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
  client.parseDTCResponse('43 02 01 33 03 00 00 00 \r\r>');
  assert.deepEqual(client.captured.codes, ['P0133', 'P0300']);
});

test('K-Line: sem byte de contagem', () => {
  const client = makeClient(KWP);
  client.parseDTCResponse('43 01 33 03 00 00 00 \r\r>');
  assert.deepEqual(client.captured.codes, ['P0133', 'P0300']);
});

test('CAN multi-frame: ignora marcadores 0:/1: e o cabeçalho de tamanho', () => {
  const client = makeClient(CAN);
  client.parseDTCResponse('00A\r0: 43 03 01 33 03 00\r1: 04 20 00 00 00 00 00\r\r>');
  assert.deepEqual(client.captured.codes, ['P0133', 'P0300', 'P0420']);
});

test('CAN sem falhas devolve lista vazia', () => {
  const client = makeClient(CAN);
  client.parseDTCResponse('43 00 00 00 00 00 00 \r\r>');
  assert.deepEqual(client.captured.codes, []);
});

test('Mode 07 usa o prefixo 47 e marca como pendente', () => {
  const client = makeClient(CAN);
  client.parseDTCResponse('47 01 04 20 00 00 00 \r\r>', true);
  assert.deepEqual(client.captured.codes, ['P0420']);
  assert.equal(client.captured.pending, true);
});

test('Ida e volta: simulador -> parser (CAN)', () => {
  const ecu = new VirtualECU();
  ecu.stopSimulation(); // o construtor inicia um setInterval
  ecu.activeDTCs = ['P0300', 'P0171'];
  const client = makeClient(CAN);
  client.parseDTCResponse(ecu.processCommand('03'));
  assert.deepEqual(client.captured.codes, ['P0300', 'P0171']);
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
      // 10 g/s de ar, gasolina E27 (AFR 13,3 / 745 g/L) durante 1,8 s
      const litersPerHour = (10 / 13.3 / 745) * 3600;
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
