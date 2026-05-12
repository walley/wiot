// floorplan.js - Main entry point
let currentFloor = 0;
let floors = [];
let selectedRoom = null;
let canvas, ctx;

window.initFloorplan = function() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    floors = [{
        name: 'Ground Floor',
        rooms: [
            {id: 1, x: 50, y: 100, width: 80, height: 400, type: 'hallway'},
            {id: 2, x: 150, y: 150, width: 300, height: 300, type: 'room'}
        ]
    }];
    canvas.addEventListener('click', handleCanvasClick);
    render();
    updateFloorList();
};

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    selectedRoom = null;
    const rooms = floors[currentFloor].rooms;
    for (let room of rooms) {
        if (x > room.x && x < room.x + room.width && y > room.y && y < room.y + room.height) {
            selectedRoom = room;
            break;
        }
    }
    render();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rooms = floors[currentFloor].rooms;
    rooms.forEach(room => {
        ctx.fillStyle = room.type === 'outside' ? '#334455' : (room === selectedRoom ? '#0a84ff' : '#555577');
        ctx.fillRect(room.x, room.y, room.width, room.height);
        ctx.strokeStyle = '#888'; ctx.lineWidth = 3; ctx.strokeRect(room.x, room.y, room.width, room.height);
        ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.fillText(room.type || 'room', room.x + 10, room.y + 25);
    });
}
window.render = render;