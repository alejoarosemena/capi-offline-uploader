#!/usr/bin/env python3
"""Test con archivo de 1000 filas (90KB) - simular frontend completo"""
import requests
import time

API_BASE = "https://capi-offline-uploader.onrender.com"
DATASET_ID = "1182254526484927"
TEST_FILE = "test_1000_rows.csv"

print("=" * 70)
print("🚀 TEST CON ARCHIVO GRANDE (1000 filas)")
print("=" * 70)

try:
    # Preparar archivo
    with open(TEST_FILE, 'rb') as f:
        file_size = len(f.read()) / 1024
    print(f"\n📁 Archivo: {TEST_FILE}")
    print(f"   Tamaño: {file_size:.1f} KB")
    
    # Upload
    print("\n📤 Subiendo archivo...")
    start = time.time()
    
    with open(TEST_FILE, 'rb') as f:
        files = {'file': (TEST_FILE, f, 'text/csv')}
        data = {
            'dataset_id': DATASET_ID,
            'upload_tag': 'test-1000-rows',
            'timezone': 'America/Guayaquil'
        }
        
        resp = requests.post(
            f"{API_BASE}/api/uploads",
            files=files,
            data=data,
            timeout=300
        )
    
    upload_time = time.time() - start
    print(f"   ✅ Upload en {upload_time:.1f}s")
    
    if resp.status_code != 200:
        print(f"   ❌ Error: {resp.status_code} - {resp.text}")
        exit(1)
    
    job_id = resp.json()['job_id']
    print(f"   Job ID: {job_id}")
    
    # Monitorear
    print("\n📊 Procesando (debe enviar en batches de 100)...")
    print("   Batch 1: filas 1-100")
    print("   Batch 2: filas 101-200")
    print("   ...")
    print("   Batch 10: filas 901-1000")
    print("")
    
    start_process = time.time()
    last_batch = 0
    
    while True:
        time.sleep(1.5)
        resp = requests.get(f"{API_BASE}/api/jobs/{job_id}")
        if resp.status_code == 200:
            p = resp.json()
            
            # Calcular batch actual
            current_batch = (p.get('processed_rows', 0) + 99) // 100
            if current_batch != last_batch:
                elapsed = int(time.time() - start_process)
                print(f"   [{elapsed:3d}s] Batch {current_batch}/10 procesado | {p.get('succeeded', 0)} eventos OK")
                last_batch = current_batch
            
            if p['status'] in ['completed', 'failed']:
                total_time = time.time() - start_process + upload_time
                if p['status'] == 'completed':
                    print(f"\n✅ COMPLETADO en {total_time:.1f} segundos")
                    print(f"   - Total eventos enviados a Meta: {p.get('succeeded', 0)}")
                    print(f"   - Batches enviados: {(p.get('succeeded', 0) + 99) // 100}")
                    print(f"   - Errores: {p.get('failed', 0)}")
                else:
                    print(f"\n❌ FALLO: {p.get('message', '')}")
                break
    
    print("\n📝 Los eventos aparecerán en Meta Events Manager en 5-10 minutos")
    print(f"   Dataset ID: {DATASET_ID}")
    print(f"   Upload tag: test-1000-rows")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")

print("=" * 70)
