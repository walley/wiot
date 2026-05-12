// floorplan.js - Main entry point
let currentFloor = 0;
let floors = [];

window.initFloorplan = function() {
  floors = [createInitialFloor()];
  render();
  setupCanvasEvents();
};

function createInitialFloor() {
  return {
    rooms: [
      {id:1, x:100, y:100, w:80, h:400, type:'hallway'}, // narrow hallway
      {id:2, x:200, y:100, w:300, h:400, type:'room'}
    ]
  };
}

// More code will be added...