# AveliCoach - versão consolidada PDF + Presença

Principais alterações:

- PDF de Métricas do Mês redesenhado para caber em uma página, sem usar impressão do navegador.
- PDF de Registro e Leitura de Jogo redesenhado para caber em uma página.
- Radar técnico redesenhado em SVG no HTML e em desenho vetorial no PDF.
- Novo gráfico Presença no jogo, com duas linhas: Jogador e Adversário, eixo X por horário real salvo nos pontos.
- Legenda interpretativa abaixo do gráfico de Presença.
- Botão de informação para explicar o cálculo da Presença.
- Campo Momento simplificado para Normal e Pressão.
- Momentos automáticos calculados por placar e salvos como momentAuto: break point, game point, set point, match point e tie-break.
- Campo Tipo da jogada sem Pressão: Saque +1, Devolução, Troca, Defesa e Rede.
- Cards da leitura técnica com meta U14/COSAT e status.
- Exportações JSON preservadas.
- PWA AveliCoach preservado com service worker atualizado.

## Correção v6 — Presença relativa

- O gráfico **Presença no jogo** foi ajustado para trabalhar com presença relativa.
- Agora o sistema calcula um saldo entre jogador e adversário; a linha do adversário é o oposto do saldo do jogador.
- Isso evita a situação visual em que os dois jogadores aparecem fortemente abaixo de zero ao mesmo tempo.
- O mesmo ajuste vale para o gráfico desenhado no PDF do jogo.
