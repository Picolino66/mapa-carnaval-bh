<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1BzK0oOBHdgnpIPWFDlFIxePEnjMfMhYR

## Run Locally

**Prerequisites:**  Node.js

Data source: `public/mapa-carnaval.json`.

Configuração de rotas: no topo da sidebar esquerda é possível definir o intervalo mínimo (em horas) entre blocos para o cálculo das rotas. As rotas priorizam blocos com horário mais próximo do intervalo definido; em caso de empate de horário, a menor distância total é usada.


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
