var username = "anon";
var manager;

function add_room() {
  var room_name = $("#add_room").val().trim();
  if (!room_name) return alert("Please enter a room name");

  $.ajax({
    url: "https://wiot.cz/wiot/v1/room",
    method: 'PUT',
    data: { name: room_name },
    success: function(result, status, xhr) {
      alert("Room added successfully");
      $("#add_room").val("");
      refresh_list();
    },
    error: function(xhr, status, error) {
      alert("Error: " + xhr.status + " " + error);
    }
  });
}

function xxdelete() {
  var room_name = $("#delinput").val().trim();
  if (!room_name) return alert("Please enter room name to delete");

  if (!confirm("Delete room '" + room_name + "'?")) return;

  $.ajax({
    url: 'https://wiot.cz/wiot/v1/room',
    method: 'DELETE',
    data: { name: room_name },
    success: function() {
      alert("Room deleted");
      $("#delinput").val("");
      refresh_list();
    },
    error: function(xhr) {
      alert("Error deleting room: " + xhr.status);
    }
  });
}

function get_name() {
  return $("#options").val();
}

function refresh_list() {
  $("#rooms_list").empty();

  $.getJSON("https://wiot.cz/wiot/v1/rooms?output=json", function(result) {
    console.log(result);

    const container = document.getElementById('rooms_list');
    
    if (result && typeof result === 'object') {
      Object.keys(result).forEach(key => {
        const roomName = typeof result[key] === 'string' ? result[key] : key;
        
        const card = document.createElement('div');
        card.className = 'room-card';
        card.innerHTML = `<div class="room-name">${roomName}</div>`;
        container.appendChild(card);
      });
    }

    if (result.manager) {
      manager = result.manager;
    }
  });
}