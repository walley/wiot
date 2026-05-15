// floorplan.js - Main entry point
let canvas, ctx, selectedRoom = null;

function initFloorplan() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    // Set initial canvas resolution
    resizeCanvas();

    initData();
    setupCanvasEvents();
    render();
    updateFloorList();

    // Resize when window changes
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (!canvas) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    render();
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
