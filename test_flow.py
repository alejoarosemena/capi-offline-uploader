#!/usr/bin/env python3
"""Test completo del flujo de upload a Meta"""
import requests
import time
import csv
import io

# Configuración
API_BASE = "https://capi-offline-uploader.onrender.com"
# API_BASE = "http://localhost:8000"  # Descomentar para probar local

def create_test_csv():
    """Crear un CSV de prueba con 5 filas"""
    csv_content = """CORREO,CELULAR,FACTURA,NOMBRE_CATEGORIA,COD_ITEM,VENTA_NETA,FECHA
test1@example.com,+593987654321,TEST001,CATEGORIA TEST,ITEM001,10.50,2025-10-01
test2@example.com,+593987654322,TEST002,CATEGORIA TEST,ITEM002,20.75,2025-10-02
test3@example.com,+593987654323,TEST003,CATEGORIA TEST,ITEM003,15.00,2025-10-03
test4@example.com,+593987654324,TEST004,CATEGORIA TEST,ITEM004,30.25,2025-10-04
test5@example.com,+593987654325,TEST005,CATEGORIA TEST,ITEM005,25.50,2025-10-05"""
    return csv_content.encode('utf-8')

def test_upload():
    print("=" * 60)
    print("🧪 TEST DE FLUJO COMPLETO - CAPI OFFLINE UPLOADER")
    print("=" * 60)
    
    # 1. Verificar health
    print("\n1️⃣ Verificando backend...")
    try:
        resp = requests.get(f"{API_BASE}/api/health")
        if resp.status_code == 200:
            print("   ✅ Backend respondiendo")
        else:
            print(f"   ❌ Backend error: {resp.status_code}")
            return
    except Exception as e:
        print(f"   ❌ No se puede conectar al backend: {e}")
        return
    
    # 2. Crear y subir CSV de prueba
    print("\n2️⃣ Subiendo CSV de prueba (5 filas)...")
    csv_data = create_test_csv()
    
    files = {
        'file': ('test.csv', io.BytesIO(csv_data), 'text/csv')
    }
    data = {
        'dataset_id': '1182254526484927',
        'upload_tag': 'test-python-script',
        'timezone': 'America/Guayaquil'
    }
    
    try:
        resp = requests.post(f"{API_BASE}/api/uploads", files=files, data=data)
        if resp.status_code == 200:
            job_data = resp.json()
            job_id = job_data['job_id']
            print(f"   ✅ Upload exitoso. Job ID: {job_id}")
        else:
            print(f"   ❌ Error en upload: {resp.status_code} - {resp.text}")
            return
    except Exception as e:
        print(f"   ❌ Error al subir: {e}")
        return
    
    # 3. Monitorear progreso
    print("\n3️⃣ Monitoreando progreso...")
    max_attempts = 30  # Máximo 30 intentos (45 segundos)
    attempt = 0
    
    while attempt < max_attempts:
        time.sleep(1.5)
        try:
            resp = requests.get(f"{API_BASE}/api/jobs/{job_id}")
            if resp.status_code == 200:
                progress = resp.json()
                status = progress['status']
                processed = progress.get('processed_rows', 0)
                total = progress.get('total_rows', 0)
                succeeded = progress.get('succeeded', 0)
                failed = progress.get('failed', 0)
                
                print(f"   Status: {status} | Procesadas: {processed}/{total} | OK: {succeeded} | Errores: {failed}")
                
                if status in ['completed', 'failed', 'cancelled']:
                    if status == 'completed':
                        print(f"\n   ✅ COMPLETADO: {succeeded} eventos enviados a Meta")
                    else:
                        print(f"\n   ❌ {status.upper()}: {progress.get('message', 'Sin mensaje')}")
                    break
            else:
                print(f"   ⚠️ Error al consultar progreso: {resp.status_code}")
        except Exception as e:
            print(f"   ⚠️ Error: {e}")
        
        attempt += 1
    
    if attempt >= max_attempts:
        print("\n   ⏱️ Timeout - el proceso está tardando más de lo esperado")
    
    # 4. Verificar si hay errores
    print("\n4️⃣ Verificando errores...")
    try:
        resp = requests.get(f"{API_BASE}/api/jobs/{job_id}/errors")
        if resp.status_code == 200:
            print(f"   ⚠️ Hay archivo de errores disponible")
        else:
            print(f"   ✅ No hay errores registrados")
    except:
        pass
    
    print("\n" + "=" * 60)
    print("📊 RESUMEN:")
    print(f"   - Job ID: {job_id}")
    print(f"   - Dataset: 1182254526484927")
    print(f"   - Upload tag: test-python-script")
    print("   - Verifica en Meta Events Manager en 5-10 minutos")
    print("=" * 60)

if __name__ == "__main__":
    test_upload()
