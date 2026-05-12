// floorplan-tools.js - Room editing actions

let selectedRoom = null;

// Called when user clicks on a room on canvas
function selectRoom(room) {
  selectedRoom = room;
  render();
}

function splitSelected(direction) {
  if (!selectedRoom) {
    alert('Please select a room first');
    return;
  }
  splitRoom(selectedRoom, direction);
  selectedRoom = null;
  render();
}

function markAsOutside() {
  if (!selectedRoom) {
    alert('Please select a room first');
    return;
  }
  selectedRoom.outside = true;
  render();
}

function initTools() {
  // Initialization for tools if needed
}