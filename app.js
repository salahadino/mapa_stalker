// --- DICCIONARIO DE POSICIONES REALES v13.2 ---
const posicionesFijas = {
    "sticker01.png": { x: 33.5079, y: 69.5296 },
    "sticker02.png": { x: 22.0827, y: 73.4321 },
    "sticker03.png": { x: 46.3759, y: 53.7903 },
    "sticker04.png": { x: 30.6177, y: 46.7223 },
    "sticker05.png": { x: 33.8114, y: 60.8713 },
    "sticker06.png": { x: 65.8629, y: 34.7807 },
    "sticker07.png": { x: 58.1352, y: 52.0893 },
    "sticker08.png": { x: 10.2662, y: 70.3601 },
    "sticker09.png": { x: 55.5180, y: 58.6629 },
    "sticker10.png": { x: 33.6749, y: 14.9433 },
    "sticker11.png": { x: 39.0807, y: 48.1301 },
    "sticker12.png": { x: 85.7228, y: 38.5353 },
    "sticker13.png": { x: 17.0985, y: 29.1614 },
    "sticker14.png": { x: 53.2733, y: 38.5120 },
    "sticker15.png": { x: 32.3107, y: 55.4726 },
    "sticker16.png": { x: 75.2639, y: 52.8801 },
    "sticker17.png": { x: 75.2153, y: 52.9263 },
    "sticker18.png": { x: 75.0196, y: 52.6834 },
    "sticker19.png": { x: 85.6752, y: 47.4116 },
    "sticker20.png": { x: 12.3341, y: 85.5910 },
    "sticker21.png": { x: 17.0828, y: 50.2173 },
    "sticker22.png": { x: 71.9367, y: 43.4413 },
    "sticker23.png": { x: 85.7867, y: 58.0432 },
    "sticker24.png": { x: 86.5444, y: 67.5610 }
};

const mapContainer = document.getElementById('map-container');
const mainView = document.getElementById('main-view');
const editPanel = document.getElementById('edit-panel');
const sizeSlider = document.getElementById('size-slider');
const rotateSlider = document.getElementById('rotate-slider');
const lockBtn = document.getElementById('lock-btn');
const stickerMenu = document.getElementById('sticker-menu');

let stickersData = JSON.parse(localStorage.getItem('map_data_v13')) || [];
let currentId = null;
let scale = 1, posX = 0, posY = 0;
let isPanning = false, startX = 0, startY = 0, lastDist = 0;

// Inicialización de AudioContext para el sonido Pop
let audioCtx = null;

window.onload = () => {
    posX = (mainView.offsetWidth - 1000) / 2;
    updateTransform(false);
    loadStickerMenu();
    stickersData.forEach(s => renderSticker(s, true));
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

// GENERADOR DE SONIDO SINTÉTICO
function playPopSound() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

// ACTUALIZACIÓN DE CÁMARA
function updateTransform(withTransition = false) {
    mapContainer.style.transition = withTransition ? "transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none";
    mapContainer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
}

// NAVEGACIÓN MANUAL
mainView.addEventListener('pointerdown', e => {
    if (!e.isPrimary) return; 
    if (['main-view', 'map-container', 'background-map'].includes(e.target.id)) {
        isPanning = true;
        startX = e.clientX - posX; startY = e.clientY - posY;
        mainView.setPointerCapture(e.pointerId);
        deselectSticker();
    }
});

mainView.addEventListener('pointermove', e => {
    if (!isPanning || lastDist > 0) return;
    if (e.isPrimary) {
        posX = e.clientX - startX; posY = e.clientY - startY;
        updateTransform(false);
    }
});

mainView.addEventListener('pointerup', () => isPanning = false);

// ZOOM
mainView.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
        isPanning = false;
        lastDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
    }
}, { passive: false });

mainView.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        scale = Math.min(Math.max(scale * (dist / lastDist), 0.2), 5);
        lastDist = dist;
        updateTransform(false);
    }
}, { passive: false });

mainView.addEventListener('touchend', () => lastDist = 0);

// GESTIÓN DE PEGATINAS
function addSticker(src) {
    const fileName = src.split('/').pop();
    
    if (stickersData.some(s => s.src === src)) {
        const existente = stickersData.find(s => s.src === src);
        focusOnSticker(existente.xP, existente.yP);
        return;
    }

    const coords = posicionesFijas[fileName] || { x: 50, y: 50 };
    const data = { id: Date.now(), src, xP: coords.x, yP: coords.y, w: 80, r: 0, locked: false };
    
    stickersData.push(data);
    renderSticker(data, false);
    save();
    focusOnSticker(coords.x, coords.y);

    // Sonido Pop al "aterrizar" (coincide con el final de la animación CSS)
    setTimeout(() => { playPopSound(); }, 300);
}

function focusOnSticker(xP, yP) {
    const mapW = 1000;
    const mapH = mapContainer.offsetHeight;
    posX = (mainView.offsetWidth / 2) - (xP * mapW / 100 * scale);
    posY = (mainView.offsetHeight / 2) - (yP * mapH / 100 * scale);
    updateTransform(true);
}

function renderSticker(data, skipAnimation) {
    const el = document.createElement('img');
    el.src = data.src;
    el.className = 'sticker-placed' + (data.locked ? ' locked' : '');
    if (skipAnimation) el.style.animation = "none";
    
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

// PANEL DE EDICIÓN
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
    if(!s) return;
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

// EXPORTACIÓN Y PERSISTENCIA
function downloadJSON() {
    const blob = new Blob([JSON.stringify(stickersData)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'mapa_v13_data.json'; a.click();
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
    a.download = 'mi_mapa_v13.jpg'; a.click();
}

function save() { localStorage.setItem('map_data_v13', JSON.stringify(stickersData)); }
function clearMap() { if(confirm('¿Reiniciar todo el mapa?')) { localStorage.clear(); location.reload(); } }

function addCross() {
    const xSVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+PHBhdGggZD0iTTEwIDEwIEw0MCA0MCBNNDAgMTAgTDEwIDQwIiBzdHJva2U9InJlZCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=";
    const x = (( (mainView.offsetWidth/2) - posX) / (1000 * scale)) * 100;
    const y = (( (mainView.offsetHeight/2) - posY) / (mapContainer.offsetHeight * scale)) * 100;
    const data = { id: Date.now(), src: xSVG, xP: x, yP: y, w: 80, r: 0, locked: false };
    stickersData.push(data);
    renderSticker(data, false);
    save();
    playPopSound();
}