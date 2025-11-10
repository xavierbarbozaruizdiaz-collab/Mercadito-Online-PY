# QA local (LPMS)



## Requisitos

- WSL con Node 22 (NVM)

- No modifica UI ni lógica, no hace commit/push



## Uso (WSL)

```bash

cd /mnt/c/Users/PCera/mercadito-online-py

source ~/.nvm/nvm.sh && nvm use 22

npm run qa:local:fast   # Variante sin Lighthouse

# o

npm run qa:local        # Variante full (intentará Lighthouse si CHROME_PATH está listo)

```

Dónde ver logs



Run completo: docs/.artifacts/lpms-local-qa.log



Server: /tmp/lpms-local-server.log



Predeploy: docs/.artifacts/predeploy-check-local.txt



Server manual (opcional)

bash

Copiar código

pkill -f "next start" || true

npm run start &> /tmp/next-start.log &

# Abrir http://localhost:3000

# Al terminar:

pkill -f "next start"



No modificar otros archivos fuera de lo pedido. No tocar UI/funcionalidad.



Al terminar (desde WSL)

chmod +x scripts/lpms-local-qa.sh scripts/lpms-local-qa-skip-lh.sh

source ~/.nvm/nvm.sh && nvm use 22

npm run qa:local:fast



Luego de que Cursor termine



Dar permisos (por si acaso) y correr QA rápido:



cd /mnt/c/Users/PCera/mercadito-online-py

chmod +x scripts/lpms-local-qa.sh scripts/lpms-local-qa-skip-lh.sh

source ~/.nvm/nvm.sh && nvm use 22

npm run qa:local:fast



Revisar:



docs/.artifacts/lpms-local-qa.log



/tmp/lpms-local-server.log



docs/.artifacts/predeploy-check-local.txt



Si querés el full con Lighthouse:



export CHROME_PATH="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"

export LIGHTHOUSE_CHROMIUM_FLAGS="--headless=new --disable-gpu --no-sandbox"

npm run qa:local

