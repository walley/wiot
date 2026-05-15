// ================== floorplan-tools.js ==================

function splitSelected(direction) {
    if (!selectedRoom) {
        alert("Please select a room first");
        return;
    }

    const rooms = getCurrentRooms();
    const index = rooms.indexOf(selectedRoom);
    if (index === -1) return;

    if (direction === 'h') { // Horizontal split
        const half = Math.floor(selectedRoom.h / 2);
        selectedRoom.h = half;
        rooms.splice(index + 1, 0, {
            id: Date.now(),
            x: selectedRoom.x,
            y: selectedRoom.y + half,
            w: selectedRoom.w,
            h: half,
            outside: false
        });
    } else { // Vertical split
        const half = Math.floor(selectedRoom.w / 2);
        selectedRoom.w = half;
        rooms.splice(index + 1, 0, {
            id: Date.now(),
            x: selectedRoom.x + half,
            y: selectedRoom.y,
            w: half,
            h: selectedRoom.h,
            outside: false
        });
    }
    render();
}

function markAsOutside() {
    if (!selectedRoom) {
        alert("Please select a room first");
        return;
    }
    selectedRoom.outside = !selectedRoom.outside;
    render();
}

// ================== Floor Selector ==================

function addFloor() {
    addNewFloor();
    updateFloorList();
}

function removeFloor() {
    removeCurrentFloor();
    updateFloorList();
}

function switchToFloor(floorIndex) {
    if (floorIndex < 0 || floorIndex >= floors.length) return;
    currentFloor = floorIndex;
    selectedRoom = null;
    render();
    updateFloorList();
}

function updateFloorList() {
    const container = document.getElementById('floor-list');
    if (!container) return;

    let html = '';
    
    for (let i = 0; i < floors.length; i++) {
        const isActive = i === currentFloor;
        html += `
            <div onclick="switchToFloor(${i})" 
                 class="floor-item ${isActive ? 'active' : ''}">
                Floor ${i + 1}
            </div>`;
    }
    
    container.innerHTML = html;
}

function deleteSelectedRoom() {
    if (!selectedRoom) {
        alert("Please select a room first");
        return;
    }

    if (!confirm("Delete this room?")) {
        return;
    }

    const rooms = getCurrentRooms();
    const index = rooms.indexOf(selectedRoom);
    
    if (index > -1) {
        rooms.splice(index, 1);
        selectedRoom = null;
        render();
    }
}

function addRoomAdjacent(direction) {
    if (!selectedRoom) {
        alert("Please select a room first");
        return;
    }

    const rooms = getCurrentRooms();
    const size = 180;        // default new room size
    let newRoom = null;

    switch(direction) {
        case 'right':
            newRoom = {
                id: Date.now(),
                x: selectedRoom.x + selectedRoom.w,
                y: selectedRoom.y,
                w: size,
                h: selectedRoom.h,
                outside: false
            };
            break;
        case 'left':
            newRoom = {
                id: Date.now(),
                x: selectedRoom.x - size,
                y: selectedRoom.y,
                w: size,
                h: selectedRoom.h,
                outside: false
            };
            break;
        case 'top':
            newRoom = {
                id: Date.now(),
                x: selectedRoom.x,
                y: selectedRoom.y - size,
                w: selectedRoom.w,
                h: size,
                outside: false
            };
            break;
        case 'bottom':
            newRoom = {
                id: Date.now(),
                x: selectedRoom.x,
                y: selectedRoom.y + selectedRoom.h,
                w: selectedRoom.w,
                h: size,
                outside: false
            };
            break;
    }

    // Check for overlap
    if (isOverlapping(newRoom, rooms)) {
        alert("Not enough space in that direction!");
        return;
    }

    rooms.push(newRoom);
    selectedRoom = newRoom;   // auto-select the new room
    render();
}

// Simple overlap check
function isOverlapping(newRoom, rooms) {
    for (let room of rooms) {
        if (!(newRoom.x + newRoom.w <= room.x || 
              newRoom.x >= room.x + room.w || 
              newRoom.y + newRoom.h <= room.y || 
              newRoom.y >= room.y + room.h)) {
            return true; // overlap found
        }
    }
    return false;
}

function recenterAll() {
    const rooms = getCurrentRooms();
    if (rooms.length === 0) return;

    // Calculate bounding box of all rooms
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    rooms.forEach(room => {
        minX = Math.min(minX, room.x);
        minY = Math.min(minY, room.y);
        maxX = Math.max(maxX, room.x + room.w);
        maxY = Math.max(maxY, room.y + room.h);
    });

    const planWidth = maxX - minX;
    const planHeight = maxY - minY;

    // Center point of canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Calculate offset to center everything
    const offsetX_new = Math.round(centerX - (minX + planWidth / 2));
    const offsetY_new = Math.round(centerY - (minY + planHeight / 2));

    // Apply offset to all rooms
    rooms.forEach(room => {
        room.x += offsetX_new;
        room.y += offsetY_new;
    });

    // Reset view pan/offset so we see it centered immediately
    offsetX = 0;
    offsetY = 0;
    zoomLevel = 1.0;           // Optional: reset zoom too

    selectedRoom = null;
    render();
    
    console.log("✅ Recentered and view reset");
}

// Make functions global
window.splitSelected = splitSelected;
window.markAsOutside = markAsOutside;
window.addFloor = addFloor;
window.removeFloor = removeFloor;
window.switchToFloor = switchToFloor;
window.updateFloorList = updateFloorList;
window.deleteSelectedRoom = deleteSelectedRoom;
window.addRoomAdjacent = addRoomAdjacent;
window.recenterAll = recenterAll;
