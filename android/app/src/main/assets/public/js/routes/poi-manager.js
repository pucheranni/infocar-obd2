// Gerenciador de Pontos de Interesse (POIs) e Classificação Semântica de Rotas
// Baseado no modelo aprovado pelo GPT-Sol com Haversine leve e raio adaptativo por local

export const POI_CATALOG = [
  {
    id: 'POI_CASA',
    name: 'Casa',
    address: 'Rua Padre Camargo de Lacerda, 400 - Jardim Chapadão, Campinas/SP',
    lat: -22.8935,
    lng: -47.0780,
    radiusMeters: 120 // Área residencial
  },
  {
    id: 'POI_A2E',
    name: 'A2Z',
    address: 'Valinhos/SP (Rota Centro 1)',
    lat: -22.9715,
    lng: -46.9960,
    radiusMeters: 180
  },
  {
    id: 'POI_TRAPA',
    name: 'Tetra Pak',
    address: 'Monte Mor/SP (Rod. Campinas-Monte Mor)',
    lat: -22.9350,
    lng: -47.2800,
    radiusMeters: 350 // Complexo industrial amplo
  },
  {
    id: 'POI_UNICAMP',
    name: 'Unicamp',
    address: 'Barão Geraldo, Campinas/SP (Campus Universitário)',
    lat: -22.8184,
    lng: -47.0647,
    radiusMeters: 400 // Estacionamentos do campus
  },
  {
    id: 'POI_TEXAS',
    name: 'Super Texas Carnes',
    address: 'São Paulo/SP (Casa da Sogra)',
    lat: -23.5505,
    lng: -46.6333,
    radiusMeters: 250
  },
  {
    id: 'POI_FOZ_MAUA',
    name: 'Rua Foz do Iguaçu',
    address: 'Jardim Oratório, Mauá/SP',
    lat: -23.6680,
    lng: -46.4610,
    radiusMeters: 150
  }
];

// Cálculo de distância geodésica em quilômetros via fórmula de Haversine
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0; // Raio médio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class POIManager {
  constructor(pois = POI_CATALOG) {
    this.pois = [...pois];
    this.originPOI = null;
    this.destinationPOI = null;
    this.lastKnownPosition = null; // Last Known Good Position (LKGP)
    this.lastPositionTimestamp = 0;
    this.stoppedAtPoiStartTime = null;
    this.activeRouteName = 'Rotas da Cidade';
  }

  // Registra nova leitura de GPS
  updateLocation(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    this.lastKnownPosition = { lat, lng };
    this.lastPositionTimestamp = Date.now();

    // Se a viagem ainda não tem origem definida, tenta detectar o POI inicial
    if (!this.originPOI) {
      const nearest = this.findNearestPOI(lat, lng);
      if (nearest) {
        this.originPOI = nearest.poi;
        this.updateRouteName();
      }
    }
  }

  // Retorna a melhor posição conhecida respeitando a tolerância de LKGP
  getEffectiveLocation(isVehicleMoving = false) {
    if (!this.lastKnownPosition) return null;
    const elapsedSeconds = (Date.now() - this.lastPositionTimestamp) / 1000;
    const maxTolerated = isVehicleMoving ? 120 : 300;
    if (elapsedSeconds <= maxTolerated) {
      return this.lastKnownPosition;
    }
    return null;
  }

  // Encontra o POI mais próximo dentro do raio de tolerância
  findNearestPOI(lat, lng) {
    let best = null;
    let minDistanceKm = Infinity;

    for (const poi of this.pois) {
      const distKm = haversineDistanceKm(lat, lng, poi.lat, poi.lng);
      const radiusKm = poi.radiusMeters / 1000;
      if (distKm <= radiusKm && distKm < minDistanceKm) {
        minDistanceKm = distKm;
        best = { poi, distanceMeters: Math.round(distKm * 1000) };
      }
    }
    return best;
  }

  // Avalia se o veículo concluiu a viagem em um POI (180s com RPM = 0 e Vel = 0)
  checkArrival(rpm = 0, speed = 0) {
    const isStopped = rpm < 300 && speed <= 3;
    const pos = this.getEffectiveLocation(false);

    if (!isStopped || !pos) {
      this.stoppedAtPoiStartTime = null;
      return null;
    }

    const nearest = this.findNearestPOI(pos.lat, pos.lng);
    if (!nearest) {
      this.stoppedAtPoiStartTime = null;
      return null;
    }

    if (!this.stoppedAtPoiStartTime) {
      this.stoppedAtPoiStartTime = Date.now();
      return null;
    }

    const stoppedSeconds = (Date.now() - this.stoppedAtPoiStartTime) / 1000;
    if (stoppedSeconds >= 180) { // 3 minutos parado
      this.destinationPOI = nearest.poi;
      this.updateRouteName();
      const arrival = {
        routeId: `${this.originPOI ? this.originPOI.id : 'POI_UNKNOWN'}->${this.destinationPOI.id}`,
        routeName: this.activeRouteName,
        origin: this.originPOI ? this.originPOI.name : 'Origem Indefinida',
        destination: this.destinationPOI.name,
        stoppedSeconds: Math.round(stoppedSeconds)
      };
      this.stoppedAtPoiStartTime = null;
      return arrival;
    }

    return null;
  }

  updateRouteName() {
    const orig = this.originPOI ? this.originPOI.name : 'Origem';
    const dest = this.destinationPOI ? this.destinationPOI.name : 'Destino';
    this.activeRouteName = `${orig} ➔ ${dest}`;
  }

  resetTrip(newOriginLat = null, newOriginLng = null) {
    this.stoppedAtPoiStartTime = null;
    this.destinationPOI = null;
    if (newOriginLat && newOriginLng) {
      const nearest = this.findNearestPOI(newOriginLat, newOriginLng);
      this.originPOI = nearest ? nearest.poi : null;
    } else if (this.lastKnownPosition) {
      const nearest = this.findNearestPOI(this.lastKnownPosition.lat, this.lastKnownPosition.lng);
      this.originPOI = nearest ? nearest.poi : null;
    } else {
      this.originPOI = null;
    }
    this.updateRouteName();
  }
}
