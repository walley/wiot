// floorplan-data.js - Data model and state management

//let floors = [];
//let currentFloor = 0;
//let selectedRoom = null;

class Room {
  constructor(x, y, w, h, isOutside = false) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.isOutside = isOutside;
    this.name = '';
  }
}

function initData() {
  floors = [];
  addNewFloor();
}

function addNewFloor() {
  const newFloor = {
    rooms: []
  };
  
  // Initial layout: Hallway + Room on the right
  if (floors.length === 0) {
    newFloor.rooms.push(new Room(100, 100, 80, 400, false)); // Hallway (narrow)
    newFloor.rooms.push(new Room(200, 100, 300, 400, false)); // Main room
  } else {
    // Copy from previous floor
    newFloor.rooms = floors[floors.length-1].rooms.map(r => 
      new Room(r.x, r.y, r.w, r.h, r.isOutside)
    );
  }
  
  floors.push(newFloor);
  currentFloor = floors.length - 1;
}

function getCurrentFloor() {
  return floors[currentFloor];
}

function selectRoom(room) {
  selectedRoom = room;
}

