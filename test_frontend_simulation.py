#!/usr/bin/env python3
"""Simular exactamente el comportamiento del frontend"""
import requests
import time
import sys

# Configuración
API_BASE = "https://capi-offline-uploader.onrender.com"
DATASET_ID = "1182254526484927"

def test_with_file(filename):
    print("=" * 60)
    print(f"🧪 SIMULACIÓN DE FRONTEND - {filename}")
    print("=" * 60)
    
    try:
        # 1. Abrir y preparar el archivo
        print(f"\n1️⃣ Preparando archivo {filename}...")
        with open(filename, 'rb') as f:
            file_data = f.read()
            file_size_mb = len(file_data) / (1024 * 1024)
            print(f"   Tamaño: {file_size_mb:.2f} MB")
        
        # 2. Simular el FormData del frontend
        print("\n2️⃣ Enviando archivo al backend (simulando FormData)...")
        print(f"   Dataset ID: {DATASET_ID}")
        print(f"   Upload tag: test-frontend-sim")
        print(f"   Timezone: America/Guayaquil")
        
        files = {
            'file': (filename, open(filename, 'rb'), 'text/csv')
        }
        data = {
            'dataset_id': DATASET_ID,
            'upload_tag': 'test-frontend-sim',
            'timezone': 'America/Guayaquil'
        }
        
        # Timeout de 5 minutos como el frontend
        start_upload = time.time()
        resp = requests.post(
            f"{API_BASE}/api/uploads",
            files=files,
            data=data,
            timeout=300  # 5 minutos
        )
        upload_time = time.time() - start_upload
        
        print(f"   ✅ Upload completado en {upload_time:.1f} segundos")
        
        if resp.status_code != 200:
            print(f"   ❌ Error HTTP {resp.status_code}: {resp.text}")
            return
        
        job_data = resp.json()
        job_id = job_data['job_id']
        print(f"   Job ID: {job_id}")
        
        # 3. Polling como el frontend (cada 1.5 segundos)
        print("\n3️⃣ Monitoreando progreso (polling cada 1.5s)...")
        
        poll_start = time.time()
        while True:
            time.sleep(1.5)
            
            resp = requests.get(f"{API_BASE}/api/jobs/{job_id}")
            if resp.status_code != 200:
                print(f"   ❌ Error al consultar: {resp.status_code}")
                break
            
            progress = resp.json()
            status = progress['status']
            processed = progress.get('processed_rows', 0)
            total = progress.get('total_rows', 0)
            succeeded = progress.get('succeeded', 0)
            failed = progress.get('failed', 0)
            
            elapsed = int(time.time() - poll_start)
            print(f"   [{elapsed:3d}s] {status:10s} | {processed}/{total} filas | OK: {succeeded} | Err: {failed}")
            
            if status in ['completed', 'failed', 'cancelled']:
                if status == 'completed':
                    print(f"\n✅ PROCESAMIENTO COMPLETADO")
                    print(f"   - Eventos enviados a Meta: {succeeded}")
                    print(f"   - Errores: {failed}")
                    print(f"   - Tiempo total: {elapsed + upload_time:.1f} segundos")
                else:
                    print(f"\n❌ Proceso {status}: {progress.get('message', '')}")
                break
        
        # 4. Verificar errores
        resp = requests.get(f"{API_BASE}/api/jobs/{job_id}/errors")
        if resp.status_code == 200:
            print("\n⚠️ Hay archivo de errores disponible")
        else:
            print("\n✅ Sin errores registrados")
            
    except requests.exceptions.Timeout:
        print("\n❌ TIMEOUT: El servidor tardó más de 5 minutos")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
    
    print("=" * 60)

if __name__ == "__main__":
    # Probar con archivo pequeño primero
    print("🔬 TEST 1: Archivo pequeño (10 filas)")
    test_with_file("test_10_rows.csv")
    
    print("\n" * 2)
    
    # Luego con archivo mediano
    print("🔬 TEST 2: Archivo mediano (100 filas)")
    test_with_file("test_sample_100_rows.csv")
