// floorplan.js - Main entry point
let canvas, ctx, selectedRoom = null;
let zoomLevel = 1.0;
const minZoom = 0.3;
const maxZoom = 5.0;
let offsetX = 80;
let offsetY = 80;

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

// ================== Zoom Functions ==================
function zoomIn() {
    const oldZoom = zoomLevel;
    zoomLevel = Math.min(maxZoom, zoomLevel * 1.25);
    // Keep center point stable
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

    // Top ruler (horizontal)
    let htmlTop = '';
    const step = 50;                    // pixel step between marks
    const start = Math.floor(offsetX / step) * step;

    for (let i = start; i < canvas.width; i += step) {
        const worldX = Math.round((i - offsetX) / zoomLevel);
        
        htmlTop += `
            <div style="position:absolute; left:${i}px; top:4px; font-size:10px; color:#aaa; text-align:center; width:1px;">
                ${worldX}
            </div>`;
    }
    topRuler.innerHTML = htmlTop;

    // Left ruler (vertical)
    let htmlLeft = '';
    for (let i = start; i < canvas.height; i += step) {
        const worldY = Math.round((i - offsetY) / zoomLevel);
        
        htmlLeft += `
            <div style="position:absolute; top:${i}px; left:4px; font-size:10px; color:#aaa; transform:rotate(-90deg); transform-origin:top left;">
                ${worldY}
            </div>`;
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

        // Room label
        ctx.fillStyle = "white";
        ctx.font = `${14 * zoomLevel}px Arial`;
        ctx.fillText("Room", screenX + 12 * zoomLevel, screenY + 28 * zoomLevel);
    });

    drawRulers();
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    selectedRoom = null;
    const rooms = getCurrentRooms();

    for (let room of rooms) {
        const screenX = getTransformedX(room.x);
        const screenY = getTransformedY(room.y);
        const screenW = room.w * zoomLevel;
        const screenH = room.h * zoomLevel;

        if (clickX >= screenX && clickX <= screenX + screenW && 
            clickY >= screenY && clickY <= screenY + screenH) {
            selectedRoom = room;
            break;
        }
    }
    render();
}

// Make functions global
window.initFloorplan = initFloorplan;
window.render = render;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.resetZoom = resetZoom;
window.recenterAll = recenterAll;   // if you have it
