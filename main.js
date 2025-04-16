const { app, BrowserWindow, Tray, Menu, ipcMain } = require("electron");
const path = require("path");
const speedTest = require("speedtest-net");
const notifier = require("node-notifier");

// Keep a global reference of objects to prevent garbage collection
let mainWindow;
let tray;
let isSpeedTestRunning = false;

// Configuration defaults
let config = {
  threshold: 50, // Default threshold in Mbps
  interval: 30, // Default check interval in minutes
  notifications: true,
  runAtStartup: false,
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "assets/icon.png"),
  });

  mainWindow.loadFile("index.html");

  // Hide window to tray on close instead of quitting
  mainWindow.on("close", (event) => {
    event.preventDefault();
    mainWindow.hide();
    return false;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, "assets/tray-icon.png"));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Dashboard",
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: "Run Speed Test Now",
      click: () => {
        runSpeedTest();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.exit();
      },
    },
  ]);

  tray.setToolTip("Internet Speed Monitor");
  tray.setContextMenu(contextMenu);

  // Show the window when clicking the tray icon
  tray.on("click", () => {
    mainWindow.show();
  });
}

function updateSpeedTestState(running) {
  isSpeedTestRunning = running;
  if (mainWindow) {
    mainWindow.webContents.send("speed-test-state", running);
  }
}

async function runSpeedTest() {
  if (isSpeedTestRunning) return null;

  updateSpeedTestState(true);

  try {
    // Show notification that test is starting
    if (config.notifications) {
      notifier.notify({
        title: "Speed Test",
        message: "Running speed test...",
        icon: path.join(__dirname, "assets/icon.png"),
      });
    }

    // Run the test
    const test = await speedTest({ acceptLicense: true, acceptGdpr: true });
    const downloadSpeed = test.download.bandwidth / 125000; // Convert to Mbps

    // Send results to renderer
    if (mainWindow) {
      mainWindow.webContents.send("speed-test-result", {
        download: downloadSpeed,
        upload: test.upload.bandwidth / 125000,
        timestamp: new Date().toISOString(),
      });
    }

    // Check if speed exceeds threshold
    if (downloadSpeed > config.threshold && config.notifications) {
      notifier.notify({
        title: "Speed Alert",
        message: `Your download speed (${downloadSpeed.toFixed(
          2
        )} Mbps) exceeds the threshold (${config.threshold} Mbps)!`,
        icon: path.join(__dirname, "assets/icon.png"),
      });
    }

    return downloadSpeed;
  } catch (error) {
    console.error("Speed test failed:", error);

    if (config.notifications) {
      notifier.notify({
        title: "Speed Test Error",
        message: "Failed to run speed test. Check your connection.",
        icon: path.join(__dirname, "assets/icon.png"),
      });
    }

    return null;
  } finally {
    updateSpeedTestState(false);
  }
}

// Set up a timer to run speed tests periodically
let speedTestInterval;

function setupSpeedTestInterval() {
  // Clear existing interval if any
  if (speedTestInterval) {
    clearInterval(speedTestInterval);
  }

  // Set up new interval based on config
  const intervalMs = config.interval * 60 * 1000; // Convert minutes to ms
  speedTestInterval = setInterval(runSpeedTest, intervalMs);
}

// IPC handlers for renderer communication
ipcMain.handle("run-speed-test", async () => {
  return await runSpeedTest();
});

ipcMain.handle("get-config", () => {
  return config;
});

ipcMain.handle("update-config", (event, newConfig) => {
  config = { ...config, ...newConfig };
  setupSpeedTestInterval(); // Update interval if changed
  return config;
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupSpeedTestInterval();

  // Run an initial speed test
  setTimeout(runSpeedTest, 1000);
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
