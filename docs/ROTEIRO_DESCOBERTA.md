# Roteiro de Descoberta (Fase 0) — com o ELM327 azul de R$ 30

Objetivo: descobrir **o que cada Clio realmente fala** (protocolo, PIDs, DTC), usando o adaptador que você já tem.
**Somente leitura.** Nada aqui altera o carro. **Nunca envie o comando `04`** (apaga falhas).

> Este roteiro dispensa o app AutoPulse e o Termux: o adaptador azul é Bluetooth Classic, que o Chrome não acessa.

---

## 0. Preparação

1. **Carro parado**, freio de mão, em local ventilado.
2. Plugue o adaptador na tomada OBD-II do carro. *(A localização da tomada no Clio ainda precisa ser confirmada no carro.)*
3. Gire a chave para **ignição ON (motor desligado)**.
4. No Android: **Configurações → Bluetooth → parear** com o adaptador (nome tipo `OBDII`, PIN `1234` ou `0000`).
5. Instale o app **Serial Bluetooth Terminal** (Kai Morich, Play Store). Ele fala Bluetooth Classic.
   - Menu **Devices** → aba **Bluetooth Classic** → toque no adaptador para conectar.
   - **Settings → Newline: `CR`** (o ELM327 espera `\r` no fim de cada comando).
   - Se o app oferecer, ative **salvar/compartilhar log** (você vai exportar no final).
6. Anote o **modelo/ano/motor** e se o carro é **flex**.

> **Alternativa rápida:** o app **Car Scanner ELM OBD2** também funciona com Bluetooth Classic. Conecte e **tire prints** do protocolo detectado e da lista de sensores disponíveis. Ajuda, mas o log bruto abaixo é mais útil.

---

## 1. Bloco A — o adaptador sozinho

Envie um por vez e **copie a resposta**:

| Comando | Para que serve |
| :--- | :--- |
| `ATZ` | Reinicia; mostra a versão (`ELM327 v1.5` / `v2.1`) |
| `ATI` | Repete a versão |
| `AT@1` | Descrição do dispositivo |
| `ATRV` | Tensão da bateria (esperado ~12 V com motor desligado) |
| `ATE0` | Desliga o eco |

> Qualquer adaptador de R$ 30 costuma mostrar `v2.1` (clone). Isso **não** diz se o clone suporta K-Line; só o teste abaixo diz.

## 2. Bloco B — detecção automática

```
ATSP0
0100
```
Aguarde: pode aparecer `SEARCHING...` e demorar vários segundos (K-Line pode levar até ~10 s). Depois:
```
ATDP
ATDPN
```
Anote **o texto exato** das três respostas (`0100`, `ATDP`, `ATDPN`).

## 3. Bloco C — protocolos um a um

Mesmo que o automático funcione, repita para **comparar**. Para cada linha: envie `ATSPn`, depois `0100`, depois `ATDP`.

| `ATSPn` | Protocolo |
| :-: | :--- |
| `ATSP6` | CAN 11 bits / 500 kbps |
| `ATSP7` | CAN 29 bits / 500 kbps |
| `ATSP5` | ISO 14230-4 KWP, **init rápido** |
| `ATSP4` | ISO 14230-4 KWP, init lento (5 baud) |
| `ATSP3` | ISO 9141-2 |

Respostas típicas:
- `41 00 BE 3E B8 11` (ou parecido) → **a ECU respondeu**. Esse protocolo funciona.
- `UNABLE TO CONNECT` → nenhuma ECU respondeu nesse protocolo.
- `BUS INIT: ...ERROR` → falha na inicialização K-Line (pode ser clone sem suporte, ou protocolo errado).
- `CAN ERROR` → protocolo/velocidade CAN errados.
- `NO DATA` → ECU não respondeu esse PID.

## 4. Bloco D — com um protocolo funcionando

Na ordem, anote cada resposta (`NO DATA` também é informação):

**Quais PIDs a ECU suporta**
```
0100
0120
0140
0160
```

**Sensores** (um por vez)
```
0101   0104   0105   0106   0107
010B   010C   010D   010E   010F
0110   0111   0114   011F   012F
0133   0142   0146   0152
```
> Interessa muito: `010B` (MAP) e `0110` (MAF). O Clio 1.0 provavelmente usa MAP; isso define como calculamos o consumo. `0152` = teor de etanol (flex).

**Informações do veículo**
```
0902
0904
```

**Falhas armazenadas / pendentes** (somente leitura)
```
03
07
```

## 5. Bloco E — motor ligado (marcha lenta)

Ligue o motor (carro parado, câmbio em neutro, freio de mão). Envie e anote:
```
010C
010D
0105
010B
0111
```
E o **teste de manutenção da sessão (K-Line)**: envie `010C`, **espere 10 segundos sem enviar nada**, envie `010C` de novo. Anote se a segunda resposta veio normal ou com erro.

Anote também **aproximadamente quanto tempo** o primeiro `0100` levou para responder.

---

## 6. Tabela para preencher (uma por carro)

```
Carro:           Clio 1.0 16V ______ (ano) ______   flex? ___
Adaptador:       ELM327 azul, versão (ATZ): ______
Bateria (ATRV):  ______ V

Protocolo que funcionou (ATDP / ATDPN): _______________
Tempo do 1º 0100: ___ s
Protocolos testados e resultado:
  ATSP6: ___   ATSP7: ___   ATSP5: ___   ATSP4: ___   ATSP3: ___

PIDs suportados (0100/0120/0140/0160): ____________________________
Sensores:  010B(MAP)=__  0110(MAF)=__  010C=__  010D=__  0105=__  0111=__  0152=__
VIN (0902): ______   Calibração (0904): ______
DTC armazenados (03): ______    pendentes (07): ______
Sessão K-Line após 10 s parado: OK / erro ______
```

## 7. O que enviar de volta

1. **O log completo** do terminal (compartilhe/salve pelo app e cole em `docs/logs/clio-2011.txt` e `docs/logs/clio-2005.txt`).
2. A tabela acima preenchida.
3. Quaisquer prints do Car Scanner, se usou.

Com isso o próximo passo é escrever os perfis reais e o núcleo da Fase 1 em cima de **dados do carro**, não de suposição.

## 8. Como interpretar o resultado

| Resultado | O que significa | Próximo passo |
| :--- | :--- | :--- |
| Clio 2011 responde em `ATSP6` | CAN confirmado | Perfil CAN; adaptador BLE/Wi-Fi para usar o app |
| Clio 2011 responde em `ATSP5/4/3` | K-Line também em 2011 | Mesmo tratamento do 2005 |
| Clio 2005 responde em `ATSP5`/`4`/`3` com o clone | O clone consegue K-Line | Pode servir como adaptador de teste |
| Clio 2005 só dá `BUS INIT: ERROR`/`UNABLE TO CONNECT` em todos | Clone sem K-Line, **ou** ECU sem EOBD | Repetir com outro adaptador antes de concluir |
| `0100` OK mas muitos `NO DATA` | PIDs limitados | Define quais gauges o app mostra |
| Nenhum protocolo responde nos dois | ECU sem OBD-II genérico | Caminho proprietário Renault (Fase 6) |

## 9. Cuidados

- Só **leitura**. Não envie `04`.
- Desplugue o adaptador depois dos testes: clones baratos podem descarregar a bateria se ficarem ligados com o carro desligado.
- Se aparecer algo inesperado, pare e anote o texto exato.
