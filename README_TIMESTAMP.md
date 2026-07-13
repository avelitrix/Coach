AveliCoach — atualização de timestamp por ponto

Nesta versão, cada ponto salvo registra explicitamente o instante de data e hora do salvamento.

Campos novos em cada ponto:
- createdAt: data/hora em UTC, formato ISO.
- savedAt: mesmo instante em UTC, mantido para clareza sem quebrar compatibilidade.
- savedAtLocal: data/hora local com fuso, ex.: 2026-07-08T15:23:41-03:00.
- savedDate: data local, ex.: 2026-07-08.
- savedTime: hora local, ex.: 15:23:41.
- savedTimestampMs: timestamp em milissegundos.
- matchDate: cópia da data do jogo no momento do registro.

Campos novos no jogo:
- lastPointSavedAt
- lastPointSavedAtLocal
- lastPointSavedTimestampMs

Uso futuro:
Esses campos permitem medir a dinâmica do jogo, como intervalo entre pontos, duração média entre registros, aceleração/desaceleração do ritmo e momentos de sequência negativa/positiva.
