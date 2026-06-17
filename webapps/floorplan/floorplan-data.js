// ================== floorplan-data.js ==================
let floors = [];
let currentFloor = 0;

function initData() {
    floors = [{
        rooms: [
            { 
                id: 1, 
                x: 120, 
                y: 120, 
                w: 90,   // narrow hallway
                h: 380, 
                outside: false 
            }, // Hallway
            
            { 
                id: 2, 
                x: 210, 
                y: 120, 
                w: 340, 
                h: 380, 
                outside: false 
            }  // Main room on the right (same height)
        ]
    }];
    currentFloor = 0;
}

function getCurrentRooms() {
    if (!floors[currentFloor]) {
        floors[currentFloor] = { rooms: [] };
    }
    return floors[currentFloor].rooms;
}

function addNewFloor() {
    const copy = JSON.parse(JSON.stringify(getCurrentRooms()));
    floors.push({ rooms: copy });
    currentFloor = floors.length - 1;
    render();
    updateFloorList();
}

function removeCurrentFloor() {
    if (floors.length <= 1) {
        alert("You need at least one floor");
        return;
    }
    floors.splice(currentFloor, 1);
    if (currentFloor >= floors.length) currentFloor = floors.length - 1;
    render();
    updateFloorList();
}

// Make functions global
window.initData = initData;
window.getCurrentRooms = getCurrentRooms;
window.addNewFloor = addNewFloor;
window.removeCurrentFloor = removeCurrentFloor;
