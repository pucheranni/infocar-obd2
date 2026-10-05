Olá GPT-Sol! O usuário levantou uma nova e ambiciosa frente de pesquisa e engenharia para o ecossistema AutoPulse: o **Projeto Noise Car** — um diagnosticador acústico inteligente de falhas mecânicas veiculares (estilo um "Shazam de barulhos de motor"), voltado especialmente para o Renault Clio 1.0 16V D4D (mas extensível a outros motores).

A ideia central é captar o áudio do motor pelo microfone do smartphone (ou externo), converter o sinal sonoro em representações tempo-frequência (como Mel-Espectrogramas, STFT e coeficientes MFCC) e identificar padrões de avarias mecânicas como:
- Folga ou batida de válvulas / tuchos mecânicos (ticking característico);
- Chiado de atrito e ressecamento de correia dentada / poly-V (belt squeal);
- Ruído de rolamentos gastos (alternador, polia tensora, bomba d'água);
- Fuga/vazamento de compressão em coletor de escape ou juntas;
- Detonação / batida de pino (engine knocking / pinging sob carga);
- Falha de ignição audível (misfire).

O grande diferencial inovador do AutoPulse sobre classificadores de som convencionais é a **FUSÃO MULTIMODAL COM O OBD2**: nós temos a rotação real do virabrequim (RPM - PID 010C), carga do motor e temperatura da água em tempo real. Pela física do motor 4 tempos, isso permite aplicar a técnica de **Harmonic Order Tracking**:
- Válvulas/tuchos batem na ordem 0.5x da rotação do virabrequim (comando gira a RPM/2);
- Ignição/combustão ocorre na ordem 2.0x (4 cilindros a cada 2 voltas = 2 queimas por volta);
- Alternador e acessórios operam numa ordem linear determinada pela razão geométrica das polias (geralmente 2.0x a 2.5x RPM).

Como engenheiro de sistemas sênior, gostaríamos da sua revisão técnica estruturada cobrindo:
1. **Viabilidade Técnica & Arquitetura Edge (Mobile)**:
   - Qual a melhor stack para executar a geração de espectrogramas e inferência localmente no smartphone (Android/Capacitor/PWA) sem depender de servidores em nuvem? (ex: Web Audio API com AudioWorklet + ONNX Runtime Web vs TFLite C++ no Capacitor).
2. **Modelagem de Machine Learning & Anomalias**:
   - Qual abordagem é mais realista:
     (a) Classificador supervisionado direto (CNN sobre Mel-spectrogram, como MobileNetV3 / YAMNet / Audio Spectrogram Transformer);
     (b) Detecção não supervisionada de anomalias (Autoencoder treinando o "som normal saudável" do Clio e acusando reconstrução anormal de erro);
     (c) Abordagem híbrida: Order Tracking baseado em FFT física correlacionada ao RPM + classificador ML para ruídos não-síncronos?
3. **Estratégia de Aquisição de Dados & Datasets**:
   - Como resolver o problema da escassez de áudios rotulados para o motor Renault D4D? Quais datasets abertos (MIMII, ToyADMOS, AudioSet, Car Diagnostic datasets do GitHub) servem como baseline ou transfer learning?
4. **Acústica Prática & Relação Sinal-Ruído (SNR)**:
   - Recomendações práticas para o usuário captar o áudio (ex.: capô aberto com motor em marcha lenta vs acelerando a 2000 RPM parado em ponto morto; microfone do celular vs microfone de lapela/piezoelétrico de baixo custo preso no cofre).
5. **Roadmap de Implementação Faseado**:
   - Como você estruturaria o desenvolvimento desse módulo ("AutoPulse Acoustic Scanner") em fases concretas de entrega?
