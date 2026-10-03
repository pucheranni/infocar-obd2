// Database of standard OBD-II Diagnostic Trouble Codes (DTC) in Portuguese
export const DTC_DATABASE = {
  // Fuel and Air Metering
  "P0100": { title: "Falha no Circuito do Sensor de Fluxo de Ar (MAF)", severity: "Média", system: "Admissão", cause: "Sensor MAF sujo, fiação rompida ou vazamento de ar na admissão." },
  "P0101": { title: "Problema de Faixa/Desempenho no Circuito do Sensor MAF", severity: "Média", system: "Admissão", cause: "Sensor sujo com óleo/poeira, filtro de ar obstruído ou vazamento de vácuo." },
  "P0102": { title: "Entrada Baixa no Circuito do Sensor MAF", severity: "Média", system: "Admissão", cause: "Fio em curto com a terra, sensor MAF com defeito ou conector solto." },
  "P0103": { title: "Entrada Alta no Circuito do Sensor MAF", severity: "Média", system: "Admissão", cause: "Fio de sinal em curto com positivo de 5V/12V ou sensor avariado." },
  "P0105": { title: "Falha no Circuito de Pressão Absoluta do Coletor (MAP)", severity: "Média", system: "Admissão", cause: "Mangueira de vácuo rompida, sensor MAP danificado ou chicote elétrico." },
  "P0106": { title: "Desempenho Incorreto do Sensor MAP", severity: "Média", system: "Admissão", cause: "Vazamento no coletor de admissão, carbonização ou sensor descalibrado." },
  "P0110": { title: "Falha no Sensor de Temperatura do Ar de Admissão (IAT)", severity: "Baixa", system: "Admissão", cause: "Sensor IAT desconectado, fio partido ou termistor com falha." },
  "P0115": { title: "Falha no Sensor de Temperatura do Líquido de Arrefecimento (ECT)", severity: "Alta", system: "Arrefecimento", cause: "Termostato travado, sensor de temperatura avariado ou nível baixo de líquido." },
  "P0116": { title: "Problema de Faixa/Desempenho no Sensor ECT", severity: "Alta", system: "Arrefecimento", cause: "Válvula termostática aberta ou sensor de temperatura oscilando." },
  "P0117": { title: "Entrada Baixa no Circuito ECT (Alta Temperatura indicada)", severity: "Alta", system: "Arrefecimento", cause: "Fio de sinal em curto com a massa ou sensor em curto interno." },
  "P0118": { title: "Entrada Alta no Circuito ECT (Circuito Aberto)", severity: "Alta", system: "Arrefecimento", cause: "Chicote rompido, conector desconectado ou sensor com resistência infinita." },
  "P0120": { title: "Falha no Circuito do Sensor de Posição da Borboleta (TPS)", severity: "Alta", system: "Aceleração", cause: "Trilha resistiva do TPS gasta, mau contato ou corpo de borboleta sujo." },
  "P0121": { title: "Problema de Faixa/Desempenho no Sensor de Posição da Borboleta (TPS A)", severity: "Alta", system: "Aceleração", cause: "Inconsistência entre os sinais do pedal e da borboleta TBI." },
  "P0122": { title: "Entrada Baixa no Circuito TPS A", severity: "Alta", system: "Aceleração", cause: "Fiação em curto à massa ou sensor com defeito mecânico/elétrico." },
  "P0125": { title: "Temperatura Insuficiente do Arrefecimento para Controle em Malha Fechada", severity: "Média", system: "Arrefecimento", cause: "Válvula termostática travada aberta, impedindo o motor de aquecer." },
  "P0128": { title: "Líquido de Arrefecimento Abaixo da Temperatura de Regulação do Termostato", severity: "Média", system: "Arrefecimento", cause: "Válvula termostática travada aberta (muito comum)." },
  "P0130": { title: "Falha no Circuito da Sonda Lambda (Sensor 1 Banco 1)", severity: "Média", system: "Emissões / O2", cause: "Sonda de oxigênio pré-catalisador avariada, fiação rompida ou fusível do aquecedor." },
  "P0131": { title: "Tensão Baixa no Circuito da Sonda Lambda (B1 S1 - Mistura Pobre)", severity: "Média", system: "Emissões / O2", cause: "Entrada falsa de ar, pressão de combustível baixa ou sonda danificada." },
  "P0132": { title: "Tensão Alta no Circuito da Sonda Lambda (B1 S1 - Mistura Rica)", severity: "Média", system: "Emissões / O2", cause: "Injetor gotejando, pressão de combustível muito alta ou sonda em curto." },
  "P0133": { title: "Resposta Lenta no Circuito da Sonda Lambda (B1 S1)", severity: "Média", system: "Emissões / O2", cause: "Sonda envelhecida, contaminada por óleo ou gasolina adulterada." },
  "P0134": { title: "Nenhuma Atividade Detectada no Circuito da Sonda Lambda (B1 S1)", severity: "Média", system: "Emissões / O2", cause: "Sensor O2 inoperante, conector desligado ou sem alimentação." },
  "P0135": { title: "Falha no Circuito do Aquecedor da Sonda Lambda (B1 S1)", severity: "Média", system: "Emissões / O2", cause: "Resistência de aquecimento da sonda queimada ou fusível queimado." },
  "P0136": { title: "Falha no Circuito da Sonda Lambda Pós-Catalisador (B1 S2)", severity: "Média", system: "Emissões / O2", cause: "Sonda 2 com defeito, fiação rompida pelo escapamento ou conector queimado." },
  "P0141": { title: "Falha no Aquecedor da Sonda Lambda Pós-Catalisador (B1 S2)", severity: "Média", system: "Emissões / O2", cause: "Resistência de aquecimento do sensor 2 aberta ou fio em curto." },
  "P0171": { title: "Sistema Muito Pobre (Banco 1)", severity: "Alta", system: "Alimentação", cause: "Entrada falsa de ar (vácuo), bicos injetores entupidos, bomba de combustível fraca ou sensor MAF sujo." },
  "P0172": { title: "Sistema Muito Rico (Banco 1)", severity: "Alta", system: "Alimentação", cause: "Bico injetor travado aberto, regulador de pressão furado, sensor MAP/MAF descalibrado ou excesso de combustível." },

  // Ignition System / Misfire
  "P0300": { title: "Falha de Ignição Múltipla / Aleatória Detectada (Misfire)", severity: "Alta (Perigo Catalisador)", system: "Ignição", cause: "Velas de ignição desgastadas, cabos de vela com fuga de corrente, bobina defeituosa ou combustível ruim." },
  "P0301": { title: "Falha de Ignição Detectada no Cilindro 1", severity: "Alta", system: "Ignição", cause: "Vela do cilindro 1 carbonizada/aberta, bobina 1 queimada, compressão baixa ou bico 1 entupido." },
  "P0302": { title: "Falha de Ignição Detectada no Cilindro 2", severity: "Alta", system: "Ignição", cause: "Vela, bobina ou injetor do cilindro 2 com falha." },
  "P0303": { title: "Falha de Ignição Detectada no Cilindro 3", severity: "Alta", system: "Ignição", cause: "Vela, bobina ou injetor do cilindro 3 com falha." },
  "P0304": { title: "Falha de Ignição Detectada no Cilindro 4", severity: "Alta", system: "Ignição", cause: "Vela, bobina ou injetor do cilindro 4 com falha." },
  "P0325": { title: "Falha no Circuito do Sensor de Detonação (Knock Sensor 1)", severity: "Média", system: "Ignição", cause: "Sensor quebrado, torque de aperto incorreto ou chicote partido." },
  "P0335": { title: "Falha no Circuito do Sensor de Posição da Árvore de Manivelas (CKP - Rotação)", severity: "Crítica", system: "Ignição / Motor", cause: "Sensor de rotação com defeito, roda fônica danificada ou fiação partida (carro pode apagar/não pegar)." },
  "P0336": { title: "Faixa/Desempenho no Circuito do Sensor de Rotação (CKP)", severity: "Crítica", system: "Ignição / Motor", cause: "Dente quebrado na roda fônica, folga excessiva ou interferência eletromagnética." },
  "P0340": { title: "Falha no Circuito do Sensor de Posição do Comando de Válvulas (CMP - Fase)", severity: "Alta", system: "Distribuição", cause: "Sensor de fase defeituoso, ponto da correia/corrente dentada fora de sincronismo." },
  "P0341": { title: "Desempenho do Sensor de Posição do Comando de Válvulas (CMP)", severity: "Alta", system: "Distribuição", cause: "Correia dentada fora de ponto, tensor frouxo ou sensor oscilando." },

  // Auxiliary Emissions & Exhaust
  "P0400": { title: "Falha no Fluxo de Recirculação dos Gases de Escape (EGR)", severity: "Média", system: "Emissões (EGR)", cause: "Válvula EGR travada por carbonização ou passagens do coletor obstruídas." },
  "P0420": { title: "Eficiência do Sistema Catalítico Abaixo do Limiar (Banco 1)", severity: "Média", system: "Catalisador", cause: "Catalisador desgastado/esfarelado, vazamento no escapamento ou sonda 2 com leitura errada." },
  "P0430": { title: "Eficiência do Catalisador Abaixo do Limiar (Banco 2)", severity: "Média", system: "Catalisador", cause: "Catalisador do banco 2 ineficiente ou danificado." },
  "P0440": { title: "Falha no Sistema de Controle de Emissões Evaporativas (EVAP)", severity: "Baixa", system: "Tanque / EVAP", cause: "Tampa do bocal de combustível solta/danificada, mangueira de respiro trincada ou cânister saturado." },
  "P0442": { title: "Vazamento Pequeno Detectado no Sistema EVAP", severity: "Baixa", system: "Tanque / EVAP", cause: "Tampa do tanque mal fechada, borracha de vedação gasta ou microfissura nas linhas." },
  "P0443": { title: "Falha no Circuito da Válvula de Purga do Cânister (EVAP)", severity: "Baixa", system: "Tanque / EVAP", cause: "Solenoide da purga queimada, fusível aberto ou conector elétrico frouxo." },

  // Vehicle Speed & Idle Control
  "P0500": { title: "Falha no Sensor de Velocidade do Veículo (VSS)", severity: "Média", system: "Velocímetro", cause: "Sensor VSS no câmbio danificado, fiação ou comunicação com módulo ABS/painel." },
  "P0505": { title: "Falha no Sistema de Controle de Marcha Lenta (IAC)", severity: "Média", system: "Marcha Lenta", cause: "Atuador de marcha lenta sujo/travado, vazamento de ar ou corpo borboleta descalibrado." },
  "P0507": { title: "RPM de Marcha Lenta Mais Alta que o Esperado", severity: "Média", system: "Marcha Lenta", cause: "Entrada falsa de ar (sucção no coletor), borboleta emperrada ou válvula PCV furada." },
  "P0562": { title: "Tensão do Sistema do Veículo Baixa", severity: "Alta", system: "Elétrica / Bateria", cause: "Alternador não está carregando, bateria descarregada, correia do alternador frouxa ou quebrou." },
  "P0563": { title: "Tensão do Sistema do Veículo Alta", severity: "Crítica", system: "Elétrica / Bateria", cause: "Regulador de voltagem do alternador queimado (risco de queimar módulos e lâmpadas)." },

  // Computer & Auxiliary Inputs
  "P0600": { title: "Falha no Barramento de Comunicação Serial", severity: "Alta", system: "Rede / ECU", cause: "Mau contato na fiação de dados CAN/K-Line ou falha interna no módulo." },
  "P0601": { title: "Erro de Checksum na Memória da ROM do Módulo de Controle (ECU)", severity: "Crítica", system: "ECU / Central", cause: "Corrupção na memória da ECU (remap incorreto ou falha de hardware na central)." },
  "P0606": { title: "Falha do Processador do Módulo ECM/PCM", severity: "Crítica", system: "ECU / Central", cause: "Defeito no microprocessador da central eletrônica do motor ou aterramento deficiente." },

  // Transmission
  "P0700": { title: "Falha no Sistema de Controle da Transmissão Automática", severity: "Alta", system: "Câmbio Automático", cause: "A ECU do motor recebeu solicitação de acendimento de luz da TCM (módulo do câmbio)." },
  "P0720": { title: "Falha no Circuito do Sensor de Velocidade de Saída (TCM)", severity: "Alta", system: "Câmbio Automático", cause: "Sensor de rotação de saída da transmissão com defeito ou conector com óleo." },
  "P0730": { title: "Relação de Marcha Incorreta", severity: "Alta", system: "Câmbio Automático", cause: "Patinamento da embreagem interna, nível de óleo ATF baixo ou solenoides travados." },

  // Network & Communication (U-codes)
  "U0001": { title: "Barramento de Comunicação CAN de Alta Velocidade", severity: "Alta", system: "Rede CAN", cause: "Curto nos fios CAN-H / CAN-L ou terminador resistivo defeituoso." },
  "U0100": { title: "Perda de Comunicação com a ECU do Motor (ECM/PCM)", severity: "Crítica", system: "Rede CAN", cause: "Falta de alimentação/aterramento na central, fiação da rede CAN partida." },
  "U0101": { title: "Perda de Comunicação com o Módulo de Transmissão (TCM)", severity: "Alta", system: "Rede CAN", cause: "Chicote do câmbio desligado, fusível da TCM queimado ou conector oxidado." },
  "U0121": { title: "Perda de Comunicação com o Módulo do Sistema de Freio (ABS)", severity: "Alta", system: "Rede CAN / ABS", cause: "Módulo ABS desconectado, fusível principal queimado ou chicote CAN interrompido." },
  "U0155": { title: "Perda de Comunicação com o Painel de Instrumentos (Cluster)", severity: "Média", system: "Rede CAN / Painel", cause: "Conector do painel solto ou problema na linha de comunicação com o painel." },

  // Body & Chassis (B & C codes)
  "B0001": { title: "Circuito de Controle de Disparo do Airbag do Motorista", severity: "Alta", system: "Segurança / Airbag", cause: "Cinta do volante (Hard-disc / clockspring) rompida ou bolsa do airbag desconectada." },
  "C0035": { title: "Falha no Circuito do Sensor de Velocidade da Roda Dianteira Esquerda", severity: "Média", system: "ABS / Freios", cause: "Sensor ABS da roda quebrado, cabo rompido pelo movimento da suspensão ou sujeira no rolamento magnético." }
};

export function lookupDTC(code) {
  const upper = (code || '').toUpperCase().trim();
  if (DTC_DATABASE[upper]) {
    return { code: upper, ...DTC_DATABASE[upper] };
  }

  // Generic fallback if not in database
  const firstChar = upper[0];
  let systemName = 'Desconhecido';
  if (firstChar === 'P') systemName = 'Trem de Força (Motor/Câmbio)';
  else if (firstChar === 'B') systemName = 'Carroceria (Airbag, Climatização, Iluminação)';
  else if (firstChar === 'C') systemName = 'Chassi (Freios ABS, Direção, Suspensão)';
  else if (firstChar === 'U') systemName = 'Comunicação e Rede de Dados (CAN/LIN)';

  return {
    code: upper,
    title: `Código de Diagnóstico ${upper}`,
    severity: 'Verificação Necessária',
    system: systemName,
    cause: 'Código de falha detectado pela unidade de controle. Consulte o manual de serviço do fabricante para detalhes específicos.'
  };
}
