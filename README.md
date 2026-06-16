# wiot

A Perl-based project designed as an Internet of Things (IoT) server, implemented as a `mod_perl2` module for the Apache HTTP Server. It likely acts as a central hub for data collection, device communication, and management, leveraging Apache's robust web serving capabilities. The name "wiot" suggests a focus on Wireless IoT or a "Web of IoT" integration.

## Table of Contents

-   [Features](#features)
-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation and Configuration](#installation-and-configuration)
-   [Usage](#usage)
-   [Project Structure](#project-structure)
-   [Database Schema](#database-schema)
-   [Contributing](#contributing)
-   [License](#license)
-   [Contact](#contact)

## Features

*(As the detailed code content is not directly available, this section will list potential features based on the identified Perl server component and general IoT practices.)*

* **Apache HTTP Server Integration:** Designed to run efficiently as a `mod_perl2` handler, leveraging Apache's features for web serving and request handling.
* **IoT Device Server:** Functions as a centralized backend for receiving data from and sending commands to IoT devices.
* **Data Persistence:** Integrates with SQLite to store sensor data, device information, and other relevant IoT metrics.
* **Perl-based Backend:** Utilizes Perl for robust server-side logic and processing.
* **Scalable Architecture:** Benefits from Apache's ability to handle concurrent connections, making it suitable for a growing number of IoT devices.
* **API/Protocol Handling:** (Assumed) Implements specific protocols for device communication (e.g., HTTP APIs, custom RESTful endpoints).
* **Session Management:** Likely handles user or device sessions for authentication and authorization.

## Getting Started

These instructions will guide you through setting up the `wiot` server as a `mod_perl2` module under Apache on your local machine for development and testing.

### Prerequisites

* **Apache HTTP Server:** Version 2.x
* **`mod_perl2`:** The Apache Perl module, compatible with your Apache version.
* **Perl 5.x:** (Ensure you have a recent version of Perl installed)
* **CPAN:** Perl's comprehensive archive network, for managing Perl modules.
* **SQLite:** For database storage.
* **Required Perl modules:** You will need to identify and install modules used by `Wiot::Server2` (e.g., `DBI`, `DBD::SQLite`, `Apache2::Request`, `Apache2::Const`, `JSON` if dealing with JSON data, etc.).

### Installation and Configuration

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/walley/wiot.git](https://github.com/walley/wiot.git)
    cd wiot
    ```

2.  **Install Perl dependencies:**
    Navigate to the `perl` directory within the cloned repository. You'll need to install any Perl modules that `Wiot::Server2` depends on.
    ```bash
    cd perl
    # Example modules - you will need to determine the actual dependencies from the code.
    sudo cpan install DBI DBD::SQLite Apache2::Request Apache2::Const JSON
    ```
    If you encounter issues, you can run `sudo cpan` and then use the `install` command for each module at the CPAN prompt.

3.  **Database setup:**
    The project uses SQLite for data storage. You need to create the database file and initialize its schema. The schema is defined in the `sqlite_schema` file at the root of the repository.
    ```bash
    # Assuming you are in the project root after cloning:
    sqlite3 wiot.db < sqlite_schema
    ```
    *(The name of the database file `wiot.db` is an assumption; it might be configured within `Server2.pm` or Apache's configuration.)*

4.  **Configure Apache for `mod_perl2`:**
    Ensure `mod_perl2` is enabled in your Apache configuration (e.g., `httpd.conf` or a separate configuration file in `conf.d/` or `mods-enabled/`).
    You might need to add lines like:
    ```apache
    LoadModule perl_module modules/mod_perl.so
    <IfModule perl_module>
        PerlRequire /path/to/your/wiot/perl/Wiot/Server2.pm
    </IfModule>
    ```
    Replace `/path/to/your/wiot/` with the actual path to your cloned `wiot` repository.

5.  **Configure a Virtual Host or Location for `wiot`:**
    You'll need to configure an Apache `VirtualHost` or `<Location>` block to handle requests and route them to your `Wiot::Server2` module. Here's an example:

    ```apache
    <VirtualHost *:80>
        ServerName your.iot.server.com
        DocumentRoot "/path/to/your/wiot/htdocs" # If you have static files

        <Location /api/wiot>
            SetHandler perl-script
            PerlHandler Wiot::Server2
            # Optional: Set Perl variables that Server2.pm might use
            # PerlSetVar WiotDbPath /path/to/your/wiot/wiot.db
            Options +ExecCGI
        </Location>

        ErrorLog "${APACHE_LOG_DIR}/wiot_error.log"
        CustomLog "${APACHE_LOG_DIR}/wiot_access.log" combined
    </VirtualHost>
    ```
    * **`ServerName`**: Replace with your desired domain or IP.
    * **`DocumentRoot`**: Adjust if your project includes a web root for static files.
    * **`<Location /api/wiot>`**: This defines a URL path where your Perl module will handle requests. All requests to `http://your.iot.server.com/api/wiot` (or similar) will be processed by `Wiot::Server2`.
    * **`PerlHandler Wiot::Server2`**: This is the core directive that tells `mod_perl2` to use the `Wiot::Server2` module to handle requests for this location.
    * **`PerlSetVar`**: If your Perl module requires configuration variables (e.g., database paths, API keys), you can pass them using `PerlSetVar`. Check `Server2.pm` for expected variables.
    * **`Options +ExecCGI`**: Often necessary for `mod_perl` handlers.

## Usage

1.  **Restart Apache:**
    After configuring Apache, you need to restart it for the changes to take effect:
    ```bash
    sudo systemctl restart apache2 # On Debian/Ubuntu
    sudo apachectl restart        # On RHEL/CentOS or general
    ```
2.  **Access the server:**
    Once Apache is running, your `wiot` server will be accessible via the configured URL (e.g., `http://your.iot.server.com/api/wiot`). You can then send requests from your IoT devices or client applications to this endpoint.

    *(Further instructions will depend on the specific API or communication protocol `Wiot::Server2` implements. Examples of how to send data or commands might be added here.)*

## Project Structure

The core Perl server logic is located at:
/wiot/
├── perl/
│   └── Wiot/
│       └── Server2.pm  # The main mod_perl2 module
├── sqlite_schema       # Database schema definition
└── ... (other files, e.g., Apache config snippets, client examples)


* `perl/Wiot/Server2.pm`: The main Perl module that handles HTTP requests when run under `mod_perl2`.
* `sqlite_schema`: Defines the SQLite database structure used by the server.

## Database Schema

As identified from the `sqlite_schema` file, the project uses the following tables to manage IoT data:

* **`sensors`**: Stores information about individual sensors.
    * `id` (integer primary key AUTOINCREMENT)
    * `sn` (numeric unique) - Serial Number
    * `note` (varchar)
* **`data`**: Stores the actual sensor readings or data points.
    * `id` (integer primary key AUTOINCREMENT)
    * `sn` (numeric) - Sensor Serial Number (references `sensors.sn`)
    * `ts` (numeric) - Timestamp
    * `pq` (varchar) - Physical Quantity (e.g., "temperature", "humidity")
    * `value` (varchar) - The recorded value
    * `systemts` (DATETIME DEFAULT (strftime('%s','now'))) - System timestamp
* **`input`**: Possibly for incoming data or commands to devices.
    * `id` (integer primary key AUTOINCREMENT)
    * `sn` (varchar)
    * `variable` (varchar)
    * `value` (numeric)
    * `type` (varchar)
* **`session`**: For user sessions or device authentication.
    * `acc` (varchar)
    * `sessid` (varchar primary key)
    * `username` (varchar)
* **`house`**: To organize devices by location.
    * `id` (integer primary key AUTOINCREMENT)
    * `name` (varchar)
    * `address` (varchar)
    * `location` (varchar)
* **`room`**: Sub-division within a house.
    * `id` (integer primary key AUTOINCREMENT)
    * `house` (numeric) - References `house.id`
    * `name` (varchar)
* **`devices`**: Detailed information about individual IoT devices.
    * `id` (integer primary key AUTOINCREMENT)
    * `name` (varchar)
    * `type` (varchar)
    * `image` (varchar)
    * `room` (integer) - References `room.id`
    * `note` (varchar)

**Indexes:**
* `tsindex` on `data` (`sn`, `pq`, `systemts`)
* `stsindex` on `data` (`systemts`)
* `pqindex` on `data` (`pq`)
* `snindex` on `data` (`sn`)

## Contributing

We welcome contributions to the `wiot` project! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix: `git checkout -b feature/your-feature-name` or `bugfix/your-bug-fix-name`.
3.  Make your changes and commit them with clear, concise messages.
4.  Push your changes to your forked repository.
5.  Open a pull request to the `main` branch of this repository, describing your changes in detail.

Please ensure your Perl code adheres to any existing coding standards and includes appropriate tests.

## License

This project is likely licensed under an open-source license. *(Please specify the exact license here once confirmed, e.g., MIT, Apache 2.0, GPLv3. If no license file exists, consider adding one.)*

Example:

This project is licensed under the GPLv3, see [LICENSE](LICENSE) file for details.

## Contact

If you have any questions, suggestions, or issues, feel free to open an issue on the GitHub repository or contact the project owner directly.
