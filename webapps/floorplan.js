// floorplan.js - Main entry point
let canvas, ctx, selectedRoom = null;

function initFloorplan() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    initData();           // from floorplan-data.js
    setupCanvasEvents();  // from floorplan-render.js
    render();             // from floorplan-render.js

    updateFloorList();    // from floorplan-tools.js
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

// Make key functions globally available
window.initFloorplan = initFloorplan;
window.render = render;
window.handleCanvasClick = handleCanvasClick;
