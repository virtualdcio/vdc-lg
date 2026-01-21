# Looking Glass
Modern, super simple and fresh looking glass based on Bootstrap 5 and PHP 8 (also compatible with 7.4). A looking glass is a network utility which is
made user-friendly for everyone to use. It allows you to execute network related commands within a remote network, usually that of an ISP.

## Features
- Bootstrap 5 UI.
- Real time command output using JavaScript.
- Supports ping/ping6, traceroute/traceroute6 and mtr/mtr6.
- Easy to customize and to configure.
- DNS checking to prevent unnecessary executions.
- Latency feature from visitor to LG.
- Dark/light/auto mode theme.

## Requirements
- Any Linux distribution, this has been tested on RHEL 8 + 9, for NetBSD users see [#47](https://github.com/hybula/lookingglass/issues/47).
- PHP 7.4 or higher, PHP 8 preferred.
- IPv6 connectivity if you want to use the v6 equivalents.
- Root access.

## Installation
#### Docker
For installation using Docker, follow these steps and run the commands on the target machine where the application should be installed:

1. First, ensure Docker and Docker Compose are already installed.
2. Clone this GitHub repository: `git clone https://github.com/hybula/lookingglass.git`.
3. Change your current working directory to the freshly cloned repository.
4. Currently, the Docker images are not hosted on an image repository, so you'll have to build them yourself with the following command: `docker compose build`.
5. For production use, change the environment variables inside the `docker-compose.yml` file to the desired values. For testing purposes, the default values are fine.
6. Create and start the containers: `docker compose up -d`.
7. Afterward, the Looking Glass should be reachable from your web browser at `http://$your_server_ip/`!

### iPerf3 Installation (Optional)

#### Docker
1. Uncomment the section for `iperf3` in `docker-compose.yml` if you want iPerf3 and the looking glass to be on the same server.
Otherwise, please copy the `iperf3` section and save it as `docker-compose.yml` on another server with Docker and Docker Compose installed.
2. Start the iPerf3 container: `docker compose up -d`.
3. Locate the two lines containing `LG_SPEEDTEST_CMD_INCOMING` and `LG_SPEEDTEST_CMD_OUTGOING` respectively in `docker/php-fpm/src/config.php`.
5. Change `hostname` in these lines to the IPv4 address of your iPerf3 server.

## Upgrading
Upgrading from a previous version is easy, simply overwrite your current installation with the new files. Then update your config.php accordingly, the script will automatically check for missing variables.

## Customization
If you open up config.dist.php you will see that there are some features that allows you to customize the looking glass, this includes a custom CSS override.
You may also extend the looking glass with a custom block.