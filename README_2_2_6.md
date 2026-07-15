# AveliCoach 2.2.6

Correção de exportação HTML em dispositivos móveis:

- Função `download()` agora usa `application/octet-stream` por padrão.
- Exportações HTML passam explicitamente `text/html;charset=utf-8`.
- Revogação do ObjectURL foi atrasada para melhorar compatibilidade em celulares.
- Service worker atualizado para `avelicoach-2-2-6`.
