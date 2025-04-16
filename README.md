# Speed Monitor

A simple Electron application that monitors your internet speed and provides notifications based on configurable thresholds.

## Features

- Run speed tests and display current download/upload speeds.
- Save configuration settings for speed threshold, check interval, and startup options.
- View test history with timestamps.
- Notifications for speed alerts and errors.

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd speed-monitor
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   npm start
   ```

## Configuration

You can configure the following settings:

- **Speed Threshold (Mbps)**: The minimum download speed to trigger a notification.
- **Check Interval (minutes)**: How often to run the speed test.
- **Enable Notifications**: Toggle notifications for speed alerts.
- **Run at System Startup**: Option to start the application when the system boots.

## License

This project is licensed under the ISC License.
