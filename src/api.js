const API_BASE = '';

function buildForm(imageFile, threshold, extra = {}) {
    const form = new FormData();
    form.append('image', imageFile);
    form.append('threshold', String(threshold));
    for (const [key, value] of Object.entries(extra)) {
        form.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    return form;
}

async function handleResponse(res) {
    if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            if (body.detail) message = body.detail;
        } catch { /* ignore */ }
        throw new Error(message);
    }
}

// Health check
export async function checkHealth() {
    const res = await fetch(`${API_BASE}/health`);
    await handleResponse(res);
    return res.json();
}

// Auto mode — JSON
export async function predictAuto(imageFile, threshold = 0.33) {
    const res = await fetch(`${API_BASE}/predict_auto`, {
        method: 'POST',
        body: buildForm(imageFile, threshold),
    });
    await handleResponse(res);
    return res.json();
}

// Auto mode — image
export async function predictAutoImage(imageFile, threshold = 0.33) {
    const res = await fetch(`${API_BASE}/predict_auto/image`, {
        method: 'POST',
        body: buildForm(imageFile, threshold),
    });
    await handleResponse(res);
    const count = parseInt(res.headers.get('X-Count'), 10) || null;
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), count };
}

// Point mode — JSON
export async function predictPointJson(imageFile, points, labels, threshold = 0.33) {
    const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        body: buildForm(imageFile, threshold, { points, labels }),
    });
    await handleResponse(res);
    return res.json();
}

// Point mode — image
export async function predictPointImage(imageFile, points, labels, threshold = 0.33) {
    const res = await fetch(`${API_BASE}/predict/image`, {
        method: 'POST',
        body: buildForm(imageFile, threshold, { points, labels }),
    });
    await handleResponse(res);
    const count = parseInt(res.headers.get('X-Count'), 10) || null;
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), count };
}

// BBox mode — JSON
export async function predictBBoxJson(imageFile, bboxes, threshold = 0.33) {
    const res = await fetch(`${API_BASE}/predict_bbox`, {
        method: 'POST',
        body: buildForm(imageFile, threshold, { bboxes }),
    });
    await handleResponse(res);
    return res.json();
}

// Debug: density map
export async function fetchDensityMap(imageFile) {
    const form = new FormData();
    form.append('image', imageFile);

    const res = await fetch(`${API_BASE}/debug/density_map`, {
        method: 'POST',
        body: form,
    });
    await handleResponse(res);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

// BBox mode — image
export async function predictBBoxImage(imageFile, bboxes, threshold = 0.33) {
    const res = await fetch(`${API_BASE}/predict_bbox/image`, {
        method: 'POST',
        body: buildForm(imageFile, threshold, { bboxes }),
    });
    await handleResponse(res);
    const count = parseInt(res.headers.get('X-Count'), 10) || null;
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), count };
}
