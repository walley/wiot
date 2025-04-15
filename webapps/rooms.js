var username = "anon";
var manager;

function add_room()
{

  var name = get_name();
  var room_name = $("#add_room").val();
  console.log("add_room:" + room_name);


  $.ajax({
    url:"https://wiot.cz/wiot/v1/room",
    method: 'PUT',
    data: { name: room_name },
    success: function(result,status,xhr) {
      alert("add "+ xhr.status + " " + result + " " + status);
      refresh_list();
    },
    error: function(xhr, status, error) {
      alert("error "+ xhr.status + " " + error);
    }
  });
}

function xxdelete()
{
  var name = get_name();
  var gp_id = $("#delinput").val();

  $.ajax({
    url: 'https://wiot.cz/table/project',
    method: 'DELETE',
    data: { gp_id: gp_id, project: name },
    success: function(result) {
      alert("done");
      refresh_list();
    },
    error: function(xhr,status,error) {
      alert("error "+ xhr.status + " " + error);
    }
  });
}

function get_name()
{
  return $("#options").val();
}

function get_manager(project)
{
  alert(project);
}


function createUnsortedList(obj)
{
  const ul = document.createElement('ul');
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const li = document.createElement('li');
      li.textContent = key;
      const nestedUl = document.createElement('ul');
      for (const subKey in obj[key]) {
        if (obj[key].hasOwnProperty(subKey)) {
          const nestedLi = document.createElement('li');
          nestedLi.textContent = `${subKey}: ${obj[key][subKey]}`;
          nestedUl.appendChild(nestedLi);
        }
      }
    li.appendChild(nestedUl);
    ul.appendChild(li);
    }
  }
  return ul;
}

function refresh_list()
{

  name = get_name();
  $( "#rooms_list" ).empty();

  $.getJSON("https://wiot.cz/wiot/v1/rooms?output=json",
    {
      output: "json",
    },
    function(result) {
      var options = $("#options");

      const outputDiv = document.getElementById('rooms_list');
      outputDiv.appendChild(createUnsortedList(result));

      console.log(result);

      manager = result.manager;
      $("#manager").html(manager);
      $.each(result.imgs, function(index, value) {
        data = index + ": <a href='https://wiot.cz/" + value[1] + "'>"+value[0]+"</a>";
        $("#rooms_list").append(data);
        $("#rooms_list").append(" [remove]");
        $("#rooms_list").append("\n<br>");
      });
    }
  );




}

