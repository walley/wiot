// floorplan-render.js - Canvas rendering

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const GRID_SIZE = 20;

function drawGrid() {
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  const floor = getCurrentFloor();
  if (!floor) return;

  floor.rooms.forEach((room, index) => {
    ctx.fillStyle = room.isOutside ? '#334455' : (room === selectedRoom ? '#0a84ff' : '#555');
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    
    ctx.fillRect(room.x, room.y, room.w, room.h);
    ctx.strokeRect(room.x, room.y, room.w, room.h);

    // Room label
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Room ${index+1}`, room.x + 10, room.y + 25);
    if (room.name) ctx.fillText(room.name, room.x + 10, room.y + 45);
  });
}

