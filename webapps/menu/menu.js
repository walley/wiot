function init_menu() {
    $("#navmenu").on("click keypress", function(e) {
        if (e.type === "click" || (e.type === "keypress" && (e.key === "Enter" || e.key === " "))) {
            $("#menu").toggle();
            $(this).attr("aria-expanded", $("#menu").is(":visible"));
        }
    });

    $(document).on("click keypress", function(e) {
        if (!$(e.target).closest("#navmenu, #menu, .ui-dialog").length) {
            $("#menu").hide();
            $("#navmenu").attr("aria-expanded", "false");
        }
    });

    $("#menu").menu({
        position: { my: "right top", at: "right bottom" }
    });

    $.getJSON("menu/menu.json", function(data) {
        // Load menu items from menu.json
        $.each(data.menuitems, function(index, menuitem) {
            let li = $("<li>").appendTo("#menu");
            if (menuitem.divider) {
                li.addClass("ui-menu-divider");
            } else {
                let a = $("<a>")
                    .attr("href", menuitem.href)
                    .text(menuitem.label)
                    .appendTo(li);
                if (menuitem.id) {
                    a.attr("id", menuitem.id);
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
            modal: false,
            draggable: true,
            resizable: false,
            width: 400,
            position: { my: "center", at: "center", of: window }
        });

        // Handle click on the "About" menu item
        $("#about-menuitem").on("click", function(e) {
            e.preventDefault();
            $("#about-dialog").dialog("open");
            $("#menu").hide();
            $("#navmenu").attr("aria-expanded", "false");
        });

        get_username();
    }).fail(function(error) {
        console.error("Error loading menu.json:", error);
    });
}

function get_username() {
    $.ajax({
        url: "https://wiot.cz/wiot/v1/user/username",
        dataType: "json",
        xhrFields: { withCredentials: true },
        success: function(result) {
            let username = result.username;
            if (username) {
                $("#menu").prepend($("<li>").text(username));
                $("#menu").prepend($("<li>").addClass("ui-menu-divider"));
            }
        },
        error: function(error) {
            console.error("Error fetching username:", error);
        }
    });
}
