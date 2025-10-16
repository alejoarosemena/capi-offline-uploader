#!/usr/bin/env python3
"""Test con archivo de 100 filas para verificar batching"""
import requests
import time

# Configuración
API_BASE = "https://capi-offline-uploader.onrender.com"
CSV_FILE = "test_sample_100_rows.csv"

def test_large_file():
    print("=" * 60)
    print("🧪 TEST CON 100 FILAS - VERIFICAR BATCHING")
    print("=" * 60)
    
    # 1. Subir CSV de 100 filas
    print(f"\n📤 Subiendo {CSV_FILE} (100 filas)...")
    
    with open(CSV_FILE, 'rb') as f:
        files = {'file': (CSV_FILE, f, 'text/csv')}
        data = {
            'dataset_id': '1182254526484927',
            'upload_tag': 'test-100-rows',
            'timezone': 'America/Guayaquil'
        }
        
        resp = requests.post(f"{API_BASE}/api/uploads", files=files, data=data)
        if resp.status_code == 200:
            job_data = resp.json()
            job_id = job_data['job_id']
            print(f"   ✅ Upload exitoso. Job ID: {job_id}")
        else:
            print(f"   ❌ Error: {resp.status_code} - {resp.text}")
            return
    
    # 2. Monitorear progreso
    print("\n📊 Monitoreando progreso (debe enviar 1 batch de 100)...")
    print("   Meta recibe máximo 100 eventos por request")
    print("")
    
    start_time = time.time()
    last_processed = 0
    
    for i in range(60):  # Máximo 90 segundos
        time.sleep(1.5)
        resp = requests.get(f"{API_BASE}/api/jobs/{job_id}")
        if resp.status_code == 200:
            progress = resp.json()
            status = progress['status']
            processed = progress.get('processed_rows', 0)
            total = progress.get('total_rows', 0)
            succeeded = progress.get('succeeded', 0)
            failed = progress.get('failed', 0)
            
            # Mostrar progreso si cambió
            if processed != last_processed or status in ['completed', 'failed']:
                elapsed = int(time.time() - start_time)
                print(f"   [{elapsed:3d}s] Status: {status:10s} | Procesadas: {processed:3d}/{total:3d} | OK: {succeeded:3d} | Errores: {failed:3d}")
                last_processed = processed
            
            if status in ['completed', 'failed', 'cancelled']:
                if status == 'completed':
                    print(f"\n✅ COMPLETADO en {elapsed} segundos")
                    print(f"   - Total eventos enviados a Meta: {succeeded}")
                    print(f"   - Batches enviados: {(succeeded + 99) // 100} (de 100 eventos c/u)")
                else:
                    print(f"\n❌ {status.upper()}: {progress.get('message', '')}")
                break
    
    print("\n" + "=" * 60)
    print("📝 NOTAS:")
    print("   - Los eventos aparecerán en Meta en 5-10 minutos")
    print("   - Verifica en: Events Manager > Dataset ID 1182254526484927")
    print("   - Los GETs que ves en logs son para monitorear progreso")
    print("   - Los POSTs a Meta ocurren en el backend (no visibles aquí)")
    print("=" * 60)

if __name__ == "__main__":
    test_large_file()
