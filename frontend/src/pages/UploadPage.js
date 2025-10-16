import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import './UploadPage.css';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export function UploadPage() {
    const DATASET_ID = '1182254526484927'; // Hardcoded dataset ID
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
    const canSubmit = useMemo(() => fileName.length > 0, [fileName]);
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
            form.append('dataset_id', DATASET_ID);
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
    async function cancelJob() {
        if (!jobId)
            return;
        if (!confirm('¿Estás seguro de cancelar este proceso?'))
            return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/cancel`, { method: 'POST' });
            if (res.ok) {
                setError(null);
            }
            else {
                const text = await res.text();
                setError(`Error al cancelar: ${text}`);
            }
        }
        catch (err) {
            setError(`Error al cancelar: ${err.message}`);
        }
    }
    async function cancelAllJobs() {
        if (!confirm('¿Estás seguro de CANCELAR TODOS los procesos activos?'))
            return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/jobs/cancel-all`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                alert(`✅ ${data.message}`);
            }
            else {
                const text = await res.text();
                alert(`❌ Error: ${text}`);
            }
        }
        catch (err) {
            alert(`❌ Error: ${err.message}`);
        }
    }
    return (_jsxs("div", { className: "container", children: [_jsxs("header", { className: "header", children: [_jsx("img", { src: "/logo.png", alt: "Logo", className: "logo" }), _jsx("h1", { className: "title", children: "CAPI Offline CSV Uploader" }), _jsx("p", { className: "subtitle", children: "Sube tus ventas offline a Meta Conversions API" }), _jsx("button", { onClick: cancelAllJobs, className: "btn-kill-all", style: {
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem'
                        }, children: "\uD83D\uDED1 Cancelar todos los procesos" }), import.meta.env.DEV && (_jsxs("div", { style: {
                            background: '#fef3c7',
                            border: '2px solid #f59e0b',
                            borderRadius: '8px',
                            padding: '0.5rem 1rem',
                            marginTop: '1rem',
                            fontSize: '0.85rem',
                            color: '#92400e'
                        }, children: ["\uD83D\uDD27 Dev Mode - API: ", API_BASE_URL] }))] }), _jsx("div", { className: "card", children: _jsxs("form", { onSubmit: handleSubmit, className: "form", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "upload-tag", children: "Etiqueta del upload (opcional)" }), _jsx("input", { id: "upload-tag", type: "text", value: uploadTag, onChange: (e) => setUploadTag(e.target.value), placeholder: "fybeca-septiembre-2025", className: "input" }), _jsx("span", { style: { fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }, children: "Ayuda a identificar este lote de datos en Meta" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Archivo CSV *" }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".csv,.CSV", onChange: handleFileChange, style: { display: 'none' } }), _jsxs("div", { className: "file-input-wrapper", children: [_jsx("button", { type: "button", onClick: triggerFileInput, className: "btn-file", children: "\uD83D\uDCC1 Seleccionar archivo" }), _jsx("span", { className: "file-name", children: fileName || 'Ningún archivo seleccionado' })] })] }), _jsx("button", { type: "submit", disabled: !canSubmit || isUploading, className: "btn-primary", children: warming ? '⏳ Iniciando servidor...' : isUploading ? '📤 Subiendo...' : '🚀 Subir y procesar' })] }) }), isUploading && uploadProgress > 0 && (_jsxs("div", { className: "card upload-progress", children: [_jsx("h2", { className: "section-title", children: "\uD83D\uDCE4 Subiendo archivo..." }), _jsx("div", { className: "progress-bar", children: _jsx("div", { className: "progress-fill progress-fill-animated", style: { width: `${uploadProgress}%` } }) }), _jsxs("p", { className: "progress-text", children: [Math.round(uploadProgress), "%"] }), _jsx("p", { style: { textAlign: 'center', color: '#374151', fontWeight: 500, marginBottom: '0.5rem' }, children: fileName }), _jsxs("p", { style: { textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }, children: [uploadProgress < 20 && '🔄 Iniciando transferencia...', uploadProgress >= 20 && uploadProgress < 50 && '📡 Enviando datos al servidor...', uploadProgress >= 50 && uploadProgress < 85 && `⚡ Transferencia en progreso... (archivos grandes pueden tardar varios minutos)`, uploadProgress >= 85 && uploadProgress < 95 && '🔄 Finalizando upload...', uploadProgress >= 95 && '✅ Guardando en servidor y preparando procesamiento...'] }), _jsx("p", { style: { textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.5rem' }, children: "\uD83D\uDCA1 No cierres esta ventana. Archivos de 300 MB pueden tardar 2-3 minutos." })] })), error && (_jsxs("div", { className: "alert alert-error", children: [_jsx("strong", { children: "Error:" }), " ", error, _jsxs("details", { style: { marginTop: '0.5rem', fontSize: '0.85rem' }, children: [_jsx("summary", { style: { cursor: 'pointer', color: '#991b1b', fontWeight: 600 }, children: "\uD83D\uDD0D Informaci\u00F3n de diagn\u00F3stico" }), _jsxs("div", { style: { marginTop: '0.5rem', padding: '0.5rem', background: '#fef2f2', borderRadius: '4px' }, children: [_jsxs("p", { children: [_jsx("strong", { children: "Backend URL:" }), " ", API_BASE_URL] }), _jsxs("p", { children: [_jsx("strong", { children: "Test endpoint:" }), " ", _jsxs("a", { href: `${API_BASE_URL}/api/health`, target: "_blank", rel: "noopener noreferrer", style: { color: '#991b1b', textDecoration: 'underline' }, children: [API_BASE_URL, "/api/health"] })] }), _jsx("p", { style: { fontSize: '0.8rem', marginTop: '0.5rem' }, children: "\uD83D\uDCA1 Si el link de arriba no abre, el backend no est\u00E1 accesible." })] })] })] })), progress && (_jsxs("div", { className: "card", children: [_jsx("h2", { className: "section-title", children: "\uD83D\uDCCA Progreso del Procesamiento" }), _jsx("div", { className: "progress-bar", children: _jsx("div", { className: "progress-fill", style: { width: `${progressPercent}%` } }) }), _jsxs("p", { className: "progress-text", children: [progressPercent, "%"] }), _jsxs("div", { className: "stats", children: [_jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Estado" }), _jsxs("span", { className: `stat-value status-${progress.status}`, children: [progress.status === 'running' && '⚙️ Procesando', progress.status === 'completed' && '✅ Completado', progress.status === 'failed' && '❌ Falló', progress.status === 'pending' && '⏳ Pendiente'] })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Filas procesadas" }), _jsxs("span", { className: "stat-value", children: [progress.processed_rows.toLocaleString(), " / ", progress.total_rows.toLocaleString()] })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Exitosas" }), _jsx("span", { className: "stat-value stat-success", children: progress.succeeded.toLocaleString() })] }), _jsxs("div", { className: "stat", children: [_jsx("span", { className: "stat-label", children: "Errores" }), _jsx("span", { className: "stat-value stat-error", children: progress.failed.toLocaleString() })] })] }), progress.message && (_jsxs("div", { className: "message", children: [_jsx("strong", { children: "Mensaje:" }), " ", progress.message] })), _jsxs("div", { style: { display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }, children: [progress.failed > 0 && (_jsx("button", { onClick: downloadErrors, className: "btn-secondary", children: "\uD83D\uDCE5 Descargar errores" })), progress.status === 'running' && (_jsx("button", { onClick: cancelJob, className: "btn-danger", children: "\u23F9\uFE0F Cancelar proceso" }))] })] }))] }));
}
