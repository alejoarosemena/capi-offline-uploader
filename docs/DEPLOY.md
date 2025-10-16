## Deploy (Vercel + Render)

### Backend (Render)
1. Conecta el repo en Render y crea un Web Service.
2. Root Directory: `backend`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Health Check Path: `/api/health`
6. Variables de entorno:
   - `META_ACCESS_TOKEN` (Secret)
   - `GRAPH_API_VERSION=v20.0`
   - `CORS_ALLOWED_ORIGINS=https://<tu-app>.vercel.app,http://localhost:5173`
   - `TIMEZONE_DEFAULT=America/Guayaquil`
7. Opcional: Usa `backend/render.yaml` para IaC.

### Frontend (Vercel)
1. Importa el repo en Vercel y selecciona Root Directory: `frontend`.
2. Build & Output:
   - Install: `npm ci`
   - Build: `npm run build`
   - Output directory: `dist`
3. Env Vars:
   - `VITE_API_BASE_URL=https://<render-service>.onrender.com`

### CORS
- Configura `CORS_ALLOWED_ORIGINS` en el backend con el dominio de Vercel.

### Notas para archivos grandes (~300 MB)
- El backend guarda el CSV en disco y procesa en streaming. Si tu plataforma limita el tamaño del body, considera:
  - Subida chunked (tus) o
  - Subida a S3 (presigned URL) y procesamiento desde S3.

### Pruebas locales
1. Backend:
   - `cd backend && python -m venv .venv && source .venv/bin/activate`
   - `cp .env.example .env` y define `META_ACCESS_TOKEN`
   - `pip install -r requirements.txt`
   - `uvicorn app.main:app --reload`
2. Frontend:
   - `cd frontend && npm ci`
   - `cp .env.example .env` y ajusta `VITE_API_BASE_URL`
   - `npm run dev`
3. Abre `http://localhost:5173` y prueba subiendo el CSV.


