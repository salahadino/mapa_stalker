// --- CONFIGURACIÓN DE LUGARES FIJOS ---
// Rellena estos valores con los datos que obtengas del JSON
const posicionesFijas = {
    "sticker01.png": { x: 33.507958984375, y: 69.52964557914272 },
    "sticker02.png": { x: 22.08271179199219, y: 73.4321204712433 },
    "sticker03.png": { x: 46.375982666015624, y: 53.79035847738229 },
    "sticker04.png": { x: 30.617773437500002, y: 46.72230117536269 },
    "sticker05.png": { x: 33.811450195312496, y: 60.87131549469014 },
    "sticker06.png": { x: 65.86295776367187, y: 34.78076833055119 },
    "sticker07.png": { x: 58.13521118164062, y: 52.08939352548404 },
    "sticker08.png": { x: 10.266204833984375, y: 70.36016073723053 },
    "sticker09.png": { x: 55.518072509765624, y: 58.662937432048054 },
    "sticker10.png": { x: 33.67498779296875, y: 14.943372094539683 },
    "sticker11.png": { x: 39.0807373046875, y: 48.130150448345546 },
    "sticker12.png": { x: 85.7228271484375, y: 38.53536624037691 },
    "sticker13.png": { x: 17.098556518554688, y: 29.16148590306072 },
    "sticker14.png": { x: 53.27331542968749, y: 38.51202920972578 },
    "sticker15.png": { x: 32.310717773437496, y: 55.47263235528296 },
    "sticker16.png": { x: 75.26398164453013, y: 52.88019712240685 },
    "sticker17.png": { x: 75.21531831148182, y: 52.926373555849636 },
    "sticker18.png": { x: 75.01967620969704, y: 52.68344107262484 },
    "sticker19.png": { x: 85.67520664521525, y: 47.411605848534435 },
    "sticker20.png": { x: 12.334149169921876, y: 85.59107808158626 },
    "sticker21.png": { x: 17.08282470703125, y: 50.217399026159434 },
    "sticker22.png": { x: 71.93676147460938, y: 43.441329160580736 },
    "sticker23.png": { x: 85.78677978515626, y: 58.043232020877035 },
    "sticker24.png": { x: 86.54445190429686, y: 67.56101689738296 },

    
};

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

// NAVEGACIÓN (Panning & Zoom)
mainView.addEventListener('pointerdown', e => {
    if (!e.isPrimary) return; 
    if (e.target.id === 'main-view' || e.target.id === 'map-container' || e.target.id === 'background-map') {
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
        updateTransform();
    }
});
mainView.addEventListener('pointerup', () => isPanning = false);

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
        updateTransform();
    }
}, { passive: false });
mainView.addEventListener('touchend', () => lastDist = 0);

// GESTIÓN DE PEGATINAS
function addSticker(src) {
    const fileName = src.split('/').pop();
    const coords = posicionesFijas[fileName] || { x: 50, y: 50 };

    // Evitar duplicados (opcional): si ya existe, no la añadimos otra vez
    if (stickersData.some(s => s.src === src)) {
        alert("Este lugar ya está marcado en el mapa.");
        return;
    }

    const data = { id: Date.now(), src, xP: coords.x, yP: coords.y, w: 80, r: 0, locked: false };
    stickersData.push(data);
    renderSticker(data);
    save();

    // Centrar la vista en la nueva pegatina
    focusOnSticker(coords.x, coords.y);
}

function focusOnSticker(xP, yP) {
    // Calcula la posición para que el punto (xP, yP) quede en el centro de la pantalla
    const mapW = 1000;
    const mapH = mapContainer.offsetHeight;
    posX = (mainView.offsetWidth / 2) - (xP * mapW / 100 * scale);
    posY = (mainView.offsetHeight / 2) - (yP * mapH / 100 * scale);
    updateTransform();
}

function addCross() {
    const xSVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+PHBhdGggZD0iTTEwIDEwIEw0MCA0MCBNNDAgMTAgTDEwIDQwIiBzdHJva2U9InJlZCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=";
    // Las X rojas no tienen posición fija, aparecen en el centro de la vista
    const x = (( (mainView.offsetWidth/2) - posX) / (1000 * scale)) * 100;
    const y = (( (mainView.offsetHeight/2) - posY) / (mapContainer.offsetHeight * scale)) * 100;
    const data = { id: Date.now(), src: xSVG, xP: x, yP: y, w: 80, r: 0, locked: false };
    stickersData.push(data);
    renderSticker(data);
    save();
}

// ... (Funciones renderSticker, selectSticker, toggleLock, delete, downloadJSON, importJSON, exportMap, save, clearMap se mantienen igual que la v11 anterior) ...

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