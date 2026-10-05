Revisão Arquitetural GPT-Sol

Projeto: AutoPulse Copilot
Perfil: Agente Veicular "Zero Fricção" para Renault Clio D4D + ELM327 + Capacitor

Minha avaliação geral é que a arquitetura está muito bem direcionada para um MVP evolutivo e tecnicamente realizável. O diferencial não está no OBD2 em si, mas em transformar telemetria em um modelo comportamental do veículo e do motorista, algo próximo de um "Google Maps pessoal + computador de bordo persistente".

A principal preocupação técnica não é o cálculo de consumo. É a confiabilidade da automação em background no Android moderno.

Avaliação Executiva
Área	Avaliação
OBD2 / Speed Density	✅ Viável
Trips automáticas	✅ Muito viável
Geofencing limitado a 6 POIs	✅ Excelente caso de uso
Android Background	⚠️ Principal risco
Consumo calibrado	✅ Viável com ajustes
SQLite local	✅ Recomendado
Experiência Zero Fricção	✅ Possível
1. Estratégia de Conexão em Background
Minha recomendação

Não confiar exclusivamente em Bluetooth Scan.

Nem em polling contínuo.

Nem em Geolocation.

A solução mais robusta é uma combinação:

Plain Text
Bluetooth do carro conecta
        ↓
Broadcast Receiver Android
        ↓
Foreground Service
        ↓
Conecta ELM327
        ↓
Handshake OBD
        ↓
Start Trip
Arquitetura sugerida
Trigger Primário

Conexão Bluetooth do carro

Por exemplo:

Java
BluetoothDevice.ACTION_ACL_CONNECTED

ou

Java
BluetoothA2dp

Quando o Android detecta:

Plain Text
"MEDIA_BT_CAR"

o serviço acorda.

Trigger Secundário

ELM327 encontrado

Plain Text
OBDII
V-LINK
KONNWEI
ELM327
Trigger Terciário

Movimento detectado

Se quiser algo mais sofisticado:

Plain Text
Activity Recognition API

Google Play Services

Detecta:

Plain Text
IN_VEHICLE

antes mesmo de conectar.

Muito mais econômico que GPS.

Arquitetura recomendada
Plain Text
Android Boot
     ↓
Receiver
     ↓
Idle State
 
BT Audio Connected?
     ↓ Sim
Foreground Service
     ↓
Conectar ELM327
     ↓
Handshake
     ↓
Trip Active
O que NÃO faria

Não faria:

Plain Text
watchPosition()

rodando eternamente.

Android 14 e 15 eventualmente vão matar isso.

Além disso:

Plain Text
GPS = bateria
Bluetooth = quase grátis

Use Bluetooth para acordar o sistema.

Use GPS apenas quando houver uma trip ativa.

2. Geofencing

Para exatamente 6 POIs:

Plain Text
POI_CASA
POI_A2E
POI_TRAPA
POI_UNICAMP
POI_TEXAS
POI_FOZ_MAUA

não usaria GeofencingClient imediatamente.

MVP

Durante viagem:

Plain Text
GPS a cada 15-30 segundos

Calcular distância:

Plain Text
Haversine

para cada POI.

6 verificações.

Praticamente custo zero.

Exemplo
TypeScript
for (poi of pois) {
 
  distance = haversine(vehicle, poi)
 
  if (distance < 200m)
      arrivedPOI = poi
 
}
Por que gosto disso?

Porque:

Geofencing Android:

Plain Text
Mais complexo
Mais permissões
Mais edge cases

Seu cenário:

Plain Text
6 pontos fixos
Mesmo motorista
Mesma cidade

é perfeito para um geofencing lógico.

Regra que eu adotaria

Chegada:

Plain Text
RPM = 0
Velocidade = 0
Dentro de 200m do POI
Por 180s

↓

Plain Text
Trip encerrada
Evolução futura

Quando o produto estiver estável:

Plain Text
GeofencingClient

nativo.

Mas não começaria por ele.

3. Calibração de Consumo

Aqui existe bastante armadilha.

Mas a ideia geral está correta.

O que você está modelando

Você tem:

Plain Text
MAP
IAT
RPM
Cilindrada
AFR
ηv

e calcula:

Plain Text
massa_ar

↓

Plain Text
massa_comb

↓

Plain Text
volume

Correto.

O problema

ηv não é constante.

Seu documento assume:

Plain Text
ηv = constante

O motor não faz isso.

Ela muda com:

Plain Text
RPM
Carga
Temperatura
Altitude
Eu faria diferente

Não calibraria ηv.

Calibraria apenas:

Plain Text
fuelCorrectionFactor

global.

Exemplo

App estimou:

Plain Text
37 litros

Bomba mostrou:

Plain Text
40 litros

Então:

Plain Text
40 / 37
=
1.081

Aplicar:

Plain Text
fuelCorrectionFactor = 1.081
Vantagem

Não mexe na física.

Não distorce VE.

Mantém estabilidade.

Armadilhas reais
Partida fria

AFR extremamente rico.

Especialmente etanol.

Open Loop

Plena carga.

Mistura mais rica.

Gargalo de tanque

Abastecimento não é repetível.

40L hoje

↓

39.5L amanhã

mesmo nível.

Temperatura do combustível

Pequena influência.

Pode ignorar.

Ponto mais importante

Faça calibração somente quando:

Plain Text
abastecimento > 15L

Senão o ruído domina.

4. SQLite ou IndexedDB

Resposta curta:

Plain Text
SQLite

sem dúvidas.

SQLite

Vantagens:

Plain Text
Persistência real
Queries robustas
Backup/export fácil
Grande volume
Índices
IndexedDB

Serve para:

Plain Text
PWA simples
Cache local
Seu caso

Você terá:

Plain Text
Trips
Waypoints
Telemetria
Abastecimentos
POIs
Configuração

Isso é banco relacional.

Estrutura sugerida
SQL
Trip
-----
id
start_time
end_time
route_id
distance_km
fuel_l
cost_rs
ecoscore
SQL
Telemetry
---------
id
trip_id
timestamp
rpm
speed
map
iat
fuel_rate
lat
lng
SQL
Fueling
--------
id
date
odometer
liters
price
SQL
POI
----
id
name
lat
lng
radius
5. Melhorias que eu adicionaria
A. State Machine Explícita

Criaria estados formais.

Plain Text
IDLE
SCANNING
CONNECTING
CONNECTED
TRIP_ACTIVE
PARKED
SYNCING
SLEEP

Evita bugs difíceis.

B. Confidence Score de Rota

Em vez de:

Plain Text
Casa -> Tetra Pak

cravar imediatamente.

Guardar:

Plain Text
92% confiança
C. Auto Learning

Após 30 dias:

Plain Text
Novo POI detectado

Sugere:

Plain Text
"Você visita este local com frequência.
Deseja cadastrá-lo?"
D. Event Sourcing

Guardar eventos.

Exemplo:

Plain Text
ENGINE_ON
ENGINE_OFF
FUEL_ADDED
ARRIVED_POI
LEFT_POI
BT_CONNECTED

Em vez de somente estados finais.

Facilita auditoria.

E. Persistência Diferenciada

Não grave telemetria a 1 Hz indefinidamente.

Sugestão:

Movimento
Plain Text
1 Hz
Velocidade constante
Plain Text
5 s
Parado
Plain Text
30 s

Reduz banco e bateria drasticamente.

Arquitetura Final que eu aprovaria
Plain Text
BT Car Connected
        ↓
Foreground Service
        ↓
Connect ELM327
        ↓
Trip State Machine
        ↓
Adaptive GPS
        ↓
POI Detection
        ↓
Trip Classification
        ↓
SQLite Storage
        ↓
Consumption Engine
        ↓
Closed Loop Fuel Correction
        ↓
Daily Insights

Parecer final: eu aprovaria essa especificação para implementação. O maior ajuste que faria é substituir a recalibração direta da eficiência volumétrica (ηv) por um fator global de correção de combustível, adotar SQLite como armazenamento principal, e construir toda a lógica em torno de uma máquina de estados explícita, pois ela será determinante para a confiabilidade do modo "Zero Fricção". Isso deixa o sistema simples, robusto e compatível com a realidade do Android moderno.