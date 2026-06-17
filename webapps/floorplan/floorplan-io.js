// floorplan-io.js
function exportJSON() {
    const data = {
        floors: floors,
        version: "1.0"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "floorplan.json";
    a.click();
}

function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const data = JSON.parse(ev.target.result);
                floors = data.floors || data;
                currentFloor = 0;
                selectedRoom = null;
                render();
                alert("Floor plan imported successfully!");
            } catch(err) {
                alert("Invalid JSON file");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
