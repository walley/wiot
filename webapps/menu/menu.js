function init_menu() {
  // Fetch menu items from menu.json
  $.ajax({
    url: "menu.json",
    method: "GET",
    dataType: "json",
    success: function(data) {
      const $menu = $("#menu");

      // Populate the menu with items from JSON
      data.forEach(item => {
        const $li = $("<li>");

        if (item.type === "separator") {
          // Separator (empty <li>)
          $menu.append($li);
        } else {
          const $div = $("<div>");

          if (item.type === "username") {
            // Username item with a span
            const $span = $("<span>")
              .attr("id", item.id)
              .text(item.text);
            $div.append($("<b>").append($span));
          } else if (item.type === "link") {
            // Link item
            const $a = $("<a>")
              .attr("href", item.href)
              .text(item.text);
            $div.append($a);
          } else if (item.type === "item") {
            // Regular item (e.g., Profile)
            $div.text(item.text);
          }

          $li.append($div);
          $menu.append($li);
        }
      });

      // Initialize jQuery UI Menu after items are added
      $menu.menu({
        select: function(event, ui) {
          const selectedText = ui.item.text();
          if (selectedText === "Profile") {
            alert("Profile clicked!"); // Replace with actual profile action
          }
        }
      });

        // Add the "About" menu item dynamically
        let aboutLi = $("<li>").appendTo("#menu");
        let aboutA = $("<a>")
            .attr("href", "#")
            .text("About")
            .attr("id", "about-menuitem")
            .appendTo(aboutLi);

        // Create the About dialog (initially hidden)
        let aboutDialog = $("<div>")
            .attr("id", "about-dialog")
            .attr("title", "About This Project")
            .html(`
                <div style="text-align: center;">
                    <img src="menu/project-logo.png" alt="Project Logo" style="width: 100px; height: auto; margin-bottom: 10px;">
                    <p style="text-align: left;">
                        This project is a multi-house IoT system designed to manage smart devices across different homes. Users can select a house location, view rooms, and control devices like lights, switches, thermometers, thermostats, vacuum cleaners, fans, cameras, locks, speakers, and humidifiers. The system provides a user-friendly interface to monitor and interact with IoT devices remotely, enhancing home automation and convenience.
                    </p>
                </div>
            `)
            .appendTo("body");

        // Initialize the dialog with jQuery UI
        aboutDialog.dialog({
            autoOpen: false,
            modal: false, // Non-modal so the user can interact with the page
            draggable: true, // Make the dialog movable
            resizable: false,
            width: 400,
            position: { my: "center", at: "center", of: window }
        });

        // Handle click on the "About" menu item
        $("#about-menuitem").on("click", function(e) {
            e.preventDefault(); // Prevent default link behavior
            $("#about-dialog").dialog("open"); // Open the dialog
            $("#menu").hide(); // Hide the menu
            $("#navmenu").attr("aria-expanded", "false");
        });

      // Apply initial hide
      $menu.hide();
      $("#navmenu").attr("aria-expanded", "false");
    },
    error: function() {
      console.error("Failed to load menu.json");
      $("#menu").html("<li><div>Error loading menu</div></li>");
      $("#menu").menu();
      $("#menu").hide();
      $("#navmenu").attr("aria-expanded", "false");
    }
  });

  // Set up click handler for toggling the menu
  $("#navmenu").click(function() {
    $("#menu").toggle();
    const isExpanded = $("#menu").is(":visible");
    $("#navmenu").attr("aria-expanded", isExpanded);
  });

  // Set up hover animation
  $("#navmenu").hover(
    function() {
      $(this).stop().animate({"border-color": "#007bff"}, "slow");
    },
    function() {
      $(this).stop().animate({"border-color": "#0056b3"}, "slow");
    }
  );

  // Set up keypress for accessibility
  $("#navmenu").on("keypress", function(e) {
    if (e.key === "Enter" || e.key === " ") {
      $("#menu").toggle();
      const isExpanded = $("#menu").is(":visible");
      $("#navmenu").attr("aria-expanded", isExpanded);
    }
  });

  // Fetch the username
  get_username();
}

function set_username() {
  $("#username").html(username);
}

function get_username() {
  var jqxhr;

  $.ajaxSetup({xhrFields: { withCredentials: true } });
  jqxhr = $.get("https://wiot.cz/wiot/v1/username")
    .done(function(data) {
      username = data;
      set_username();
    })
    .fail(function() {
      $("#username").html("Error fetching username");
    })
    .always(function() {
    });
}
