const mapContainer = document.getElementById('map-container');
const mainView = document.getElementById('main-view');
const editPanel = document.getElementById('edit-panel');
const sizeSlider = document.getElementById('size-slider');
const rotateSlider = document.getElementById('rotate-slider');
const lockBtn = document.getElementById('lock-btn');
const stickerMenu = document.getElementById('sticker-menu');

let stickersData = JSON.parse(localStorage.getItem('map_data_v11')) || [];
let currentId = null;
let scale = 1, posX = 0, posY = 0;
let isPanning = false, startX = 0, startY = 0, lastDist = 0;

window.onload = () => {
    // Centrado inicial
    posX = (mainView.offsetWidth - 1000) / 2;
    updateTransform();
    loadStickerMenu();
    stickersData.forEach(s => renderSticker(s));
};

function loadStickerMenu() {
    for (let i = 1; i <= 24; i++) {
        const num = i.toString().padStart(2, '0');
        const path = `pegatinas/sticker${num}.png`;
        const img = document.createElement('img');
        img.src = path;
        img.className = 'sticker-source';
        img.onclick = () => addSticker(path);
        stickerMenu.appendChild(img);
    }
}

function updateTransform() {
    mapContainer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
}

// --- NAVEGACIÓN CORREGIDA ---
mainView.addEventListener('pointerdown', e => {
    // Si hay más de un toque (zoom), no iniciamos el panning
    if (!e.isPrimary) return; 
    
    if (e.target.id === 'main-view' || e.target.id === 'map-container' || e.target.id === 'background-map') {
        isPanning = true;
        startX = e.clientX - posX; 
        startY = e.clientY - posY;
        mainView.setPointerCapture(e.pointerId);
        deselectSticker();
    }
});

mainView.addEventListener('pointermove', e => {
    if (!isPanning || lastDist > 0) return; // Si estamos haciendo zoom (lastDist > 0), no movemos
    
    if (e.isPrimary) {
        posX = e.clientX - startX; 
        posY = e.clientY - startY;
        updateTransform();
    }
});

mainView.addEventListener('pointerup', e => {
    isPanning = false;
    if (e.pointerId) mainView.releasePointerCapture(e.pointerId);
});

// --- ZOOM OPTIMIZADO ---
mainView.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
        isPanning = false; // Desactivamos panning al detectar segundo dedo
        lastDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    }
}, { passive: false });

mainView.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        
        // Suavizamos el cambio de escala
        const delta = dist / lastDist;
        const newScale = Math.min(Math.max(scale * delta, 0.2), 5);
        
        scale = newScale;
        lastDist = dist;
        updateTransform();
    }
}, { passive: false });

mainView.addEventListener('touchend', e => {
    // Al levantar los dedos, reseteamos lastDist para que el pointermove vuelva a funcionar
    lastDist = 0; 
});

// --- RESTO DE FUNCIONES (PEGATINAS, UI, EXPORT) ---
// (He mantenido el resto igual para no romper tu lógica de pegatinas)

function addSticker(src) {
    const data = { id: Date.now(), src, xP: 50, yP: 50, w: 80, r: 0, locked: false };
    stickersData.push(data);
    renderSticker(data);
    save();
}

function addCross() {
    const xSVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+PHBhdGggZD0iTTEwIDEwIEw0MCA0MCBNNDAgMTAgTDEwIDQwIiBzdHJva2U9InJlZCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=";
    addSticker(xSVG);
}

function renderSticker(data) {
    const el = document.createElement('img');
    el.src = data.src;
    el.className = 'sticker-placed' + (data.locked ? ' locked' : '');
    el.style.left = data.xP + '%'; el.style.top = data.yP + '%';
    el.style.width = data.w + 'px'; el.style.setProperty('--rot', data.r + 'deg');
    el.dataset.id = data.id;

    let dragging = false;
    el.addEventListener('pointerdown', e => {
        e.stopPropagation();
        selectSticker(data.id, el);
        if (!data.locked) { dragging = true; el.setPointerCapture(e.pointerId); }
    });

    el.addEventListener('pointermove', e => {
        if (!dragging) return;
        const rect = mapContainer.getBoundingClientRect();
        data.xP = ((e.clientX - rect.left) / rect.width) * 100;
        data.yP = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.left = data.xP + '%'; el.style.top = data.yP + '%';
    });

    el.addEventListener('pointerup', () => { dragging = false; save(); });
    mapContainer.appendChild(el);
}

function selectSticker(id, el) {
    currentId = id;
    document.querySelectorAll('.sticker-placed').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    const s = stickersData.find(i => i.id == id);
    sizeSlider.value = s.w; rotateSlider.value = s.r;
    updateLockUI(s.locked);
    editPanel.classList.add('visible');
}

function toggleLock() {
    const s = stickersData.find(i => i.id == currentId);
    s.locked = !s.locked;
    document.querySelector(`[data-id="${currentId}"]`).classList.toggle('locked', s.locked);
    updateLockUI(s.locked);
    save();
}

function updateLockUI(isLocked) {
    lockBtn.innerText = isLocked ? '🔒' : '🔓';
    lockBtn.classList.toggle('is-locked', isLocked);
    const display = isLocked ? 'none' : 'flex';
    document.getElementById('ctrl-size').style.display = display;
    document.getElementById('ctrl-rotate').style.display = display;
}

function deselectSticker() {
    currentId = null;
    document.querySelectorAll('.sticker-placed').forEach(s => s.classList.remove('active'));
    editPanel.classList.remove('visible');
}

function deleteCurrentSticker() {
    if (!currentId) return;
    stickersData = stickersData.filter(s => s.id != currentId);
    document.querySelector(`[data-id="${currentId}"]`).remove();
    deselectSticker();
    save();
}

sizeSlider.oninput = e => {
    const s = stickersData.find(i => i.id == currentId);
    if (s && !s.locked) {
        s.w = e.target.value;
        document.querySelector(`[data-id="${currentId}"]`).style.width = s.w + 'px';
    }
};

rotateSlider.oninput = e => {
    const s = stickersData.find(i => i.id == currentId);
    if (s && !s.locked) {
        s.r = e.target.value;
        document.querySelector(`[data-id="${currentId}"]`).style.setProperty('--rot', s.r + 'deg');
    }
};

function downloadJSON() {
    const blob = new Blob([JSON.stringify(stickersData)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'mapa_datos.json'; a.click();
}

function importJSON(e) {
    const reader = new FileReader();
    reader.onload = () => {
        stickersData = JSON.parse(reader.result);
        save(); location.reload();
    };
    reader.readAsText(e.target.files[0]);
}

async function exportMap() {
    deselectSticker();
    const canvas = await html2canvas(mapContainer, { scale: 2, useCORS: true });
    const a = document.createElement('a');
    a.href = canvas.toDataURL("image/jpeg", 0.9);
    a.download = 'mi_mapa.jpg'; a.click();
}

function save() { localStorage.setItem('map_data_v11', JSON.stringify(stickersData)); }
function clearMap() { if(confirm('¿Borrar todo?')) { localStorage.clear(); location.reload(); } }