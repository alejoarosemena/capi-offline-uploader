# ✅ Sistema Listo - Próximos Pasos

## 🎉 Estado Actual

El sistema está **completamente funcional** y probado:

- ✅ Backend corriendo en `http://localhost:8000`
- ✅ Frontend corriendo en `http://localhost:5173`
- ✅ Transformaciones validadas (emails, teléfonos, fechas)
- ✅ API funcionando correctamente
- ✅ Procesamiento en background operativo

## 🧪 Resultados de Prueba

**Archivo**: `test_10_rows.csv` (10 filas de Fybeca)
- ✓ 10/10 filas transformadas correctamente
- ✓ Emails hasheados SHA-256 (64 caracteres)
- ✓ Teléfonos normalizados a E.164 y hasheados
- ✓ Fechas convertidas a UNIX seconds
- ✓ Formato CAPI validado

## 📝 Para usar con tu Dataset REAL

### 1. Abre la aplicación web
```
http://localhost:5173
```

### 2. Completa el formulario:
- **Dataset ID**: Tu dataset real de Meta (ej: `123456789012345`)
  - Lo encuentras en: Meta Business Manager → Events Manager → Offline Event Sets
- **Timezone**: `America/Guayaquil` (default)
- **Upload tag**: `fybeca-sept-2025` (opcional, para identificar el lote)
- **Archivo CSV**: Usa uno de estos:

#### Opciones de archivo:
1. **Prueba pequeña** (recomendado primero):
   - `test_10_rows.csv` (10 filas) - Ya validado ✓
   - `test_sample_100_rows.csv` (100 filas)

2. **Archivos completos** (después de validar):
   - `Ventas Fybeca/FY_BD_TRX_TOTAL_01_15_SEP_2025.csv` (~1.8M filas)
   - `Ventas Fybeca/FY_BD_TRX_TOTAL_16_30_SEP_2025.csv` (~1.7M filas)

### 3. Click "Subir y procesar"

El sistema:
- Subirá el CSV
- Lo procesará en streaming (sin consumir mucha RAM)
- Mostrará progreso en tiempo real
- Enviará en batches de 100 eventos a Meta
- Generará reporte de errores si hay filas inválidas

### 4. Monitorear progreso

Verás en la UI:
```
Estado: running
1234/5000 procesadas — OK: 1200 · Errores: 34
```

### 5. Si hay errores

Click en **"Descargar errores"** para obtener un CSV con:
- Las filas que fallaron
- Razón del fallo (ej: "Sin email ni teléfono válido", "Fecha inválida")

## 🎯 Recomendación

**Haz una prueba primero con 10-100 filas y tu Dataset ID real** para:
1. ✓ Verificar que los eventos llegan a Meta
2. ✓ Validar que los datos se ven correctos en Events Manager
3. ✓ Confirmar que el matching rate es bueno

Luego procesa los archivos completos.

## 🔍 Verificar eventos en Meta

1. Ve a **Meta Business Manager**
2. **Events Manager** → Tu Offline Event Set
3. Deberías ver los eventos aparecer en ~5-10 minutos
4. Revisa:
   - Event count
   - Match rate (idealmente >50%)
   - Event details

## 📊 Archivos de monitoreo

Los logs y datos se guardan en:
```
backend/uploads/<job_id>/
├── input.csv          # CSV original
├── progress.json      # Estado del job
├── errors.csv         # Filas con errores
└── run.log           # Logs detallados
```

## ⚠️ Notas importantes

1. **Valores negativos**: El sistema los procesa (como en la fila de "OTROS INGRESOS" con -2.29). Si quieres excluirlos, puedes filtrar el CSV antes.

2. **Archivos grandes**: Los 2 CSVs completos tienen ~3.5M filas combinadas. El procesamiento tomará tiempo pero se hace en streaming sin problemas de memoria.

3. **Rate limiting**: Si Meta devuelve 429, el sistema reintenta automáticamente con backoff exponencial.

4. **Deduplicación**: Usamos `FACTURA` como `event_id` para evitar duplicados.

## 🚀 Cuando estés listo para producción

Ver `docs/DEPLOY.md` para:
- Deploy del backend en Render
- Deploy del frontend en Vercel
- Configuración de variables de entorno
- CORS y seguridad

---

**¿Listo para procesar?** 
Abre http://localhost:5173 y sube tu primer CSV con el Dataset ID real! 🎯

