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


// Make functions global
window.splitSelected = splitSelected;
window.markAsOutside = markAsOutside;
window.addFloor = addFloor;
window.removeFloor = removeFloor;
window.switchToFloor = switchToFloor;
window.updateFloorList = updateFloorList;
window.deleteSelectedRoom = deleteSelectedRoom;
