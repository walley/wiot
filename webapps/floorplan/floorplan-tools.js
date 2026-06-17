// ================== floorplan-tools.js ==================

// Merge mode state
let mergeMode = false;
let selectedForMerge = [];

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

// ================== Merge Mode ==================

function startMergeMode() {
    if (mergeMode) {
        // Cancel merge mode
        cancelMergeMode();
    } else {
        // Activate merge mode
        mergeMode = true;
        selectedForMerge = [];
        selectedRoom = null;
        
        const mergeBtn = document.getElementById('merge-btn');
        const mergeStatus = document.getElementById('merge-status');
        
        mergeBtn.classList.add('active');
        mergeStatus.style.display = 'block';
        mergeStatus.classList.add('active');
        mergeStatus.textContent = 'Select 2 adjacent rooms to merge';
        
        render();
    }
}

function cancelMergeMode() {
    mergeMode = false;
    selectedForMerge = [];
    
    const mergeBtn = document.getElementById('merge-btn');
    const mergeStatus = document.getElementById('merge-status');
    
    mergeBtn.classList.remove('active');
    mergeStatus.style.display = 'none';
    mergeStatus.classList.remove('active');
    
    render();
}

function selectRoomForMerge(room) {
    if (!mergeMode) return;
    
    // Check if already selected
    const alreadySelected = selectedForMerge.find(r => r.id === room.id);
    
    if (alreadySelected) {
        // Deselect
        selectedForMerge = selectedForMerge.filter(r => r.id !== room.id);
    } else {
        // Add to selection (max 2)
        if (selectedForMerge.length < 2) {
            selectedForMerge.push(room);
        } else {
            // Replace the first one
            selectedForMerge.shift();
            selectedForMerge.push(room);
        }
    }
    
    // Update status
    const mergeStatus = document.getElementById('merge-status');
    if (selectedForMerge.length === 0) {
        mergeStatus.textContent = 'Select 2 adjacent rooms to merge';
    } else if (selectedForMerge.length === 1) {
        mergeStatus.textContent = `1 room selected. Select one more.`;
    } else {
        mergeStatus.textContent = `2 rooms selected. Ready to merge!`;
        // Auto-merge after a short delay
        setTimeout(attemptMerge, 300);
    }
    
    render();
}

function attemptMerge() {
    if (selectedForMerge.length !== 2) return;
    
    const room1 = selectedForMerge[0];
    const room2 = selectedForMerge[1];
    
    // Check if rooms are adjacent
    if (!areAdjacent(room1, room2)) {
        alert("Rooms are not adjacent! Please select two adjacent rooms.");
        return;
    }
    
    // Merge the rooms
    const mergedRoom = mergeRooms(room1, room2);
    const rooms = getCurrentRooms();
    
    // Remove both rooms and add merged room
    const idx1 = rooms.indexOf(room1);
    const idx2 = rooms.indexOf(room2);
    
    if (idx1 > -1 && idx2 > -1) {
        // Remove in reverse order to avoid index issues
        const removeIdx = Math.max(idx1, idx2);
        const keepIdx = Math.min(idx1, idx2);
        
        rooms.splice(removeIdx, 1);
        rooms.splice(keepIdx, 1);
        rooms.push(mergedRoom);
        
        cancelMergeMode();
        selectedRoom = mergedRoom;
        render();
    }
}

function areAdjacent(room1, room2) {
    const threshold = 2; // Allow slight overlap/gap for floating point
    
    // Horizontally adjacent (left-right)
    if (Math.abs(room1.x + room1.w - room2.x) < threshold && 
        room1.y === room2.y && 
        room1.h === room2.h) {
        return true;
    }
    
    if (Math.abs(room2.x + room2.w - room1.x) < threshold && 
        room1.y === room2.y && 
        room1.h === room2.h) {
        return true;
    }
    
    // Vertically adjacent (top-bottom)
    if (Math.abs(room1.y + room1.h - room2.y) < threshold && 
        room1.x === room2.x && 
        room1.w === room2.w) {
        return true;
    }
    
    if (Math.abs(room2.y + room2.h - room1.y) < threshold && 
        room1.x === room2.x && 
        room1.w === room2.w) {
        return true;
    }
    
    return false;
}

function mergeRooms(room1, room2) {
    // Determine the bounding box of both rooms
    const minX = Math.min(room1.x, room2.x);
    const minY = Math.min(room1.y, room2.y);
    const maxX = Math.max(room1.x + room1.w, room2.x + room2.w);
    const maxY = Math.max(room1.y + room1.h, room2.y + room2.h);
    
    return {
        id: Date.now(),
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
        outside: room1.outside || room2.outside  // Keep outside flag if either is outside
    };
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
    cancelMergeMode();
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
window.startMergeMode = startMergeMode;
window.cancelMergeMode = cancelMergeMode;
window.selectRoomForMerge = selectRoomForMerge;
