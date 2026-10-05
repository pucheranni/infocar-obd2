# 🚗 AutoPulse OBD2 (Infocar Style) & Projeto Renault Clio (2005 & 2011)

> **Plataforma Open-Source de Telemetria Automotiva, Diagnóstico de Injeção Eletrônica (ECU) e Computador de Bordo Especializado para Renault Clio II (2005 / K-Line) e Renault Clio (2011 / CAN Bus).**  
> Disponível como **Aplicativo Android Nativo (APK)** via Capacitor e **Progressive Web App (PWA)** de alta performance executável via Termux / Chrome.

[![Android Release](https://img.shields.io/badge/Release-v0.3.0-blue.svg)](https://github.com/pucheranni/infocar-obd2/releases/tag/v0.3.0)
[![Build Status](https://img.shields.io/badge/Android%20APK-Passing-success.svg)](https://github.com/pucheranni/infocar-obd2/actions)
[![Unit Tests](https://img.shields.io/badge/Tests-27%2F27%20Passing-brightgreen.svg)](tests/parser.test.js)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.5.2-blueviolet.svg)](package.json)
[![Android SDK](https://img.shields.io/badge/CompileSdk-35%20(Android%2015)-orange.svg)](android/gradle.properties)

---

> [!NOTE]
> ### 🚀 Estado Atual do Projeto (`v0.3.0` — AutoPulse Copilot)
> 
> O projeto foi promovido de um scanner telemático para o **AutoPulse Copilot**, um **Agente Autônomo de Gestão Veicular** com 5 fases de arquitetura validadas formalmente pelo **GPT-Sol** (Microsoft 365 Copilot corporativo via automação CDP na porta 9222):
> 
> 1. **Need for Speed Shift Coach ([`shift-coach.js`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/js/obd/shift-coach.js)):** Barra visual inspirada em simuladores com zonas calibradas para o motor Renault Clio 1.0 16V D4D (Eco 1800–2600 RPM, Power 3800–4700 RPM, Redline >5800 RPM), filtro passa-baixa EMA ($\alpha=0.15$) e histerese visual de $\pm 75\text{ RPM}$ para evitar oscilações em fronteiras.
> 2. **One-Tap Refueling & Calibração Adaptativa em Malha Fechada ([`trip.js`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/js/trip.js)):** Modal rápido de registro de combustível (presets de 40L, 35L, 20L, Custom, Etanol R$ 3,50, Gasolina R$ 5,89). Calibra o fator de injeção $\text{FCF}$ de forma adaptativa apenas quando o tanque for completado ($\ge 15\text{L}$), mantendo intacta a eficiência volumétrica $\eta_v$.
> 3. **Geofencing Semântico & POIs Campinas ([`poi-manager.js`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/js/routes/poi-manager.js)):** Detecção automática de origem e destino dentro do conjunto finito de rotas do usuário (Casa Chapadão, A2Z Valinhos, Tetra Pak Monte Mor, Unicamp Barão Geraldo, Super Texas Carnes SP e Mauá) usando fórmula de Haversine pura e Last Known Good Position (LKGP 120s móvel / 300s parado).
> 4. **Máquina de Estados Finita (FSM) & Anti-Stall ([`state-machine.js`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/js/obd/state-machine.js)):** Ciclo de vida robusto (`IDLE_STANDBY` $\rightarrow$ `CONNECTING` $\rightarrow$ `CONNECTED` $\rightarrow$ `TRIP_ACTIVE` $\rightarrow$ `PARKED_CONSOLIDATING` $\rightarrow$ `SLEEP`). Debounce de 60s em parada para impedir encerramento falso em semáforos e amostragem adaptativa (200ms em aceleração dinâmica, 3s em cruzeiro, 30s em repouso).
> 5. **Permissões Android 14/15 ([`AndroidManifest.xml`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/android/app/src/main/AndroidManifest.xml)):** Declaração de `foregroundServiceType="connectedDevice|location"`, garantindo que o rastreamento veicular e a comunicação Bluetooth Classic nunca sejam encerrados pelo sistema operacional.
> 6. **Persistência Relacional & Exportação Assíncrona ([`storage-manager.js`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/js/db/storage-manager.js)):** Estrutura SQLite / IndexedDB com índices compostos por corredor (`route_corridor, direction`), cálculo analítico de custo e consumo médio por trajeto e download assíncrono em CSV e JSON sem travar a interface.
> 7. **27 Testes Automatizados:** Suíte 100% verde cobrindo decodificação CAN/K-Line, filtros, calibração, rotas, FSM e banco relacional.

📖 **Documentação Complementar de Engenharia:**
- [Plano de Execução Completo com Prompts do GPT-Sol](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/docs/PLANO_EXECUCAO_COPILOT_SOL.md)
- [Dossiê Arquitetural do Agente de Gestão Veicular](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/docs/AGENTE_GESTAO_VEICULAR.md)
- [Relatório Consolidado de Execução das 5 Fases](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/docs/ANALISE_GPT_SOL_AGENTE.md)

---

## 📑 Sumário

1. [Visão Geral & Contexto do Projeto](#1-visão-geral--contexto-do-projeto)
2. [Benchmark & Análise Comparativa de Projetos Open-Source](#2-benchmark--análise-comparativa-de-projetos-open-source)
3. [Dossiê Técnico: Renault Clio 2005 (K-Line) vs Renault Clio 2011 (CAN Bus)](#3-dossiê-técnico-renault-clio-2005-k-line-vs-renault-clio-2011-can-bus)
4. [Arquitetura do Sistema](#4-arquitetura-do-sistema)
5. [Architecture Decision Records (ADRs)](#5-architecture-decision-records-adrs)
   - [ADR-001: PWA Web-First + Local Termux Python Bridge](#adr-001-pwa-web-first--local-termux-python-bridge)
   - [ADR-002: Motor de Perfis de Protocolo Dinâmico (Clio 2005 K-Line vs Clio 2011 CAN)](#adr-002-motor-de-perfis-de-protocolo-dinâmico-clio-2005-k-line-vs-clio-2011-can)
   - [ADR-003: Compatibilidade de Hardware ELM327 & Mitigação de Clones](#adr-003-compatibilidade-de-hardware-elm327--mitigação-de-clones)
   - [ADR-004: Diagnóstico DTC com Dicionário Offline em Português](#adr-004-diagnóstico-dtc-com-dicionário-offline-em-português)
   - [ADR-005: Fila Assíncrona, Polling Prioritário & Watchdog K-Line](#adr-005-fila-assíncrona-polling-prioritário--watchdog-k-line)
   - [ADR-006: Telemetria Flex-Fuel & Cálculo Speed-Density (MAP + IAT)](#adr-006-telemetria-flex-fuel--cálculo-speed-density-map--iat)
   - [ADR-007: Head-Up Display (HUD) Noturno com Inversão Óptica](#adr-007-head-up-display-hud-noturno-com-inversão-óptica)
   - [ADR-008: Empacotamento Android Nativo (Capacitor) para Suporte a Bluetooth Classic](#adr-008-empacotamento-android-nativo-capacitor-para-suporte-a-bluetooth-classic)
   - [ADR-009: Decodificação de Bitmask PID 0100 e Blindagem contra Dropouts Transitórios](#adr-009-decodificação-de-bitmask-pid-0100-e-blindagem-contra-dropouts-transitórios)
   - [ADR-010: Shift Coach & Need for Speed RPM Sweet Spot](#adr-010-shift-coach--need-for-speed-rpm-sweet-spot)
   - [ADR-011: Abastecimento One-Tap e Calibração Adaptativa em Malha Fechada](#adr-011-abastecimento-one-tap-e-calibração-adaptativa-em-malha-fechada)
   - [ADR-012: Geofencing Semântico e POIs com Haversine & LKGP](#adr-012-geofencing-semântico-e-pois-com-haversine--lkgp)
   - [ADR-013: FSM Veicular com Anti-Stall e Foreground Service Android 14/15](#adr-013-fsm-veicular-com-anti-stall-e-foreground-service-android-1415)
   - [ADR-014: Persistência Relacional SQLite / IndexedDB e Análise por Corredor](#adr-014-persistência-relacional-sqlite--indexeddb-e-análise-por-corredor)
6. [Plano de Implementação Faseado (Roadmap)](#6-plano-de-implementação-faseado-roadmap)
7. [Suíte de Testes Automatizados (27 Testes)](#7-suíte-de-testes-automatizados-27-testes)
8. [Guia de Operação e Instalação Prática](#8-guia-de-operação-e-instalação-prática)
   - [Opção A: Instalação via APK Direto (Recomendada para Bluetooth Classic)](#opção-a-instalação-via-apk-direto-recomendada-para-bluetooth-classic)
   - [Opção B: Execução via Termux (PWA / Adaptadores Wi-Fi ou BLE)](#opção-b-execução-via-termux-pwa--adaptadores-wi-fi-ou-ble)
   - [Diagnóstico Rápido no Terminal Interativo](#diagnóstico-rápido-no-terminal-interativo)
9. [Estrutura do Repositório](#9-estrutura-do-repositório)

---

## 1. Visão Geral & Contexto do Projeto

Proprietários de veículos da linha **Renault Clio** enfrentam desafios conhecidos ao utilizar aplicativos universais (como versões genéricas do Torque ou Car Scanner) conectados a adaptadores de baixo custo:
- `BUS INIT: ERROR` ou `UNABLE TO CONNECT` recorrente no **Clio 2005 (K-Line)**;
- Desconexão ou congelamento da leitura após poucos segundos;
- Falha na leitura de temperatura da água ou sonda lambda por dropouts transitórios de dados;
- Medição incorreta de consumo em motores **Hi-Flex** nacionais por falta de sensor MAF e variação da mistura Etanol/Gasolina.

O **AutoPulse OBD2** foi construído como uma plataforma especializada para eliminar esses problemas:
1. **Multiplataforma:** Distribuído tanto como **APK Android Nativo** compilado via GitHub Actions quanto como **PWA** executável via Termux.
2. **Motor de Protocolos e Bitmasking Inteligente:** Identifica automaticamente os PIDs suportados pela ECU pelo mapa de bits do PID `0100`, ignorando timeouts espúrios.
3. **Consumo Físico Speed-Density:** Implementa cálculo estequiométrico preciso utilizando pressão absoluta no coletor (MAP) e temperatura de admissão (IAT) calibrado para motores D4D e K4M.
4. **Cockpit Moderno Inspirado no Infocar:** Gauges circulares SVG de alta fidelidade, cards de consumo médio e instantâneo, pontuação de Eco-Driving, scanner DTC offline e modo HUD espelhado.

---

## 2. Benchmark & Análise Comparativa de Projetos Open-Source

| Projeto GitHub | Tecnologias | Pontos Fortes | Limitações Identificadas | Aplicação no AutoPulse |
| :--- | :--- | :--- | :--- | :--- |
| **[cedricp/ddt4all](https://github.com/cedricp/ddt4all)** | Python, PyQt, ELM327 | Acesso profundo a parâmetros Renault (UCH, Airbag, Injeção) via DDT2000. | Interface desktop pesada, risco de gravação indevida de módulos. | Mapeamento de endereçamentos e cabeçalhos Renault (`ATSH8111F1` e `ATSH7E0`). |
| **[PyRen](https://gitlab.com/pyren/pyren)** | Python, ELM327 | Reimplementação leve do Renault Clip; robusto suporte K-Line. | Linha de comando pura, difícil de operar no celular em condução. | Handshake do protocolo KWP2000 Fast Init e parâmetros keep-alive. |
| **[brendan-w/python-OBD](https://github.com/brendan-w/python-OBD)** | Python | Polling assíncrono, decodificadores de PIDs universais e fila de comandos. | Sem interface gráfica nativa para dispositivos móveis. | Estrutura de fila de comandos, tratamento de timeouts e tabela de conversão física. |
| **[rpwalsh/onboarddiagnosticstool](https://github.com/rpwalsh/onboarddiagnosticstool)** | TypeScript, Web Bluetooth | Comunicação direta pelo navegador via BLE sem dependências nativas. | Não suporta Bluetooth Classic (SPP) nem adaptadores Wi-Fi locais. | Stream assíncrono de buffers seriais e detecção segura do prompt `>`. |

---

## 3. Dossiê Técnico: Renault Clio 2005 (K-Line) vs Renault Clio 2011 (CAN Bus)

A frota nacional do Renault Clio passou por uma transição eletroeletrônica marcante:

### 3.1. Renault Clio 2005 (Clio II Fase 2)
* **Topologia:** **K-Line Física (Pino 7 do DLC)**. Sem barramento CAN na tomada de injeção.
* **Centrais (ECUs) Típicas:** Magneti Marelli IAW 5NR / 5NP, Siemens SIM32 ou Sirius 32/34.
* **Protocolo:** **ISO 14230-4 KWP (Keyword Protocol 2000)** em Fast Init (fallback em 5 bauds).
* **Particularidades Críticas:**
  - Varredura universal (`ATSP0`) costuma esgotar o tempo limite antes de atingir a K-Line;
  - Requer watchdog periódico (`3E 00` / *TesterPresent*) para evitar encerramento de sessão KWP após ~5 segundos de inatividade;
  - Exige microcontrolador genuíno **PIC18F25K80** para geração do pulso de inicialização (25ms low / 25ms high).

### 3.2. Renault Clio 2011 (Clio II Campus / Fase 3)
* **Topologia:** **CAN Bus de Alta Velocidade (Pinos 6 CAN-H e 14 CAN-L)** a 500 kbps (11-bit ID).
* **Centrais (ECUs) Típicas:** Continental SIM32 ou Valeo V42.
* **Protocolo:** **ISO 15765-4 CAN 11/500** (`ATSP6`).
* **Particularidades Críticas:**
  - Respostas com latência inferior a 15ms por requisição;
  - Cabeçalho de envio `7E0` (`ATSH7E0`), resposta da injeção em `7E8`;
  - Ausência de sensor MAF: alimentação de ar calculada via **Speed-Density** (PIDs `010B` MAP e `010F` IAT).

### 3.3. Comparativo da Pinagem do Conector OBD-II (DLC)

```
        _________________________________
       /  1   2   3   4   5   6   7   8  \
      /                                   \
     /    9  10  11  12  13  14  15  16    \
    /_______________________________________\
```

| Pino | Função Padrão | Renault Clio 2005 | Renault Clio 2011 |
| :---: | :--- | :--- | :--- |
| **4 / 5** | Terra do Chassi / Terra do Sinal | Conectado (Terra) | Conectado (Terra) |
| **6** | CAN High (ISO 15765-4) | Ausente/Inativo na Injeção | **Ativo (CAN-H 500k)** |
| **7** | **K-Line (ISO 9141-2 / ISO 14230-4)** | **Ativo Primário (Injeção)** | Secundário / Diagnóstico Auxiliar |
| **14** | CAN Low (ISO 15765-4) | Ausente/Inativo na Injeção | **Ativo (CAN-L 500k)** |
| **16** | Tensão Positiva da Bateria (+12V permanente) | Conectado (+12V) | Conectado (+12V) |

---

## 4. Arquitetura do Sistema

```mermaid
flowchart TD
    subgraph BuildEnv["Ambiente de Distribuição & CI/CD"]
        GHA["GitHub Actions (build-apk.yml)"] -->|Compilação Gradle / JDK 21| APK["AutoPulse-OBD2.apk (v0.2.1-beta)"]
    end

    subgraph Dispositivo["Dispositivo Android / Smartphone"]
        subgraph NativeCore["Camada de Execução"]
            Capacitor["Capacitor 8 Android Wrapper"]
            Browser["Navegador Chrome / Termux PWA"]
        end

        subgraph AppFrontend["Frontend SPA / Web App"]
            UI["Cockpit & Gauges SVG / HUD / DTC"]
            Trip["TripComputer (Speed-Density, Consumo, Eco-Score)"]
            Driver["ELM327Client (Queue, Bitmask 0100, Dropout Shield)"]
            Profiles["Vehicle Profiles Engine (Auto / Clio 2011 / Clio 2005)"]
            SW["Service Worker (Network-First v2)"]
        end

        subgraph TransportLayer["Camada de Transporte Polimórfica"]
            T_BTClassic["Bluetooth Classic / SPP (Capacitor Nativo)"]
            T_BLE["BLETransport (Web Bluetooth API)"]
            T_Serial["SerialTransport (Web Serial USB OTG)"]
            T_HTTP["HTTPBridgeTransport (Python Socket Server)"]
            T_Sim["VirtualECU (Simulador Local)"]
        end

        subgraph MicroServer["Servidor Local Termux (Opcional)"]
            PyServer["server.py (Multi-Threaded HTTP + TCP Bridge)"]
        end
    end

    subgraph AutoHW["Hardware Automotivo"]
        ELM_BT["Adaptador ELM327 Bluetooth Classic / BLE"]
        ELM_WIFI["Adaptador ELM327 Wi-Fi"]
        ELM_USB["Adaptador ELM327 USB OTG"]
        ECU_05["Renault Clio 2005 (K-Line Pino 7)"]
        ECU_11["Renault Clio 2011 (CAN Pinos 6/14)"]
    end

    APK --> Capacitor
    Capacitor --> AppFrontend
    Browser --> AppFrontend

    UI --> Driver
    Driver --> Profiles
    Driver --> Trip
    Driver --> TransportLayer

    T_BTClassic --> ELM_BT
    T_BLE --> ELM_BT
    T_Serial --> ELM_USB
    T_HTTP --> PyServer
    PyServer --> ELM_WIFI

    ELM_BT -. KWP2000 .-> ECU_05
    ELM_BT -. CAN Bus .-> ECU_11
    ELM_WIFI -. CAN Bus .-> ECU_11
```

---

## 5. Architecture Decision Records (ADRs)

### ADR-001: PWA Web-First + Local Termux Python Bridge
* **Status:** Aceito e Implementado.
* **Decisão:** Construir a base como Progressive Web App (HTML5/CSS3/ES Modules) operável via navegador ou microservidor local Termux (`server.py`).
* **Consequências:** Agilidade de desenvolvimento, operação offline e portabilidade universal.

### ADR-002: Motor de Perfis de Protocolo Dinâmico
* **Status:** Aceito e Implementado.
* **Decisão:** Perfis dedicados para `clio2011_can` (`ATSP6`, `ATSH7E0`, `ATCAF1`, `ATAT1`), `clio2005_fast` (`ATSP5`, `ATSH8111F1`) e modo padrão `auto` (`ATSP0`).

### ADR-003: Compatibilidade de Hardware ELM327 & Mitigação de Clones
* **Status:** Aceito e Implementado.
* **Decisão:** Tolerância com comandos de inicialização brandos para clones v2.1 em CAN e recomendação do chip PIC18F25K80 para K-Line.

### ADR-004: Diagnóstico DTC com Dicionário Offline em Português
* **Status:** Aceito e Implementado.
* **Decisão:** Decodificador de modos 03 e 07 com banco embarcado [`dtc-db.js`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/js/obd/dtc-db.js) com severidade e causas prováveis para mecânica Renault.

### ADR-005: Fila Assíncrona, Polling Prioritário & Watchdog K-Line
* **Status:** Aceito e Implementado.
* **Decisão:** Fila não bloqueante de promessas com prioridade para RPM/Velocidade e envio automático de `3E 00` (*TesterPresent*) para manter sessões KWP ativas.

### ADR-006: Telemetria Flex-Fuel & Cálculo Speed-Density (MAP + IAT)
* **Status:** Aceito e Implementado.
* **Contexto:** Motores Renault Hi-Flex 1.0 16V (D4D) e 1.6 16V (K4M) não possuem sensor de massa de ar (MAF), inviabilizando fórmulas tradicionais.
* **Decisão:** Implementar modelo Speed-Density no [`TripComputer`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/js/trip.js#L75):
  $$\dot{m}_{\text{ar}} = \frac{\text{MAP} \times V_d \times \eta_v}{R_{\text{ar}} \times T_{\text{IAT}}} \times \left(\frac{\text{RPM}}{120}\right)$$
  - Gasolina nacional (E27): AFR 13.2:1, densidade 745 g/L;
  - Etanol hidratado (E100): AFR 9.0:1, densidade 790 g/L;
  - Proteção contra motor desligado ($\text{RPM} < 300$).

### ADR-007: Head-Up Display (HUD) Noturno com Inversão Óptica
* **Status:** Aceito e Implementado.
* **Decisão:** Modo HUD com inversão geométrica horizontal (`transform: scaleX(-1)`) e contraste elevado para reflexão no para-brisa.

### ADR-008: Empacotamento Android Nativo (Capacitor) para Suporte a Bluetooth Classic
* **Status:** Aceito e Implementado.
* **Contexto:** A Web Bluetooth API restringe-se exclusivamente a dispositivos BLE, impedindo conexão direta do navegador com o adaptador azul ELM327 Bluetooth Classic (SPP).
* **Decisão:** Adicionar invólucro Android nativo utilizando Capacitor 8 (`@capacitor/android` v8.5.2) e pipeline de build automatizado via GitHub Actions com compilação direta para SDK 35 (`compileSdkVersion = 35`).
* **Consequências:** O usuário pode instalar diretamente o arquivo `app-debug.apk` e usufruir de conexão Bluetooth Classic sem limitações do navegador.

### ADR-009: Decodificação de Bitmask PID 0100 e Blindagem contra Dropouts Transitórios
* **Status:** Aceito e Implementado.
* **Contexto:** Respostas ocasionais de `NO DATA` em barramentos CAN ou K-Line causavam o descarte prematuro de PIDs essenciais (como temperatura do arrefecimento `0105` ou sensor MAP `010B`).
* **Decisão:** Implementar a decodificação da máscara de bits de 32 bits retornada pelo comando `0100` (`parseSupportedPIDs`). PIDs presentes nessa máscara são registrados em `ecuSupportedPids` e ficam imunes ao descarte em `unsupportedPids`.

### ADR-010: Shift Coach & Need for Speed RPM Sweet Spot
* **Status:** Aceito e Implementado (Fase 1 Copilot).
* **Contexto:** Manter o motorista na faixa ideal de torque sem desviar a atenção da condução.
* **Decisão:** Implementar módulo [`ShiftCoach`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/js/obd/shift-coach.js) com zonas calibradas para Renault D4D 1.0 16V (Eco 1800-2600, Power 3800-4700, Redline >5800), suavização com filtro EMA ($\alpha=0.15$) e histerese visual de $\pm 75\text{ RPM}$.

### ADR-011: Abastecimento One-Tap e Calibração Adaptativa em Malha Fechada
* **Status:** Aceito e Implementado (Fase 2 Copilot).
* **Contexto:** Incertezas estequiométricas em combustíveis brasileiros (E27 vs E100) e desgaste de bicos injetores exigem correção empírica contínua.
* **Decisão:** Modal de abastecimento rápido (presets de 40L, 35L, 20L, Custom) associado ao cálculo adaptativo: apenas abastecimentos de tanque cheio com $\ge 15\text{L}$ recalibram o fator de injeção $\text{FCF}$ com amortecimento adaptativo ponderado (peso 0.15 para desvio >8%, 0.10 caso contrário). Abastecimentos parciais registram apenas o custo financeiro.

### ADR-012: Geofencing Semântico e POIs com Haversine & LKGP
* **Status:** Aceito e Implementado (Fase 3 Copilot).
* **Contexto:** Reconhecer automaticamente trajetos habituais (Casa, Trabalho Tetra Pak, A2Z, Unicamp, Texas Carnes SP e Mauá) sem sobrecarregar a bateria com serviços pesados de geofencing externo.
* **Decisão:** Motor [`POIManager`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/js/routes/poi-manager.js) com Haversine esférico puro em memória, raios calibrados por POI (120m a 400m) e algoritmo de *Last Known Good Position* (LKGP: tolerância de 120s em movimento e 300s parado). Chegada confirmada após 180s parado dentro do raio do destino com $\text{RPM} = 0$.

### ADR-013: FSM Veicular com Anti-Stall e Foreground Service Android 14/15
* **Status:** Aceito e Implementado (Fase 4 Copilot).
* **Contexto:** Paradas momentâneas em semáforos ou atuação de sistemas Start/Stop não podem encerrar viagens indevidamente, e o processo não pode ser morto pelo Android em segundo plano.
* **Decisão:** Máquina de estados formal [`TripStateMachine`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/js/obd/state-machine.js) (`IDLE_STANDBY` $\rightarrow$ `CONNECTING` $\rightarrow$ `CONNECTED` $\rightarrow$ `TRIP_ACTIVE` $\rightarrow$ `PARKED_CONSOLIDATING` $\rightarrow$ `SLEEP`) com debounce de 60s antes de consolidar parada, amostragem adaptativa (200ms dinâmico, 3s cruzeiro, 30s repouso) e declaração de `foregroundServiceType="connectedDevice|location"` no [`AndroidManifest.xml`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/android/app/src/main/AndroidManifest.xml).

### ADR-014: Persistência Relacional SQLite / IndexedDB e Análise por Corredor
* **Status:** Aceito e Implementado (Fase 5 Copilot).
* **Contexto:** Consultas analíticas rápidas de consumo histórico e custos por corredor de deslocamento (ex.: Casa $\leftrightarrow$ Tetra Pak) sem bloquear os 60 FPS da interface do usuário.
* **Decisão:** [`StorageManager`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/js/db/storage-manager.js) com índices compostos `(route_corridor, direction)` e `(route_corridor, start_time)`, expurgo de telemetria bruta após 30 dias e exportação assíncrona em Blobs CSV/JSON.

---

## 6. Plano de Implementação Faseado (Roadmap)

### 📌 Fases de Fundação & Plataforma (Concluídas ✅)
- [x] **Fase 1 (Handshake):** Conexão KWP2000 Fast Init e CAN Bus com watchdog K-Line.
- [x] **Fase 2 (Telemetria):** Gauges SVG, monitor de arrefecimento, tensão de bateria.
- [x] **Fase 3 (Scanner DTC):** Diagnóstico modos 03/07 e limpeza de falhas (Modo 04).
- [x] **Fase 4 (Computador de Bordo):** Cálculo Speed-Density MAP+IAT e corte de consumo fantasma.
- [x] **Fase 5 (App Android Nativo):** Capacitor 8, suporte a Bluetooth Classic SPP e layout S23.

### 📌 Fases AutoPulse Copilot — Agente de Gestão Veicular (Concluídas ✅)
- [x] **Copilot Fase 1:** Need for Speed Shift Light & Coach calibrado para Renault Clio D4D 16V.
- [x] **Copilot Fase 2:** Modal One-Tap Refueling e calibração de malha fechada adaptativa.
- [x] **Copilot Fase 3:** Geofencing semântico em Campinas/SP com LKGP e POI Manager.
- [x] **Copilot Fase 4:** Máquina de Estados Finita (FSM), amostragem adaptativa e anti-stall.
- [x] **Copilot Fase 5:** Persistência relacional SQLite/IndexedDB e exportação assíncrona em CSV.

---

## 7. Suíte de Testes Automatizados (27 Testes)

O repositório possui uma suíte de testes unitários automatizados em [`tests/parser.test.js`](file:///c:/Users/BRSOUSAG/OneDrive%20-%20Tetra%20Pak/Desktop/OBD/infocar-obd2/tests/parser.test.js) utilizando o executor nativo do Node.js (`node --test`), sem dependências pesadas externas:

```bash
npm test
```

### Resultados da Suíte (100% Passando):
```text
✔ CAN: pula o byte de contagem e decodifica dois DTCs
✔ K-Line: sem byte de contagem
✔ CAN multi-frame: ignora marcadores 0:/1: e o cabeçalho de tamanho
✔ CAN sem falhas devolve lista vazia
✔ Mode 07 usa o prefixo 47 e marca como pendente
✔ Ida e volta: simulador -> parser (CAN)
✔ VIN multi-frame do simulador é remontado
✔ Trip: distância e combustível seguem o tempo real, não o número de chamadas
✔ Trip: variação lenta de velocidade não conta como aceleração brusca
✔ Trip: aceleração real (+15 km/h em 1 s) é contada uma vez
✔ PID 0100: decodifica mapa de bits do Clio 2011 (BE 3E B8 11)
✔ ELM327: PID suportado pela ECU nunca é jogado em unsupportedPids em NO DATA transitório
✔ Trip: motor desligado (RPM < 300) zera consumo e não acumula combustível fantasma
✔ Shift Coach: mapeia zonas do Renault D4D 1.0 16V (Eco, Power, Lugging, Redline)
✔ Shift Coach: histerese +-75 RPM impede oscilação em fronteiras de rotação
✔ Trip: registerFueling com tanque cheio > 15L recalibra com amortecimento adaptativo
✔ Trip: registerFueling parcial (< 15L ou isFullTank=false) não recalibra fator físico
✔ POI: haversineDistanceKm calcula distância geodésica com precisão
✔ POI: detecta origem ao estar dentro do raio e ignora posições fora do raio
✔ POI: LKGP (Last Known Good Position) respeita janela de 120s em movimento e 300s parado
✔ POI: checkArrival detecta chegada somente após 180s parado no raio do destino com RPM=0
✔ FSM: transita de IDLE_STANDBY para CONNECTED e TRIP_ACTIVE ao ligar motor
✔ FSM: debounce de parada não encerra viagem no semáforo (anti-stall)
✔ FSM: consolida e finaliza viagem em SLEEP após tempo de permanência no POI
✔ FSM: calcula amostragem adaptativa (200ms aceleração vs 3000ms cruzeiro vs 30000ms sleep)
✔ Storage: getCorridorAnalytics agrupa e calcula médias de consumo e custo por corredor
✔ Storage: exportData gera payloads exportáveis em JSON e CSV

ℹ tests 27 | pass 27 | fail 0 | duration_ms ~390ms
```

---

## 8. Guia de Operação e Instalação Prática

### Onde fica a tomada OBD-II no Renault Clio?
Nos modelos **Clio II (2005 e 2011)**, o conector de 16 pinos localiza-se **no console central, logo abaixo do cinzeiro/porta-moedas**, à frente da alavanca de câmbio. Basta puxar a tampa plástica ou retirar o cinzeiro removível.

---

### Opção A: Instalação via APK Direto (Recomendada para Bluetooth Classic)
Ideal para uso com o adaptador mini azul ELM327 ou qualquer scanner Bluetooth clássico:
1. No smartphone Android, acesse a página de releases do projeto:
   👉 **[Download AutoPulse OBD2 APK (v0.3.0)](https://github.com/pucheranni/infocar-obd2/releases/tag/v0.3.0)**
2. Baixe o arquivo `app-debug.apk` e instale no dispositivo (autorize a instalação de fontes desconhecidas se solicitado).
3. Abra o **AutoPulse OBD2**, emparelhe seu adaptador no menu Bluetooth do Android e conecte.

---

### Opção B: Execução via Termux (PWA / Adaptadores Wi-Fi ou BLE)
Para quem prefere rodar localmente sem compilação:
1. Abra o **Termux** no Android:
   ```bash
   cd ~/infocar-obd2
   python server.py
   ```
2. Abra o Chrome no celular e acesse `http://localhost:8080`.
3. Toque no menu do Chrome e selecione **"Adicionar à tela inicial"** para instalar como PWA.

---

### Diagnóstico Rápido no Terminal Interativo
Na aba **Terminal** do aplicativo, envie comandos manuais para checar a resposta imediata da central:

| Comando | Função no Clio | Resposta Típica Esperada |
| :--- | :--- | :--- |
| `ATRV` | Mede a voltagem da bateria pelo pino 16 | `12.4V` (desligado) / `14.2V` (alternador ativo) |
| `ATDP` | Exibe o protocolo ativo | `ISO 15765-4 (CAN 11/500)` ou `ISO 14230-4 KWP (FAST)` |
| `0100` | Mapa de bits de PIDs suportados | `41 00 BE 3E B8 11` (PIDs suportados pela ECU) |
| `010C` | Rotação do motor (RPM) | `41 0C 0B 20` (~712 RPM em marcha lenta) |
| `010B` | Pressão absoluta no coletor (MAP) | `41 0B 23` (35 kPa em marcha lenta) |
| `010F` | Temperatura do ar de admissão (IAT) | `41 0F 46` (30°C) |
| `03` | Solicita códigos de falha armazenados | `43 00` (sem falhas) ou `43 01 03 00` (ex: P0300) |
| `04` | Limpa a memória de avarias e apaga luz da injeção | `44` ou `OK` |

---

## 9. Estrutura do Repositório

```text
infocar-obd2/
├── .agents/
│   └── skills/
│       └── gpt-sol-bridge/          # Skill de assistência e diagnóstico com Microsoft Copilot (CDP 9222)
├── .github/
│   └── workflows/
│       └── build-apk.yml            # Pipeline GitHub Actions de compilação do APK e release
├── android/                         # Projeto nativo Android (Capacitor 8 / SDK 35 / Gradle)
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/main/assets/public/  # Bundle web sincronizado com o app nativo
│   ├── gradle.properties            # Definição de compileSdkVersion=35
│   └── gradlew                      # Wrapper do Gradle
├── css/
│   └── styles.css                   # Tema escuro esportivo, gauges SVG, modo HUD e safe-area dock
├── docs/
│   ├── ESTADO_E_PROXIMOS_PASSOS.md  # Resumo de engenharia e roteiro de transição
│   ├── PLANO_DE_MELHORIA.md         # Análise de 24 achados técnicos e arquitetura
│   └── ROTEIRO_DESCOBERTA.md        # Roteiro prático para testes com o adaptador azul
├── js/
│   ├── app.js                       # Controlador mestre, persistência de UI e Wake Lock
│   ├── trip.js                      # Computador de bordo, Speed-Density (MAP+IAT) e Eco-Score
│   └── obd/
│       ├── dtc-db.js                # Dicionário offline de códigos DTC em português
│       ├── elm327.js                # Driver ELM327, fila assíncrona, bitmask 0100 e recuperação
│       ├── pids.js                  # Catálogo de PIDs e fórmulas de conversão física
│       ├── simulator.js             # Simulador de ECU virtual com suporte CAN multi-frame
│       └── transports/
│           ├── ble.js               # Transporte Web Bluetooth API (BLE 4.0/5.0)
│           ├── http-bridge.js       # Transporte protegido para adaptador Wi-Fi (server.py)
│           ├── serial.js            # Transporte Web Serial (USB OTG)
│           └── websocket.js         # Transporte WebSocket para pontes remotas
├── tests/
│   └── parser.test.js               # Suíte com 13 testes automatizados (node --test)
├── capacitor.config.json            # Configuração do Capacitor (com.autopulse.obd2)
├── index.html                       # Cockpit SPA responsivo com gauges e bottom dock
├── icon.svg                         # Ícone vetorial automotivo do app
├── manifest.json                    # Manifesto PWA para instalação no Android
├── package.json                     # Scripts de teste, build e dependências Capacitor
├── server.py                        # Servidor local Python com proteção anti-CSRF e socket TCP
├── start.sh                         # Script de inicialização no Termux com termux-wake-lock
└── sw.js                            # Service Worker com estratégia Network-First v2
```

---

*AutoPulse OBD2 • Desenvolvido com foco em engenharia automotiva e telemetria precisa para Renault.*
