// floorplan.js - Main entry point
let canvas, ctx, selectedRoom = null;
let scale = 1.5;           // pixels per unit (you can adjust)
let offsetX = 40;
let offsetY = 40;

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

// ================== Rulers ==================
function drawRulers() {
    const topRuler = document.getElementById('ruler-top');
    const leftRuler = document.getElementById('ruler-left');

    // Top ruler (horizontal)
    let htmlTop = '';
    for (let i = 0; i < canvas.width; i += 50) {
        const realMeters = Math.round((i - offsetX) / scale);
        htmlTop += `<div style="position:absolute; left:${i}px; top:2px; font-size:10px;">${realMeters}</div>`;
    }
    topRuler.innerHTML = htmlTop;

    // Left ruler (vertical)
    let htmlLeft = '';
    for (let i = 0; i < canvas.height; i += 50) {
        const realMeters = Math.round((i - offsetY) / scale);
        htmlLeft += `<div style="position:absolute; top:${i}px; left:4px; font-size:10px; transform:rotate(-90deg); transform-origin:top left;">${realMeters}</div>`;
    }
    leftRuler.innerHTML = htmlLeft;
}

// ================== Main Render ==================
function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rooms = getCurrentRooms();

    rooms.forEach(room => {
        ctx.fillStyle = room.outside ? '#334455' : (room === selectedRoom ? '#0a84ff' : '#1e90ff');
        ctx.fillRect(room.x, room.y, room.w, room.h);
        
        ctx.strokeStyle = room === selectedRoom ? '#ffffff' : '#bbbbbb';
        ctx.lineWidth = 4;
        ctx.strokeRect(room.x, room.y, room.w, room.h);

        // Room label
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.fillText("Room", room.x + 12, room.y + 28);
    });

    drawRulers();
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    selectedRoom = null;
    const rooms = getCurrentRooms();

    for (let room of rooms) {
        if (x >= room.x && x <= room.x + room.w && 
            y >= room.y && y <= room.y + room.h) {
            selectedRoom = room;
            break;
        }
    }
    render();
}

// Make functions global
window.initFloorplan = initFloorplan;
window.render = render;
window.handleCanvasClick = handleCanvasClick;
window.resizeCanvas = resizeCanvas;
