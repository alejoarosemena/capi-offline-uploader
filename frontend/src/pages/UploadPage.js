import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export function UploadPage() {
    const [datasetId, setDatasetId] = useState('');
    const [timezone, setTimezone] = useState('America/Guayaquil');
    const [uploadTag, setUploadTag] = useState('');
    const [jobId, setJobId] = useState(null);
    const [progress, setProgress] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const canSubmit = useMemo(() => datasetId.trim().length > 0, [datasetId]);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            setError('Selecciona un archivo CSV');
            return;
        }
        setIsUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            form.append('dataset_id', datasetId);
            if (uploadTag)
                form.append('upload_tag', uploadTag);
            if (timezone)
                form.append('timezone', timezone);
            const res = await fetch(`${API_BASE_URL}/api/uploads`, {
                method: 'POST',
                body: form,
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Error al iniciar upload');
            }
            const { job_id } = await res.json();
            setJobId(job_id);
            await pollProgress(job_id);
        }
        catch (err) {
            setError(err?.message || 'Error desconocido');
        }
        finally {
            setIsUploading(false);
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
    return (_jsxs("div", { style: { maxWidth: 680, margin: '0 auto', padding: 24 }, children: [_jsx("h1", { children: "CAPI Offline CSV Uploader" }), _jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("label", { children: ["Dataset ID", _jsx("input", { value: datasetId, onChange: (e) => setDatasetId(e.target.value), required: true, placeholder: "Ej: 123456789012345" })] }), _jsxs("label", { children: ["Timezone", _jsx("input", { value: timezone, onChange: (e) => setTimezone(e.target.value), placeholder: "America/Guayaquil" })] }), _jsxs("label", { children: ["Upload tag (opcional)", _jsx("input", { value: uploadTag, onChange: (e) => setUploadTag(e.target.value), placeholder: "sept-2025-fybeca" })] }), _jsxs("label", { children: ["Archivo CSV", _jsx("input", { ref: fileInputRef, type: "file", accept: ".csv" })] }), _jsx("button", { type: "submit", disabled: !canSubmit || isUploading, children: isUploading ? 'Subiendo…' : 'Subir y procesar' })] }) }), error && _jsx("p", { style: { color: 'red', marginTop: 12 }, children: error }), progress && (_jsxs("div", { style: { marginTop: 24 }, children: [_jsx("h2", { children: "Progreso" }), _jsxs("p", { children: ["Estado: ", _jsx("strong", { children: progress.status })] }), _jsxs("p", { children: [progress.processed_rows, "/", progress.total_rows, " procesadas \u2014 OK: ", progress.succeeded, " \u00B7 Errores: ", progress.failed] }), progress.message && _jsxs("p", { children: ["Mensaje: ", progress.message] }), _jsx("button", { onClick: downloadErrors, disabled: !jobId, children: "Descargar errores" })] }))] }));
}
