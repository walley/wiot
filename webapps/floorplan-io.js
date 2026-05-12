// floorplan-io.js - Import and Export functionality

function exportJSON() {
  const data = {
    version: 1,
    floors: floors,
    currentFloor: currentFloor
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'wiot-floorplan.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.floors) {
          floors = data.floors;
        }
        if (data.currentFloor !== undefined) {
          currentFloor = data.currentFloor;
        }
        render();
        updateFloorList();
        alert('✅ Floor plan imported successfully!');
      } catch (err) {
        alert('❌ Invalid JSON file');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}