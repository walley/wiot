// floorplan.js - Main entry point with Pan + Zoom
let canvas, ctx, selectedRoom = null;
let zoomLevel = 1.0;
const minZoom = 0.3;
const maxZoom = 5.0;
let offsetX = 80;
let offsetY = 80;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

function initFloorplan() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    resizeCanvas();
    
    initData();
    setupCanvasEvents();
    render();
    updateFloorList();

    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    render();
}

// ================== Mouse Events (Pan + Click) ==================
function setupCanvasEvents() {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
}

function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    lastMouseX = mouseX;
    lastMouseY = mouseY;

    // Check if clicked on a room
    selectedRoom = null;
    const rooms = getCurrentRooms();

    for (let room of rooms) {
        const screenX = getTransformedX(room.x);
        const screenY = getTransformedY(room.y);
        const screenW = room.w * zoomLevel;
        const screenH = room.h * zoomLevel;

        if (mouseX >= screenX && mouseX <= screenX + screenW &&
            mouseY >= screenY && mouseY <= screenY + screenH) {
            selectedRoom = room;
            render();
            return;
        }
    }

    // If no room clicked → start panning
    isDragging = true;
    canvas.style.cursor = 'grabbing';
}

function onMouseMove(e) {
    if (!isDragging) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - lastMouseX;
    const dy = mouseY - lastMouseY;

    offsetX += dx;
    offsetY += dy;

    lastMouseX = mouseX;
    lastMouseY = mouseY;

    render();
}

function onMouseUp() {
    isDragging = false;
    canvas.style.cursor = 'default';
}

// ================== Zoom Functions ==================
function zoomIn() {
    const oldZoom = zoomLevel;
    zoomLevel = Math.min(maxZoom, zoomLevel * 1.25);
    offsetX = canvas.width/2 - (canvas.width/2 - offsetX) * (zoomLevel / oldZoom);
    offsetY = canvas.height/2 - (canvas.height/2 - offsetY) * (zoomLevel / oldZoom);
    render();
}

function zoomOut() {
    const oldZoom = zoomLevel;
    zoomLevel = Math.max(minZoom, zoomLevel / 1.25);
    offsetX = canvas.width/2 - (canvas.width/2 - offsetX) * (zoomLevel / oldZoom);
    offsetY = canvas.height/2 - (canvas.height/2 - offsetY) * (zoomLevel / oldZoom);
    render();
}

function resetZoom() {
    zoomLevel = 1.0;
    offsetX = 80;
    offsetY = 80;
    render();
}

function getTransformedX(x) {
    return (x * zoomLevel) + offsetX;
}

function getTransformedY(y) {
    return (y * zoomLevel) + offsetY;
}

// ================== Rulers ==================
function drawRulers() {
    const topRuler = document.getElementById('ruler-top');
    const leftRuler = document.getElementById('ruler-left');

    const step = 60;
    const start = Math.floor(offsetX / step) * step;

    // Top ruler
    let htmlTop = '';
    for (let i = start; i < canvas.width; i += step) {
        const worldX = Math.round((i - offsetX) / zoomLevel);
        htmlTop += `<div style="position:absolute; left:${i}px; top:4px; font-size:10px; color:#aaa;">${worldX}</div>`;
    }
    topRuler.innerHTML = htmlTop;

    // Left ruler
    let htmlLeft = '';
    for (let i = start; i < canvas.height; i += step) {
        const worldY = Math.round((i - offsetY) / zoomLevel);
        htmlLeft += `<div style="position:absolute; top:${i}px; left:4px; font-size:10px; color:#aaa; transform:rotate(-90deg); transform-origin:top left;">${worldY}</div>`;
    }
    leftRuler.innerHTML = htmlLeft;
}

// ================== Main Render ==================
function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rooms = getCurrentRooms();

    rooms.forEach(room => {
        const screenX = getTransformedX(room.x);
        const screenY = getTransformedY(room.y);
        const screenW = room.w * zoomLevel;
        const screenH = room.h * zoomLevel;

        ctx.fillStyle = room.outside ? '#334455' : (room === selectedRoom ? '#0a84ff' : '#1e90ff');
        ctx.fillRect(screenX, screenY, screenW, screenH);
        
        ctx.strokeStyle = room === selectedRoom ? '#ffffff' : '#bbbbbb';
        ctx.lineWidth = 4 * zoomLevel;
        ctx.strokeRect(screenX, screenY, screenW, screenH);

        ctx.fillStyle = "white";
        ctx.font = `${14 * zoomLevel}px Arial`;
        ctx.fillText("Room", screenX + 12 * zoomLevel, screenY + 28 * zoomLevel);
    });

    drawRulers();
}

// Make functions global
window.initFloorplan = initFloorplan;
window.render = render;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetZoom = resetZoom;
window.recenterAll = recenterAll || function(){};
