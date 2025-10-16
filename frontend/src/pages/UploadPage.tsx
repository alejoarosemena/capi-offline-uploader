import React, { useMemo, useRef, useState } from 'react'
import './UploadPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

type JobProgress = {
  job_id: string
  total_rows: number
  processed_rows: number
  succeeded: number
  failed: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  message: string
}

export function UploadPage(): JSX.Element {
  const DATASET_ID = '1182254526484927' // Hardcoded dataset ID
  const [timezone, setTimezone] = useState('America/Guayaquil')
  const [uploadTag, setUploadTag] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<JobProgress | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warming, setWarming] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [fileName, setFileName] = useState<string>('')
  
  const canSubmit = useMemo(() => fileName.length > 0, [fileName])
  const progressPercent = progress ? Math.round((progress.processed_rows / progress.total_rows) * 100) || 0 : 0

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setFileName(file?.name || '')
  }

  function triggerFileInput() {
    fileInputRef.current?.click()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setUploadProgress(0)
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('Selecciona un archivo CSV')
      return
    }
    setIsUploading(true)
    setWarming(true)
    
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('dataset_id', DATASET_ID)
      if (uploadTag) form.append('upload_tag', uploadTag)
      if (timezone) form.append('timezone', timezone)

      // Usar XMLHttpRequest para progreso REAL del upload
      const xhr = new XMLHttpRequest()
      
      // Crear una promesa para manejar el resultado
      const uploadPromise = new Promise<{ job_id: string }>((resolve, reject) => {
        // Progreso REAL del upload
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100)
            setUploadProgress(percentComplete)
            console.log(`Upload real: ${percentComplete}% (${(e.loaded / (1024*1024)).toFixed(1)}MB / ${(e.total / (1024*1024)).toFixed(1)}MB)`)
          }
        })

        // Cuando termina el upload
        xhr.addEventListener('load', () => {
          setWarming(false)
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText)
              resolve(response)
            } catch (err) {
              reject(new Error('Error al parsear respuesta del servidor'))
            }
          } else {
            reject(new Error(xhr.responseText || `Error HTTP ${xhr.status}`))
          }
        })

        // Manejo de errores
        xhr.addEventListener('error', () => {
          reject(new Error('Error de red al subir el archivo'))
        })

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelado'))
        })

        xhr.addEventListener('timeout', () => {
          reject(new Error('Timeout: El archivo es muy grande o la conexión es lenta'))
        })
      })

      // Configurar y enviar request
      xhr.open('POST', `${API_BASE_URL}/api/uploads`)
      xhr.timeout = 300000 // 5 minutos para archivos grandes
      xhr.send(form)

      // Esperar resultado
      const { job_id } = await uploadPromise
      setJobId(job_id)
      setUploadProgress(100)
      await pollProgress(job_id)
    } catch (err: any) {
      setError(err?.message || 'Error desconocido')
    } finally {
      setIsUploading(false)
      setWarming(false)
      setUploadProgress(0)
    }
  }

  async function pollProgress(jobId: string) {
    let done = false
    while (!done) {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`)
      if (!res.ok) throw new Error('No se pudo consultar progreso')
      const data = (await res.json()) as JobProgress
      setProgress(data)
      if (data.status === 'completed' || data.status === 'failed') {
        done = true
        break
      }
      await new Promise((r) => setTimeout(r, 1500))
    }
  }

  function downloadErrors() {
    if (!jobId) return
    window.open(`${API_BASE_URL}/api/jobs/${jobId}/errors`, '_blank')
  }

  async function cancelJob() {
    if (!jobId) return
    if (!confirm('¿Estás seguro de cancelar este proceso?')) return
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/cancel`, { method: 'POST' })
      if (res.ok) {
        setError(null)
      } else {
        const text = await res.text()
        setError(`Error al cancelar: ${text}`)
      }
    } catch (err: any) {
      setError(`Error al cancelar: ${err.message}`)
    }
  }

  async function cancelAllJobs() {
    if (!confirm('¿Estás seguro de CANCELAR TODOS los procesos activos?')) return
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/cancel-all`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        alert(`✅ ${data.message}`)
      } else {
        const text = await res.text()
        alert(`❌ Error: ${text}`)
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`)
    }
  }

  return (
    <div className="container">
      <header className="header">
        <img src="/logo.png" alt="Logo" className="logo" />
        <h1 className="title">CAPI Offline CSV Uploader</h1>
        <p className="subtitle">Sube tus ventas offline a Meta Conversions API</p>
        <button 
          onClick={cancelAllJobs} 
          className="btn-kill-all"
          style={{ 
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            fontSize: '0.9rem'
          }}
        >
          🛑 Cancelar todos los procesos
        </button>
        {import.meta.env.DEV && (
          <div style={{ 
            background: '#fef3c7', 
            border: '2px solid #f59e0b', 
            borderRadius: '8px', 
            padding: '0.5rem 1rem', 
            marginTop: '1rem',
            fontSize: '0.85rem',
            color: '#92400e'
          }}>
            🔧 Dev Mode - API: {API_BASE_URL}
          </div>
        )}
      </header>

      <div className="card">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="upload-tag">Etiqueta del upload (opcional)</label>
            <input
              id="upload-tag"
              type="text"
              value={uploadTag}
              onChange={(e) => setUploadTag(e.target.value)}
              placeholder="fybeca-septiembre-2025"
              className="input"
            />
            <span style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Ayuda a identificar este lote de datos en Meta
            </span>
          </div>

          <div className="form-group">
            <label>Archivo CSV *</label>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".csv,.CSV" 
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div className="file-input-wrapper">
              <button type="button" onClick={triggerFileInput} className="btn-file">
                📁 Seleccionar archivo
              </button>
              <span className="file-name">{fileName || 'Ningún archivo seleccionado'}</span>
            </div>
          </div>

          <button type="submit" disabled={!canSubmit || isUploading} className="btn-primary">
            {warming ? '⏳ Iniciando servidor...' : isUploading ? '📤 Subiendo...' : '🚀 Subir y procesar'}
          </button>
        </form>
      </div>

      {isUploading && uploadProgress > 0 && (
        <div className="card upload-progress">
          <h2 className="section-title">📤 Subiendo archivo...</h2>
          <div className="progress-bar">
            <div className="progress-fill progress-fill-animated" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="progress-text">{Math.round(uploadProgress)}%</p>
          <p style={{ textAlign: 'center', color: '#374151', fontWeight: 500, marginBottom: '0.5rem' }}>
            {fileName}
          </p>
          <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
            {uploadProgress < 10 && '🔄 Conectando con el servidor...'}
            {uploadProgress >= 10 && uploadProgress < 30 && '📡 Iniciando transferencia de datos...'}
            {uploadProgress >= 30 && uploadProgress < 70 && `⚡ Transfiriendo archivo... (${Math.round(uploadProgress)}% completado)`}
            {uploadProgress >= 70 && uploadProgress < 95 && '📤 Finalizando transferencia...'}
            {uploadProgress >= 95 && '✅ Archivo recibido, iniciando procesamiento...'}
          </p>
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            💡 No cierres esta ventana. Archivos de 300 MB pueden tardar 2-3 minutos.
          </p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
          <details style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            <summary style={{ cursor: 'pointer', color: '#991b1b', fontWeight: 600 }}>🔍 Información de diagnóstico</summary>
            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fef2f2', borderRadius: '4px' }}>
              <p><strong>Backend URL:</strong> {API_BASE_URL}</p>
              <p><strong>Test endpoint:</strong> <a href={`${API_BASE_URL}/api/health`} target="_blank" rel="noopener noreferrer" style={{ color: '#991b1b', textDecoration: 'underline' }}>
                {API_BASE_URL}/api/health
              </a></p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                💡 Si el link de arriba no abre, el backend no está accesible.
              </p>
            </div>
          </details>
        </div>
      )}

      {progress && (
        <div className="card">
          <h2 className="section-title">📊 Progreso del Procesamiento</h2>
          
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="progress-text">{progressPercent}%</p>

          <div className="stats">
            <div className="stat">
              <span className="stat-label">Estado</span>
              <span className={`stat-value status-${progress.status}`}>
                {progress.status === 'running' && '⚙️ Procesando'}
                {progress.status === 'completed' && '✅ Completado'}
                {progress.status === 'failed' && '❌ Falló'}
                {progress.status === 'pending' && '⏳ Pendiente'}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Filas procesadas</span>
              <span className="stat-value">{progress.processed_rows.toLocaleString()} / {progress.total_rows.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Exitosas</span>
              <span className="stat-value stat-success">{progress.succeeded.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Errores</span>
              <span className="stat-value stat-error">{progress.failed.toLocaleString()}</span>
            </div>
          </div>

          {progress.message && (
            <div className="message">
              <strong>Mensaje:</strong> {progress.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {progress.failed > 0 && (
              <button onClick={downloadErrors} className="btn-secondary">
                📥 Descargar errores
              </button>
            )}
            {progress.status === 'running' && (
              <button onClick={cancelJob} className="btn-danger">
                ⏹️ Cancelar proceso
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


