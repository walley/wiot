// ================== floorplan-data.js ==================
let floors = [];
let currentFloor = 0;

function initData() {
    floors = [{
        rooms: [
            { id: 1, x: 100, y: 100, w: 80,  h: 400, outside: false }, // Hallway
            { id: 2, x: 180, y: 150, w: 320, h: 300, outside: false }  // Room on the right
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

window.initData = initData;
window.getCurrentRooms = getCurrentRooms;
window.addNewFloor = addNewFloor;
window.removeCurrentFloor = removeCurrentFloor;
