# 📋 Plano de Execução Faseado com Prompts GPT-Sol Integrados
## AutoPulse Copilot: Agente Interno de Gestão Veicular Inteligente

> **Documento Operacional de Engenharia & Automação com GPT-Sol**  
> **Veículo:** Renault Clio II Campus 1.0 16V Hi-Flex (D4D 760 - 2011)  
> **Estratégia:** Execução incremental em 5 Fases, onde cada fase possui seus artefatos de código, critérios de aceitação e o **prompt completo concatenado pronto para consulta e validação com o GPT-Sol** via `gpt-sol-bridge`.

---

## 🗺️ Visão Geral do Roadmap

```mermaid
flowchart LR
    Fase1["Fase 1: Cockpit NFS & Shift Light"] --> Fase2["Fase 2: Abastecimento & Calibração Fechada"]
    Fase2 --> Fase3["Fase 3: POIs Campinas/SP & Geofencing Haversine"]
    Fase3 --> Fase4["Fase 4: Máquina de Estados & Zero Fricção"]
    Fase4 --> Fase5["Fase 5: Banco SQLite & Relatórios de Custo"]
```

---

## 📌 Fase 1: Cockpit Dinâmico & Assistente "Need for Speed" (RPM Sweet Spot)

### 1.1. Objetivos Técnicos
- Implementar no cockpit ([`index.html`](../index.html) e [`css/styles.css`](../css/styles.css)) a barra dinâmica de troca de marchas (*Shift Light & Sweet Spot*) inspirada em jogos de corrida.
- Mapear faixas termodinâmicas reais do motor **Renault D4D 1.0 16V**:
  - **Sub-torque ($< 1.600 \text{ RPM}$):** Indicador cinza (evitar cabeceamento).
  - **Eco Sweet Spot ($1.800 - 2.500 \text{ RPM}$):** Glow verde neon pulsante ("ECO SHIFT") para menor consumo específico de combustível.
  - **Neutro Urbano ($2.500 - 3.800 \text{ RPM}$):** Barra ciano estável.
  - **Power Sweet Spot ($4.000 - 4.500 \text{ RPM}$):** Glow âmbar/dourado esportivo ("POWER SHIFT") na faixa de torque máximo ($10,3 \text{ kgfm}$).
  - **Redline ($> 5.800 \text{ RPM}$):** Alerta vermelho flutuante de corte.
- Adicionar histerese de 50 RPM no [`js/app.js`](../js/app.js) para evitar cintilação da interface visual.

### 1.2. Arquivos Impactados
- `index.html` (estrutura do container HUD de shift light acima dos mostradores principais)
- `css/styles.css` (animações de glow neon, gradientes esportivos e transições de cor)
- `js/app.js` (leitura de RPM em tempo real e atualização das classes CSS dinâmicas)

### 1.3. Prompt Concatenado para o GPT-Sol (Fase 1)
```bash
python .agents/skills/gpt-sol-bridge/scripts/bridge.py ask -p "Olá GPT-Sol! Estamos implementando a Fase 1 do AutoPulse Copilot: o assistente de condução visual estilo Need for Speed (RPM Sweet Spot & Shift Light) para o motor Renault Clio 1.0 16V D4D.

Queremos validar com você:
1. Mapeamento de Faixas de RPM:
   - Sub-torque: < 1.600 RPM
   - Eco Sweet Spot: 1.800 a 2.500 RPM (BSFC ótimo)
   - Transição: 2.500 a 3.800 RPM
   - Power Sweet Spot: 4.000 a 4.500 RPM (pico de torque 10.3 kgfm)
   - Redline: > 5.800 RPM
   Você sugere algum refinamento para o motor D4D 16V flex com câmbio JB1?
2. Algoritmo de Histerese Visual:
   Para que a barra não oscile de cor loucamente em rotações limítrofes (ex: 2.500 RPM cravados), recomendamos histerese de 50 RPM e filtro passa-baixa de 150ms. Está adequado para renderização a 20Hz em telas OLED/AMOLED?
3. Ergonomia do Cockpit:
   Qual a melhor prática para que esse indicador atraia a visão periférica do motorista sem exigir que ele tire os olhos da estrada durante condução noturna?" -o "docs/GPT_SOL_FASE_1_REVIEW.md"
```

---

## 📌 Fase 2: Módulo Financeiro & Auditoria de Abastecimento em Malha Fechada

### 2.1. Objetivos Técnicos
- Criar a gaveta/modal de abastecimento rápido (One-Tap Refuel) com botões de volume pré-configurados: `[20 Litros]`, `[35 Litros]`, `[40 Litros]`, `[Tanque Cheio]` e campo customizado.
- Presets de preços locais: **Etanol R$ 3,50/L** | **Gasolina R$ 5,89/L**.
- Implementar no [`js/trip.js`](../js/trip.js) a recalibração de malha fechada do `fuelCorrectionFactor` baseada nas diretrizes do GPT-Sol:
  - Gatilho restrito a abastecimentos $> 15 \text{ Litros}$;
  - Manter $\eta_v = 0.80$ intacto;
  - Aplicar filtro de amortecimento exponencial ($90\%$ histórico / $10\%$ novo tanque);
- Atualizar a suíte de testes em [`tests/parser.test.js`](../tests/parser.test.js) para cobrir o algoritmo de calibração.

### 2.2. Arquivos Impactados
- `index.html` (modal de abastecimento com atalhos de volume e combustível)
- `css/styles.css` (estilização moderna do modal e botões de toque largo)
- `js/trip.js` (método `registerFueling(liters, price, isFullTank)` e cálculo de amortecimento)
- `tests/parser.test.js` (testes automatizados de calibração)

### 2.3. Prompt Concatenado para o GPT-Sol (Fase 2)
```bash
python .agents/skills/gpt-sol-bridge/scripts/bridge.py ask -p "Olá GPT-Sol! Estamos implementando a Fase 2 do AutoPulse Copilot: a auditoria financeira de abastecimentos e calibração em malha fechada do consumo Speed-Density (MAP+IAT).

Adotamos a sua recomendação anterior de manter eta_v = 0.80 e calibrar um fator global multiplicativo 'fuelCorrectionFactor' apenas para tanques > 15 Litros.

Fórmula aplicada:
fator_instantaneo = litros_bomba / litros_integrados_app
fuelCorrectionFactor_novo = (0.90 * fuelCorrectionFactor_anterior) + (0.10 * fator_instantaneo)

Perguntas para sua validação técnica:
1. O peso 90/10 no filtro exponencial é ideal ou você recomendaria 85/15 considerando motoristas que abastecem 1 a 2 vezes por semana?
2. Em situações de abastecimento parcial (ex: o usuário colocou apenas 20L sem encher o tanque), qual a melhor heurística para calcular o desvio se ele não encheu até o clique da bomba? Devemos ignorar a calibração de malha fechada em parciais e usá-la apenas para contabilização de custo?
3. Há algum impacto quando o motorista altera de Etanol puro para Gasolina comum entre abastecimentos (mudança abrupta de AFR de 9.0 para 13.2)?" -o "docs/GPT_SOL_FASE_2_REVIEW.md"
```

---

## 📌 Fase 3: Mapeamento Semântico de POIs & Geofencing Haversine

### 3.1. Objetivos Técnicos
- Criar o catálogo `js/routes/poi-manager.js` contendo os 6 pontos de interesse reais definidos pelo usuário:
  1. `POI_CASA`: Rua Padre Camargo de Lacerda, 400 - CEP 13070-277, Campinas (Jardim Chapadão)
  2. `POI_A2E`: A2Z / Valinhos
  3. `POI_TRAPA`: Tetra Pak ("Trapa") / Monte Mor
  4. `POI_UNICAMP`: Unicamp / Barão Geraldo, Campinas
  5. `POI_TEXAS`: Super Texas Carnes / São Paulo SP
  6. `POI_FOZ_MAUA`: Rua Foz do Iguaçu / Mauá (Jardim Oratório)
- Implementar o cálculo leve de Haversine durante viagens ativas (checagem a cada 20-30s apenas quando em trânsito).
- Regra de fechamento de perna: Se distância $< 200\text{m}$ do POI por mais de 180s com $\text{RPM} = 0 \rightarrow$ Finaliza a Trip A com identificação de origem e destino (ex: `Casa ➔ Tetra Pak`).

### 3.2. Arquivos Impactados
- `js/routes/poi-manager.js` (novo módulo com coordenadas, endereços e função `matchNearestPOI(lat, lng)`)
- `js/trip.js` (integração de geolocalização e classificação de rota)
- `js/app.js` (exibição do nome da rota no cockpit em tempo real)

### 3.3. Prompt Concatenado para o GPT-Sol (Fase 3)
```bash
python .agents/skills/gpt-sol-bridge/scripts/bridge.py ask -p "Olá GPT-Sol! Estamos implementando a Fase 3 do AutoPulse Copilot: a classificação semântica automática de rotas para os 6 POIs definidos em Campinas, Valinhos, Monte Mor, Mauá e São Paulo:
- Casa (Chapadão, Campinas)
- A2Z (Valinhos)
- Tetra Pak (Monte Mor)
- Unicamp (Barão Geraldo)
- Super Texas Carnes (São Paulo)
- Rua Foz do Iguaçu (Mauá)

Adotamos a sua orientação de usar cálculo leve de Haversine durante a viagem ativa em vez de GeofencingClient pesado.

Perguntas para sua validação técnica:
1. Para lidar com sinal de GPS instável (túneis, garagens subterrâneas ou corte momentâneo de sinal), qual a tolerância de 'última coordenada válida' recomendada para não perder a detecção de chegada?
2. A janela de raio de 200 metros com threshold de 180s com motor desligado (RPM = 0) é suficiente para cobrir estacionamentos grandes como o da Tetra Pak ou Unicamp?
3. Como você recomenda estruturar a matriz de rotas bidirecionais (ex: Casa -> Trapa de manhã vs Trapa -> Casa à tarde) para geração automática de relatórios comparativos de trânsito e consumo?" -o "docs/GPT_SOL_FASE_3_REVIEW.md"
```

---

## 📌 Fase 4: Máquina de Estados Finita & Conexão "Zero Fricção"

### 4.1. Objetivos Técnicos
- Implementar o motor de estados formais `js/obd/state-machine.js`:
  `IDLE_STANDBY` ➔ `CONNECTING` ➔ `CONNECTED` ➔ `TRIP_ACTIVE` ➔ `PARKED_CONSOLIDATING` ➔ `SLEEP`.
- Configurar o gatilho de despertar pelo Bluetooth do carro (`MEDIA_BT_CAR` / `BluetoothDevice.ACTION_ACL_CONNECTED`) em conjunto com a presença do ELM327.
- Implementar amostragem adaptativa de telemetria para economia de processador e memória:
  - **Aceleração / Frenagem:** 1 Hz (1 amostra por segundo);
  - **Velocidade de Cruzeiro Estável:** 5 segundos;
  - **Marcha Lenta / Parado em Semáforo:** 30 segundos.

### 4.2. Arquivos Impactados
- `js/obd/state-machine.js` (novo módulo desacoplado de máquina de estados)
- `js/obd/elm327.js` (integração dos eventos de conexão/desconexão com a máquina de estados)
- `android/app/src/main/AndroidManifest.xml` (declaração de permissões de Bluetooth e Foreground Service)

### 4.3. Prompt Concatenado para o GPT-Sol (Fase 4)
```bash
python .agents/skills/gpt-sol-bridge/scripts/bridge.py ask -p "Olá GPT-Sol! Estamos desenvolvendo a Fase 4 do AutoPulse Copilot: a Máquina de Estados Finita formal e o módulo de Conexão Zero Fricção no Android/Capacitor.

Estrutura de estados:
IDLE_STANDBY -> CONNECTING -> CONNECTED -> TRIP_ACTIVE -> PARKED_CONSOLIDATING -> SLEEP

Amostragem adaptativa:
- Aceleração / Frenagem: 1 Hz
- Cruzeiro: 5s
- Marcha lenta / Parado: 30s

Perguntas para sua validação técnica:
1. No Android 14 e 15 (Target SDK 35), qual o 'foregroundServiceType' correto para declarar no AndroidManifest.xml para um app que gerencia OBD2 Bluetooth e dados de localização veicular (ex: connectedDevice vs location)?
2. Qual a forma mais limpa em Capacitor de registrar um BroadcastReceiver para capturar o evento 'BluetoothDevice.ACTION_ACL_CONNECTED' do som multimídia do carro e acordar o webview/serviço?
3. Na transição para PARKED_CONSOLIDATING, qual estratégia de debounce evita que o app encerre a viagem por engano se o motorista apenas desligar o carro no semáforo (sistema Start/Stop ou parada momentânea)?" -o "docs/GPT_SOL_FASE_4_REVIEW.md"
```

---

## 📌 Fase 5: Persistência Estruturada com SQLite & Relatórios de Custo

### 5.1. Objetivos Técnicos
- Integrar `@capacitor-community/sqlite` (com fallback elegante para IndexedDB no modo navegador/Termux).
- Criar migrations e schema relacional: `trips`, `telemetry_samples`, `fuelings`, `pois`.
- Criar a aba / painel executivo de **Histórico de Custos**:
  - Custo médio da viagem Casa ↔ Tetra Pak com Etanol vs Gasolina;
  - Gasto financeiro mensal consolidado (R$);
  - Desperdício acumulado em marcha lenta (semáforos de Campinas).
- Exportação completa em formato `.json` e `.csv` para auditoria pessoal.

### 5.2. Arquivos Impactados
- `js/db/sqlite-manager.js` (gerenciador de banco relacional e queries analíticas)
- `index.html` (aba dedicada "Finanças & Rotas" com gráficos e resumos)
- `package.json` (dependência `@capacitor-community/sqlite`)

### 5.3. Prompt Concatenado para o GPT-Sol (Fase 5)
```bash
python .agents/skills/gpt-sol-bridge/scripts/bridge.py ask -p "Olá GPT-Sol! Estamos implementando a Fase 5 do AutoPulse Copilot: a persistência relacional em SQLite e o motor de relatórios financeiros e de eficiência.

Schema adotado:
- trips (id, start_time, end_time, origin_poi_id, destination_poi_id, distance_km, fuel_consumed_liters, cost_reais, avg_speed, eco_score)
- telemetry_samples (id, trip_id, timestamp, rpm, speed, map_kpa, iat_celsius, instant_kml, lat, lng)
- fuelings (id, date, odometer_km, liters, price_per_liter, fuel_type, is_full_tank, applied_correction_factor)
- pois (id, name, address, latitude, longitude, radius_meters)

Perguntas para sua validação técnica:
1. Qual a melhor estratégia de indexação para permitir consultas analíticas rápidas de custo agrupadas por rota (ex: SELECT origin_poi_id, destination_poi_id, AVG(cost_reais), AVG(distance_km / fuel_consumed_liters) FROM trips GROUP BY origin_poi_id, destination_poi_id)?
2. Para evitar crescimento descontrolado da tabela 'telemetry_samples', recomenda uma política de retenção que expurga dados brutos de segundo a segundo após 30 dias mantendo apenas o resumo em 'trips'?
3. Como garantir que a exportação de dados (backup JSON/CSV) seja executada em thread secundária para não travar os gráficos SVG do painel?" -o "docs/GPT_SOL_FASE_5_REVIEW.md"
```

---

## 🛠️ Como Executar Este Plano com o GPT-Sol

Para cada fase que formos iniciar:
1. O agente executa o comando `python .agents/skills/gpt-sol-bridge/scripts/bridge.py ask` com o prompt da fase correspondente.
2. A resposta do GPT-Sol é salva no arquivo Markdown de revisão (`docs/GPT_SOL_FASE_X_REVIEW.md`).
3. O agente lê a resposta com `view_file`, incorpora os refinamentos técnicos de código e executa a implementação.
4. Roda os testes com `npm test`, valida a integridade e comita as alterações no repositório.
