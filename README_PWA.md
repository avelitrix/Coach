Avelitrix Coach — PWA instalável

Esta versão foi preparada para funcionar como PWA no Android/Chrome.

Arquivos adicionados:
- manifest.webmanifest
- service-worker.js
- pasta icons com ícones PNG da bolinha de tênis.

Ícone:
- bolinha de tênis, para aparecer na tela inicial/desktop do telefone.

Como instalar no Android/Chrome:
1. Hospede a pasta em um servidor HTTPS, ou use localhost para teste.
2. Abra o index.html pelo Chrome.
3. Aguarde alguns segundos.
4. Use o menu do Chrome e toque em “Instalar app” ou “Adicionar à tela inicial”.
5. O app deverá aparecer com o ícone de bolinha de tênis.

Observações importantes:
- Para o Chrome oferecer instalação como PWA, normalmente não basta abrir o arquivo local por file://.
- O ideal é hospedar em HTTPS, GitHub Pages, Netlify, Vercel ou servidor local de teste.
- O app continua salvando os dados no localStorage do navegador/dispositivo.


Atualização de nome:
- name: Avelitrix Coach
- short_name: AveliCoach
- O Android/Chrome costuma usar o short_name na tela inicial.
