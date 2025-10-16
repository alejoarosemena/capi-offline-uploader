import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import './UploadPage.css';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export function UploadPage() {
    const [datasetId, setDatasetId] = useState('');
    const [timezone, setTimezone] = useState('America/Guayaquil');
    const [uploadTag, setUploadTag] = useState('');
    const [jobId, setJobId] = useState(null);
    const [progress, setProgress] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [warming, setWarming] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    const [fileName, setFileName] = useState('');
    const canSubmit = useMemo(() => datasetId.trim().length > 0 && fileName.length > 0, [datasetId, fileName]);
    const progressPercent = progress ? Math.round((progress.processed_rows / progress.total_rows) * 100) || 0 : 0;
    function handleFileChange(e) {
        const file = e.target.files?.[0];
        setFileName(file?.name || '');
    }
    function triggerFileInput() {
        fileInputRef.current?.click();
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setUploadProgress(0);
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            setError('Selecciona un archivo CSV');
            return;
        }
        setIsUploading(true);
        setWarming(true);
        try {
            const form = new FormData();
            form.append('file', file);
            form.append('dataset_id', datasetId);
            if (uploadTag)
                form.append('upload_tag', uploadTag);
            if (timezone)
                form.append('timezone', timezone);
            // Simular progreso del upload basado en el tamaño del archivo
            const fileSize = file.size;
            const fileSizeMB = fileSize / (1024 * 1024);
            // Estimación: ~2-5 MB/s dependiendo de conexión
            const estimatedTime = Math.max(10000, (fileSize / 3000000) * 1000); // Mínimo 10s, ~3MB/s
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 90)
                        return prev; // Mantener en 90% hasta que responda el servidor
                    return prev + (100 / (estimatedTime / 500)); // Incremento suave
                });
            }, 500);
            const controller = new AbortController();
            // Timeout generoso para archivos grandes: 5 minutos para 300MB
            const timeout = setTimeout(() => controller.abort(), 300000);
            const res = await fetch(`${API_BASE_URL}/api/uploads`, {
                method: 'POST',
                body: form,
                signal: controller.signal,
            });
            clearInterval(progressInterval);
            clearTimeout(timeout);
            setUploadProgress(100);
            setWarming(false);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Error al iniciar upload');
            }
            const { job_id } = await res.json();
            setJobId(job_id);
            await pollProgress(job_id);
        }
        catch (err) {
            if (err.name === 'AbortError') {
                setError('⏳ Timeout: El archivo es muy grande o la conexión es lenta. Intenta con un archivo más pequeño o mejora tu conexión.');
            }
            else {
                setError(err?.message || 'Error desconocido');
            }
        }
        finally {
            setIsUploading(false);
            setWarming(false);
            setUploadProgress(0);
        }
    }
    async function pollProgress(jobId) {
        let done = false;
        while (!done) {
            const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
            if (!res.ok)
                throw new Error('No se pudo consultar progreso');
            const data = (await res.json());
            setProgress(data);
            if (data.status === 'completed' || data.status === 'failed') {
                done = true;
                break;
            }
            await new Promise((r) => setTimeout(r, 1500));
        }
    }
    function downloadErrors() {
        if (!jobId)
            return;
        window.open(`${API_BASE_URL}/api/jobs/${jobId}/errors`, '_blank');
    }
    return (_jsxs("div", { className: "container", children: [_jsxs("header", { className: "header", children: [_jsx("img", { src: "/logo.png", alt: "Logo", className: "logo" }), _jsx("h1", { className: "title", children: "CAPI Offline CSV Uploader" }), _jsx("p", { className: "subtitle", children: "Sube tus ventas offline a Meta Conversions API" })] }), _jsx("div", { className: "card", children: _jsxs("form", { onSubmit: handleSubmit, className: "form", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "dataset-id", children: "Dataset ID *" }), _jsx("input", { id: "dataset-id", type: "text", value: datasetId, onChange: (e) => setDatasetId(e.target.value), required: true, placeholder: "1182254526484927", className: "input" })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "timezone", children: "Timezone" }), _jsx("input", { id: "timezone", type: "text", value: timezone, onChange: (e) => setTimezone(e.target.value), placeholder: "America/Guayaquil", className: "input" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "upload-tag", children: "Upload tag (opcional)" }), _jsx("input", { id: "upload-tag", type: "text", value: uploadTag, onChange: (e) => setUploadTag(e.target.value), placeholder: "fybeca-sept-2025", className: "input" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Archivo CSV *" }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".csv,.CSV", onChange: handleFileChange, style: { display: 'none' } }), _jsxs("div", { className: "file-input-wrapper", children: [_jsx("button", { type: "button", onClick: triggerFileInput, className: "btn-file", children: "\uD83D\uDCC1 Seleccionar archivo" }), _jsx("span", { className: "file-name", children: fileName || 'Ningún archivo seleccionado' })] })] }), _jsx("button", { type: "submit", disabled: !canSubmit || isUploading, className: "btn-primary", children: warming ? '⏳ Iniciando servidor...' : isUploading ? '📤 Subiendo...' : '🚀 Subir y procesar' })] }) }), isUploading && uploadProgress > 0 && (_jsxs("div", { className: "card upload-progress", children: [_jsx("h2", { className: "section-title", children: "\uD83D\uDCE4 Subiendo archivo..." }), _jsx("div", { className: "progress-bar", children: _jsx("div", { className: "progress-fill progress-fill-animated", style: { width: `${uploadProgress}%` } }) }), _jsxs("p", { className: "progress-text", children: [Math.round(uploadProgress), "%"] }), _jsx("p", { style: { textAlign: 'center', color: '#374151', fontWeight: 500, marginBottom: '0.5rem' }, children: fileName }), _jsxs("p", { style: { textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }, children: [uploadProgress < 20 && '🔄 Iniciando transferencia...', uploadProgress >= 20 && uploadProgress < 50 && '📡 Enviando datos al servidor...', uploadProgress >= 50 && uploadProgress < 85 && `⚡ Transferencia en progreso... (archivos grandes pueden tardar varios minutos)`, uploadProgress >= 85 && uploadProgress < 95 && '🔄 Finalizando upload...', uploadProgress >= 95 && '✅ Guardando en servidor y preparando procesamiento...'] }), _jsx("p", { style: { textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.5rem' }, children: "\uD83D\uDCA1 No cierres esta ventana. Archivos de 300 MB pueden tardar 2-3 minutos." })] })), error && (_jsxs("div", { className: "alert alert-error", children: [_jsx("strong", { children: "Error:" }), " ", error] })), progress && (_jsxs("div", { className: "card", children: [_jsx("h2", { className: "section-title", children: "\uD83D\uDCCA Progreso del Procesamiento" }), _jsx("div", { className: "progress-bar", children: _jsx("div", { className: "progress-fill", style: { width: `${progressPercent}%` } }) }), _jsxs("p", { className: "progress-text", children: [progressPercent, "%"] }), _jsxs("div", { className: "stats", children: [_jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Estado" }), _jsxs("span", { className: `stat-value status-${progress.status}`, children: [progress.status === 'running' && '⚙️ Procesando', progress.status === 'completed' && '✅ Completado', progress.status === 'failed' && '❌ Falló', progress.status === 'pending' && '⏳ Pendiente'] })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Filas procesadas" }), _jsxs("span", { className: "stat-value", children: [progress.processed_rows.toLocaleString(), " / ", progress.total_rows.toLocaleString()] })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Exitosas" }), _jsx("span", { className: "stat-value stat-success", children: progress.succeeded.toLocaleString() })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Errores" }), _jsx("span", { className: "stat-value stat-error", children: progress.failed.toLocaleString() })] })] }), progress.message && (_jsxs("div", { className: "message", children: [_jsx("strong", { children: "Mensaje:" }), " ", progress.message] })), progress.failed > 0 && (_jsx("button", { onClick: downloadErrors, className: "btn-secondary", children: "\uD83D\uDCE5 Descargar reporte de errores" }))] }))] }));
}
