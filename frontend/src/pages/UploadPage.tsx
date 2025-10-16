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
  const [datasetId, setDatasetId] = useState('')
  const [timezone, setTimezone] = useState('America/Guayaquil')
  const [uploadTag, setUploadTag] = useState('')
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<JobProgress | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warming, setWarming] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [fileName, setFileName] = useState<string>('')
  
  const canSubmit = useMemo(() => datasetId.trim().length > 0 && fileName.length > 0, [datasetId, fileName])
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
      form.append('dataset_id', datasetId)
      if (uploadTag) form.append('upload_tag', uploadTag)
      if (timezone) form.append('timezone', timezone)

      // Timeout de 60s para cold start de Render Free
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 60000)

      const res = await fetch(`${API_BASE_URL}/api/uploads`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      })
      clearTimeout(timeout)
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
        setError('Timeout: El servidor tardó mucho en responder. Intenta nuevamente en 30 segundos.')
      } else {
        setError(err?.message || 'Error desconocido')
      }
    } finally {
      setIsUploading(false)
      setWarming(false)
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
      </header>

      <div className="card">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="dataset-id">Dataset ID *</label>
            <input
              id="dataset-id"
              type="text"
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              required
              placeholder="1182254526484927"
              className="input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="timezone">Timezone</label>
              <input
                id="timezone"
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="America/Guayaquil"
                className="input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="upload-tag">Upload tag (opcional)</label>
              <input
                id="upload-tag"
                type="text"
                value={uploadTag}
                onChange={(e) => setUploadTag(e.target.value)}
                placeholder="fybeca-sept-2025"
                className="input"
              />
            </div>
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

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
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


