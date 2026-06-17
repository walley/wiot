// floorplan-render.js
function setupCanvasEvents() {
    canvas.addEventListener('click', handleCanvasClick);
}

function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rooms = getCurrentRooms();

    rooms.forEach(room => {
        // Fill color
        if (room.outside) {
            ctx.fillStyle = '#334455';
        } else if (room === selectedRoom) {
            ctx.fillStyle = '#0a84ff';
        } else {
            ctx.fillStyle = '#1e90ff';
        }
        
        ctx.fillRect(room.x, room.y, room.w, room.h);
        
        // Border
        ctx.strokeStyle = room === selectedRoom ? '#ffffff' : '#bbbbbb';
        ctx.lineWidth = 4;
        ctx.strokeRect(room.x, room.y, room.w, room.h);

        // Optional room label
        ctx.fillStyle = "white";
        ctx.font = "14px Arial";
        ctx.fillText("Room", room.x + 10, room.y + 25);
    });
}
