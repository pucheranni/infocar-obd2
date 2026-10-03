# 📌 Estado Atual do Projeto e Próximos Passos

> **Documento de passagem de turno / transição de sessão**  
> Data: 03/10/2026  
> Veículos-alvo: **Renault Clio 1.0 16V 2011** (usuário) e **Renault Clio 1.0 16V 2005** (irmão).  
> Adaptador atual: **ELM327 "Mini" azul (~R$ 30)**.

---

## 1. Resumo da Situação Atual

### 1.1. Sobre o Adaptador ELM327 Azul de R$ 30
* **Tipo de Comunicação:** É quase 100% certo que seja **Bluetooth Classic (SPP - Serial Port Profile)** com microcontrolador clone (geralmente rotulado como firmware v2.1).
* **Limitação Técnica Crítica:** Os navegadores modernos (Google Chrome / Edge) no Android suportam apenas a **Web Bluetooth API (BLE - Bluetooth Low Energy 4.0/5.0)**. O Chrome **NÃO tem acesso a Bluetooth Classic (SPP)**.
* **O que isso significa:**
  1. O app web AutoPulse OBD2 (PWA) **não conseguirá conectar diretamente** via Bluetooth a esse adaptador azul pelo navegador.
  2. No entanto, **você NÃO precisa comprar outro adaptador agora para descobrir os dados do carro!**
  3. Você pode usar o adaptador azul imediatamente com um app de terminal serial Android gratuito para rodar o [`ROTEIRO_DESCOBERTA.md`](ROTEIRO_DESCOBERTA.md) nos dois carros. Isso nos dará os dados reais (protocolo, PIDs suportados e DTCs).

### 1.2. Opções de Hardware Futuras para Usar o AutoPulse OBD2 no Carro
Quando quiser rodar o AutoPulse OBD2 diretamente no painel do carro:
1. **Opção Recomendada (Mais estável e rápida):** Adquirir um adaptador **ELM327 Wi-Fi** (que cria uma rede Wi-Fi própria, ex: `WiFi_OBDII`) ou **ELM327 BLE 4.0/5.0** (como Vgate iCar Pro BLE ou Veepeak).
   - O adaptador Wi-Fi conecta perfeitamente através da ponte TCP do nosso `server.py` que já está pronta.
   - O adaptador BLE conecta direto pelo botão do navegador Chrome sem precisar de nada extra.
2. **Opção Cabo USB OTG:** Usar um cabo OBD2 USB com adaptador OTG no celular (suportado via Web Serial).

---

## 2. O que Foi Corrigido e Implementado Nesta Sessão

Todas as correções prioritárias que não dependiam do hardware já foram aplicadas diretamente nos arquivos do projeto:

| Arquivo Modificado | Melhorias e Correções Aplicadas |
| :--- | :--- |
| [`js/obd/elm327.js`](../js/obd/elm327.js) | • **Bug A1 Corrigido:** Decodificação de DTC em CAN agora pula o byte de contagem (`43 NN ...`) e descarta marcadores multi-frame (`0:`, `1:`).<br>• **Perfis Limpos:** Perfis K-Line simplificados sem `0x11` arbitrário e sem comandos conflitantes (`ATSW00`/`ATWM`).<br>• **Timeout Seguro:** Primeiro comando `0100` com timeout de 8 segundos (tempo necessário para a K-Line despertar a ECU).<br>• **Desconexão Segura:** Encerra qualquer sessão/simulador anterior antes de abrir nova conexão. |
| [`js/obd/simulator.js`](../js/obd/simulator.js) | • Simulador atualizado para emitir o byte de contagem no Mode 03 e Mode 07 (comportamento idêntico a uma ECU real em CAN). |
| [`js/trip.js`](../js/trip.js) | • **Bug B1 Corrigido:** Distância e combustível integrados pelo **tempo real decorrido (`dt`)**, não mais por contagem fixa de callbacks.<br>• **Bug B2 Corrigido:** Acelerações bruscas agora avaliadas entre variações reais de velocidade, eliminando falsos positivos no Eco-Score.<br>• **Calibração Brasileira:** Relação ar/combustível da gasolina ajustada para **13.3:1** (gasolina brasileira com 27% etanol) e densidade para 745 g/L. |
| [`server.py`](../server.py) | • **Segurança C2:** Bind restrito por padrão a `127.0.0.1` (flag `--lan` opcional para liberar rede).<br>• Servidor multi-thread (`ThreadingHTTPServer`).<br>• Remoção do cabeçalho vulnerável `Access-Control-Allow-Origin: *`.<br>• Exigência do cabeçalho customizado `X-AutoPulse` contra ataques CSRF e validação de Host contra DNS-rebinding.<br>• Endpoint `/api/connect` restrito exclusivamente a endereços IP privados. |
| [`js/obd/transports/http-bridge.js`](../js/obd/transports/http-bridge.js) | • Envia o cabeçalho `X-AutoPulse`.<br>• Passa a respeitar o endereço IP e porta digitados pelo usuário na tela de Ajustes. |
| [`js/app.js`](../js/app.js) | • **Bug D1 Corrigido:** Removida a conexão automática no simulador. O app agora inicia limpo e desconectado.<br>• **Wake Lock Ativo:** Mantém a tela do celular ligada enquanto conectado para evitar que o Android mate os timers em segundo plano.<br>• **Persistência Completa:** Tipo de conexão, perfil do veículo, tipo e preço do combustível e taxa de atualização são salvos automaticamente no `localStorage`. |
| [`sw.js`](../sw.js) | • **Bug D3 Corrigido:** Service worker versionado (`autopulse-obd2-v2`) com estratégia **Rede-Primeiro (Network-First)**, garantindo que alterações no código entrem em vigor sem precisar limpar cache manualmente. |
| [`manifest.json`](../manifest.json) | • Removidas referências a arquivos PNG que não existiam, mantendo o ícone vetorial SVG. |
| [`index.html`](../index.html) | • Seletor de perfis atualizado com **Detecção Automática (Recomendada)** como padrão inicial. |
| [`README.md`](../README.md) | • Atualizado com alerta no topo esclarecendo o status do projeto e as necessidades de validação prática. |
| [`package.json`](../package.json) | • Criado com suporte a ES Modules e script de teste nativo (`node --test`). |
| [`tests/parser.test.js`](../tests/parser.test.js) | • Primeira suíte completa de testes automatizados unitários cobrindo decodificação de DTCs (CAN, K-Line, multi-frame, pendentes), remontagem de VIN e cálculo temporal da viagem. |
| [`docs/PLANO_DE_MELHORIA.md`](PLANO_DE_MELHORIA.md) | • Cópia integral do plano de melhoria com os 24 achados técnicos, metas mensuráveis, especificação de UX e roadmap faseado. |
| [`docs/ROTEIRO_DESCOBERTA.md`](ROTEIRO_DESCOBERTA.md) | • Roteiro prático passo a passo para testar os dois Clios com o adaptador azul via terminal Bluetooth Classic. |

---

## 3. O que Fazer Antes de Sair / Na Próxima Sessão

### Passo 1: Executar o Roteiro de Descoberta nos Carros
Siga o arquivo [`ROTEIRO_DESCOBERTA.md`](ROTEIRO_DESCOBERTA.md):
1. Instale o app **Serial Bluetooth Terminal** no celular Android.
2. Conecte o adaptador azul no **Clio 2011** com a chave na ignição (motor desligado).
3. Envie os blocos de comandos (`ATZ`, `ATSP0`, `0100`, `ATDP`, `010C`, etc.) e salve o log.
4. Repita o mesmo procedimento no **Clio 2005** do seu irmão.
5. Salve os textos de resposta de cada carro.

### Passo 2: Se Quiser Rodar o Servidor no Termux
No aplicativo Termux:
```bash
cd ~/infocar-obd2
python server.py
```
Abra o navegador no celular em `http://localhost:8080`.
*(Para permitir que outro aparelho na mesma rede Wi-Fi acesse, use: `python server.py --lan`)*

### Passo 3: Executar a Suíte de Testes (Assim que liberar o shell)
Se o Node.js estiver instalado no Termux (`pkg install nodejs`):
```bash
cd ~/infocar-obd2
npm test
```
Isso validará o parser de DTCs, VIN e o módulo de consumo.

---

*Todos os arquivos, planos e documentações foram preservados dentro do diretório do projeto `~/infocar-obd2`.*
