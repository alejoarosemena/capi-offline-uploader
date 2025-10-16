# 🚀 Guía de Deploy - CAPI Offline Uploader

## Requisitos previos
- ✅ Cuenta de GitHub (para conectar a Render y Vercel)
- ✅ Cuenta de Render.com (gratis)
- ✅ Cuenta de Vercel.com (gratis)
- ✅ Tu `META_ACCESS_TOKEN`

---

## 📦 Paso 1: Subir código a GitHub

### 1.1 Inicializar Git (si no lo has hecho)
```bash
cd "/Users/alejombprom4pro/Documents/GitHub/Offline conversions"
git init
git add .
git commit -m "Initial commit: CAPI Offline CSV Uploader"
```

### 1.2 Crear repo en GitHub
1. Ve a https://github.com/new
2. Nombre: `capi-offline-uploader` (o el que prefieras)
3. **NO** inicialices con README (ya tenemos archivos)
4. Click **Create repository**

### 1.3 Push al repo
```bash
git remote add origin https://github.com/TU_USUARIO/capi-offline-uploader.git
git branch -M main
git push -u origin main
```

---

## 🔧 Paso 2: Deploy Backend en Render

### 2.1 Crear Web Service
1. Ve a https://render.com/
2. Click **New +** → **Web Service**
3. Conecta tu cuenta de GitHub
4. Selecciona el repo `capi-offline-uploader`
5. Click **Connect**

### 2.2 Configuración del servicio

**Configuración básica:**
- **Name**: `capi-offline-backend` (o el que prefieras)
- **Region**: Oregon (US West) - más cerca de Ecuador
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Plan:**
- Selecciona **Free** (suficiente para empezar)

### 2.3 Variables de entorno (Environment Variables)

Click **Advanced** y agrega estas variables:

```
META_ACCESS_TOKEN = [tu token real]
GRAPH_API_VERSION = v20.0
TIMEZONE_DEFAULT = America/Guayaquil
CORS_ALLOWED_ORIGINS = https://[tu-app].vercel.app,http://localhost:5173
BATCH_SIZE = 100
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 0.5
```

**Importante**: 
- Deja `CORS_ALLOWED_ORIGINS` vacío por ahora, lo actualizaremos después de deploy de Vercel
- Guarda el token en secreto

### 2.4 Health Check (opcional pero recomendado)
- **Health Check Path**: `/api/health`

### 2.5 Deploy
1. Click **Create Web Service**
2. Espera 3-5 minutos mientras se hace el deploy
3. Cuando termine, verás: ✓ **Live**
4. Copia la URL (ej: `https://capi-offline-backend.onrender.com`)

### 2.6 Probar el backend
Abre en navegador:
```
https://[tu-backend].onrender.com/api/health
```

Deberías ver: `{"status":"ok"}`

---

## 🎨 Paso 3: Deploy Frontend en Vercel

### 3.1 Importar proyecto
1. Ve a https://vercel.com/new
2. Conecta tu cuenta de GitHub
3. Selecciona el repo `capi-offline-uploader`
4. Click **Import**

### 3.2 Configuración del proyecto

**Framework Preset**: `Vite`

**Root Directory**: Click **Edit** y selecciona `frontend`

**Build & Output Settings**:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### 3.3 Variables de entorno

Click **Environment Variables** y agrega:

```
Name: VITE_API_BASE_URL
Value: https://[tu-backend].onrender.com
```

(Usa la URL de Render del paso 2.5)

### 3.4 Deploy
1. Click **Deploy**
2. Espera 1-2 minutos
3. Cuando termine, verás: 🎉 **Congratulations!**
4. Click **Visit** para ver tu app
5. Copia la URL (ej: `https://capi-offline-uploader.vercel.app`)

---

## 🔄 Paso 4: Actualizar CORS en Backend

Ahora que tienes la URL de Vercel, actualiza el backend:

1. Ve a tu servicio en Render: https://dashboard.render.com/
2. Selecciona tu `capi-offline-backend`
3. Ve a **Environment**
4. Edita `CORS_ALLOWED_ORIGINS`:
   ```
   https://[tu-app].vercel.app
   ```
5. Click **Save Changes**
6. El servicio se re-desplegará automáticamente (~1-2 min)

---

## ✅ Paso 5: Probar en producción

1. Abre tu app de Vercel: `https://[tu-app].vercel.app`
2. Completa el formulario:
   - **Dataset ID**: `1182254526484927`
   - **Timezone**: `America/Guayaquil`
   - **Upload tag**: `produccion-test-100rows`
   - **Archivo**: `test_sample_100_rows.csv`
3. Click **"Subir y procesar"**
4. Observa el progreso
5. Verifica en Meta que llegaron los eventos

---

## 📝 Notas importantes

### Límites del plan Free de Render:
- ⚠️ El servicio se "duerme" después de 15 min de inactividad
- ⚠️ Primera request después de dormir toma ~30-60 segundos
- ⚠️ 750 horas/mes gratis (suficiente para 1 servicio 24/7)
- ✅ Para archivos muy grandes (>300 MB), considera upgrade a plan pagado

### Si necesitas mejor rendimiento:
- Render: Plan Starter ($7/mes) - No se duerme, más RAM
- Vercel: Plan gratuito es suficiente para el frontend

### Archivo grande (1.8M filas):
- Procesamiento puede tomar 30-60 minutos
- El sistema mantiene el progreso
- Si el worker se cae, puedes reintentar

---

## 🔐 Seguridad

✅ **Buenas prácticas aplicadas:**
- Token nunca se expone al frontend
- CORS configurado correctamente
- Variables de entorno en secreto
- Validación de archivos CSV

---

## 🆘 Troubleshooting

### Error: CORS
- Verifica que `CORS_ALLOWED_ORIGINS` en Render incluye tu dominio de Vercel
- No incluyas `/` al final de la URL

### Error: 502 Bad Gateway (Render)
- El servicio está "despertando" (espera 30-60 seg)
- O el deploy falló (revisa logs en Render)

### Frontend no conecta con Backend
- Verifica `VITE_API_BASE_URL` en Vercel
- Debe ser `https://` (no `http://`)
- No incluyas `/` al final

### Upload falla
- Verifica que `META_ACCESS_TOKEN` en Render es correcto
- Revisa logs del backend en Render Dashboard

---

## 📊 Monitoreo

### Backend (Render):
- Logs en tiempo real: Dashboard → tu servicio → Logs
- Métricas: Dashboard → tu servicio → Metrics

### Frontend (Vercel):
- Analytics: Dashboard → tu proyecto → Analytics
- Logs: Dashboard → tu proyecto → Deployments → [deployment] → Logs

---

## 🔄 Actualizaciones futuras

Cuando hagas cambios al código:

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

- **Render**: Auto-deploy en ~3-5 min
- **Vercel**: Auto-deploy en ~1-2 min

Ambos se actualizan automáticamente cuando haces push a `main`.

---

**¿Listo para empezar?** Sigue los pasos en orden y estarás en producción en ~15 minutos! 🚀

