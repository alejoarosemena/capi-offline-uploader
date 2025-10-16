import React, { useMemo, useRef, useState } from 'react'

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
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const canSubmit = useMemo(() => datasetId.trim().length > 0, [datasetId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('Selecciona un archivo CSV')
      return
    }
    setIsUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('dataset_id', datasetId)
      if (uploadTag) form.append('upload_tag', uploadTag)
      if (timezone) form.append('timezone', timezone)

      const res = await fetch(`${API_BASE_URL}/api/uploads`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Error al iniciar upload')
      }
      const { job_id } = await res.json()
      setJobId(job_id)
      await pollProgress(job_id)
    } catch (err: any) {
      setError(err?.message || 'Error desconocido')
    } finally {
      setIsUploading(false)
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
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 24 }}>
      <h1>CAPI Offline CSV Uploader</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: 12 }}>
          <label>
            Dataset ID
            <input
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              required
              placeholder="Ej: 123456789012345"
            />
          </label>

          <label>
            Timezone
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Guayaquil" />
          </label>

          <label>
            Upload tag (opcional)
            <input value={uploadTag} onChange={(e) => setUploadTag(e.target.value)} placeholder="sept-2025-fybeca" />
          </label>

          <label>
            Archivo CSV
            <input ref={fileInputRef} type="file" accept=".csv" />
          </label>

          <button type="submit" disabled={!canSubmit || isUploading}>
            {isUploading ? 'Subiendo…' : 'Subir y procesar'}
          </button>
        </div>
      </form>

      {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}

      {progress && (
        <div style={{ marginTop: 24 }}>
          <h2>Progreso</h2>
          <p>
            Estado: <strong>{progress.status}</strong>
          </p>
          <p>
            {progress.processed_rows}/{progress.total_rows} procesadas — OK: {progress.succeeded} · Errores: {progress.failed}
          </p>
          {progress.message && <p>Mensaje: {progress.message}</p>}
          <button onClick={downloadErrors} disabled={!jobId}>
            Descargar errores
          </button>
        </div>
      )}
    </div>
  )
}


