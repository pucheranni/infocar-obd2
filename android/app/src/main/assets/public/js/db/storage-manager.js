// AutoPulse Storage & Relational Database Manager (SQLite / IndexedDB)
// Baseado na arquitetura e índices aprovados pelo GPT-Sol (Fase 5)

const DB_NAME = 'autopulse_db';
const DB_VERSION = 1;

export class StorageManager {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  async init() {
    if (typeof indexedDB === 'undefined') {
      this.isReady = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Tabela de Viagens (trips)
        if (!db.objectStoreNames.contains('trips')) {
          const tripStore = db.createObjectStore('trips', { keyPath: 'id', autoIncrement: true });
          // Índices recomendados pelo GPT-Sol:
          tripStore.createIndex('idx_trips_corridor_direction', ['route_corridor', 'direction'], { unique: false });
          tripStore.createIndex('idx_trips_start_time', 'start_time', { unique: false });
          tripStore.createIndex('idx_trips_corridor_date', ['route_corridor', 'start_time'], { unique: false });
        }

        // Tabela de Abastecimentos (fuelings)
        if (!db.objectStoreNames.contains('fuelings')) {
          const fuelStore = db.createObjectStore('fuelings', { keyPath: 'id', autoIncrement: true });
          fuelStore.createIndex('idx_fuelings_timestamp', 'timestamp', { unique: false });
        }

        // Tabela de Amostras de Telemetria (telemetry_samples)
        if (!db.objectStoreNames.contains('telemetry_samples')) {
          const sampleStore = db.createObjectStore('telemetry_samples', { keyPath: 'id', autoIncrement: true });
          sampleStore.createIndex('idx_samples_trip_id', 'trip_id', { unique: false });
          sampleStore.createIndex('idx_samples_timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        this.isReady = true;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.warn('Erro ao inicializar IndexedDB:', e.target.error);
        resolve(null);
      };
    });
  }

  async saveTrip(trip) {
    if (!this.db) return this.fallbackSave('autopulse_trips', trip);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['trips'], 'readwrite');
      const store = tx.objectStore('trips');
      const req = store.add({
        ...trip,
        created_at: Date.now()
      });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveFueling(fueling) {
    if (!this.db) return this.fallbackSave('autopulse_fuelings', fueling);
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['fuelings'], 'readwrite');
      const store = tx.objectStore('fuelings');
      const req = store.add({
        ...fueling,
        timestamp: fueling.timestamp || Date.now()
      });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllTrips() {
    if (!this.db) return this.fallbackGetAll('autopulse_trips');
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['trips'], 'readonly');
      const store = tx.objectStore('trips');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllFuelings() {
    if (!this.db) return this.fallbackGetAll('autopulse_fuelings');
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['fuelings'], 'readonly');
      const store = tx.objectStore('fuelings');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // Agregação de custos por corredor de mobilidade
  async getCorridorAnalytics() {
    const trips = await this.getAllTrips();
    const corridors = {};

    for (const t of trips) {
      const corridor = t.route_corridor || 'OUTROS';
      const direction = t.direction || 'OUTBOUND';
      const key = `${corridor}_${direction}`;

      if (!corridors[key]) {
        corridors[key] = {
          corridor,
          direction,
          count: 0,
          totalDistance: 0,
          totalFuel: 0,
          totalCost: 0,
          totalDurationMinutes: 0
        };
      }

      corridors[key].count++;
      corridors[key].totalDistance += Number(t.distance_km || 0);
      corridors[key].totalFuel += Number(t.fuel_consumed_liters || 0);
      corridors[key].totalCost += Number(t.cost_reais || 0);
      corridors[key].totalDurationMinutes += Number(t.duration_minutes || 0);
    }

    return Object.values(corridors).map(c => ({
      corridor: c.corridor,
      direction: c.direction,
      tripsCount: c.count,
      avgDistanceKm: c.count ? (c.totalDistance / c.count).toFixed(1) : 0,
      avgConsumptionKmL: c.totalFuel > 0 ? (c.totalDistance / c.totalFuel).toFixed(2) : 0,
      avgCostReais: c.count ? (c.totalCost / c.count).toFixed(2) : 0,
      avgDurationMin: c.count ? Math.round(c.totalDurationMinutes / c.count) : 0
    }));
  }

  // Exportação assíncrona em JSON ou CSV sem bloquear a thread principal
  async exportData(format = 'json') {
    const trips = await this.getAllTrips();
    const fuelings = await this.getAllFuelings();

    if (format === 'csv') {
      const header = 'id,route_corridor,direction,origin,destination,distance_km,fuel_liters,cost_reais,eco_score,date\n';
      const rows = trips.map(t => [
        t.id,
        `"${t.route_corridor || ''}"`,
        `"${t.direction || ''}"`,
        `"${t.origin || ''}"`,
        `"${t.destination || ''}"`,
        t.distance_km,
        t.fuel_consumed_liters,
        t.cost_reais,
        t.eco_score,
        new Date(t.start_time || Date.now()).toISOString()
      ].join(',')).join('\n');
      return new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    }

    const payload = JSON.stringify({
      version: '1.0',
      exported_at: new Date().toISOString(),
      trips,
      fuelings
    }, null, 2);

    return new Blob([payload], { type: 'application/json;charset=utf-8;' });
  }

  // Fallbacks de armazenamento para ambientes sem IndexedDB (Node / Testes / LocalStorage)
  fallbackSave(key, item) {
    if (typeof localStorage === 'undefined') return 1;
    try {
      const items = JSON.parse(localStorage.getItem(key) || '[]');
      const id = items.length + 1;
      items.push({ id, ...item });
      localStorage.setItem(key, JSON.stringify(items));
      return id;
    } catch (e) {
      return 0;
    }
  }

  fallbackGetAll(key) {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      return [];
    }
  }
}
