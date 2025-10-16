# CAPI Offline CSV Uploader

Web app para subir CSVs con ventas offline, transformarlos al formato de Meta Conversions API (Offline Events) y enviarlos automáticamente al dataset.

## Stack
- **Backend**: FastAPI + Python (streaming, hashing SHA-256, batch de 100)
- **Frontend**: React + Vite + TypeScript
- **Deploy**: Render (backend) + Vercel (frontend)

## Setup Local

### 1. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Asegúrate de que .env tiene META_ACCESS_TOKEN
uvicorn app.main:app --reload --port 8000
```

El backend estará en `http://localhost:8000`

### 2. Frontend
```bash
cd frontend
npm ci
npm run dev
```

El frontend estará en `http://localhost:5173`

### 3. Probar
1. Abre `http://localhost:5173`
2. Ingresa el **Dataset ID** (de Meta Business Suite → Events Manager → Offline Event Sets)
3. Selecciona un CSV (formato Fybeca con columnas: `CORREO`, `CELULAR`, `FACTURA`, `NOMBRE_CATEGORIA`, `COD_ITEM`, `VENTA_NETA`, `FECHA`)
4. Click "Subir y procesar"
5. Observa el progreso en tiempo real
6. Descarga reporte de errores si hay filas inválidas

## Formato CSV esperado

```csv
CORREO,CELULAR,FACTURA,NOMBRE_CATEGORIA,COD_ITEM,VENTA_NETA,FECHA
email@example.com,+593987654321,123456,CATEGORIA,100001,39.90,2025-09-01
```

## Transformaciones aplicadas
- **Email**: normalizado (lowercase, trim) → SHA-256
- **Teléfono**: normalizado a E.164 (solo dígitos con código país) → SHA-256
- **Fecha**: `YYYY-MM-DD` o `D/M/YY` → UNIX seconds a medianoche (timezone configurable)
- **Moneda**: `USD` (fijo)
- **Event name**: `Purchase` (configurable)
- **Action source**: `physical_store`

## Deploy

Ver `docs/DEPLOY.md` para instrucciones completas de deploy en Render + Vercel.

## Características
- ✅ Streaming de CSVs grandes (hasta 300 MB)
- ✅ Procesamiento en background con progreso en tiempo real
- ✅ Hashing SHA-256 de PII (email, teléfono)
- ✅ Batching de 100 eventos por request
- ✅ Reintentos automáticos con backoff exponencial
- ✅ Reporte de errores descargable
- ✅ Soporte para múltiples timezones

## Estructura del proyecto

```
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app + CORS
│   │   ├── config.py          # Settings desde .env
│   │   ├── api/
│   │   │   └── uploads.py     # Endpoints
│   │   ├── services/
│   │   │   ├── transform.py   # CSV → eventos CAPI
│   │   │   ├── capi_client.py # Cliente Graph API
│   │   │   └── progress.py    # Job tracking
│   │   └── utils/
│   │       ├── normalization.py # Email/phone hash
│   │       └── time.py          # Fecha → UNIX
│   ├── requirements.txt
│   └── render.yaml
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   └── pages/
│   │       └── UploadPage.tsx
│   ├── package.json
│   └── vite.config.ts
└── docs/
    └── DEPLOY.md
```

