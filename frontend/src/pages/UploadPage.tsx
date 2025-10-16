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

      // Simular progreso del upload basado en el tamaño del archivo
      const fileSize = file.size
      const fileSizeMB = fileSize / (1024 * 1024)
      // Estimación: ~2-5 MB/s dependiendo de conexión
      const estimatedTime = Math.max(10000, (fileSize / 3000000) * 1000) // Mínimo 10s, ~3MB/s
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev // Mantener en 90% hasta que responda el servidor
          return prev + (100 / (estimatedTime / 500)) // Incremento suave
        })
      }, 500)

      const controller = new AbortController()
      // Timeout generoso para archivos grandes: 5 minutos para 300MB
      const timeout = setTimeout(() => controller.abort(), 300000)

      const res = await fetch(`${API_BASE_URL}/api/uploads`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      })
      
      clearInterval(progressInterval)
      clearTimeout(timeout)
      setUploadProgress(100)
      setWarming(false)

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Error al iniciar upload')
      }
      const { job_id } = await res.json()
      setJobId(job_id)
      await pollProgress(job_id)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('⏳ Timeout: El archivo es muy grande o la conexión es lenta. Intenta con un archivo más pequeño o mejora tu conexión.')
      } else {
        setError(err?.message || 'Error desconocido')
      }
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

  return (
    <div className="container">
      <header className="header">
        <img src="/logo.png" alt="Logo" className="logo" />
        <h1 className="title">CAPI Offline CSV Uploader</h1>
        <p className="subtitle">Sube tus ventas offline a Meta Conversions API</p>
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
            {uploadProgress < 20 && '🔄 Iniciando transferencia...'}
            {uploadProgress >= 20 && uploadProgress < 50 && '📡 Enviando datos al servidor...'}
            {uploadProgress >= 50 && uploadProgress < 85 && `⚡ Transferencia en progreso... (archivos grandes pueden tardar varios minutos)`}
            {uploadProgress >= 85 && uploadProgress < 95 && '🔄 Finalizando upload...'}
            {uploadProgress >= 95 && '✅ Guardando en servidor y preparando procesamiento...'}
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

          {progress.failed > 0 && (
            <button onClick={downloadErrors} className="btn-secondary">
              📥 Descargar reporte de errores
            </button>
          )}
        </div>
      )}
    </div>
  )
}


