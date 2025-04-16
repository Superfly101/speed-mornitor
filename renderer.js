// DOM Elements
const currentSpeedElement = document.getElementById("current-speed");
const runTestButton = document.getElementById("run-test");
const thresholdInput = document.getElementById("threshold");
const intervalInput = document.getElementById("interval");
const notificationsCheckbox = document.getElementById("notifications");
const startupCheckbox = document.getElementById("startup");
const saveConfigButton = document.getElementById("save-config");
const historyContainer = document.getElementById("history-container");

// Test history array
let testHistory = [];
let isSpeedTestRunning = false;

// Update UI state during speed test
function updateSpeedTestState(running) {
  isSpeedTestRunning = running;
  runTestButton.disabled = running;
  runTestButton.textContent = running ? "Running Test..." : "Run Speed Test";
  if (running) {
    currentSpeedElement.textContent = "--";
  }
}

// Load configuration on startup
async function loadConfig() {
  const config = await window.electronAPI.getConfig();
  thresholdInput.value = config.threshold;
  intervalInput.value = config.interval;
  notificationsCheckbox.checked = config.notifications;
  startupCheckbox.checked = config.runAtStartup;
}

// Save configuration
async function saveConfig() {
  const config = {
    threshold: parseInt(thresholdInput.value, 10),
    interval: parseInt(intervalInput.value, 10),
    notifications: notificationsCheckbox.checked,
    runAtStartup: startupCheckbox.checked,
  };

  await window.electronAPI.updateConfig(config);
  alert("Configuration saved!");
}

// Run a speed test
async function runSpeedTest() {
  if (isSpeedTestRunning) return;

  updateSpeedTestState(true);

  try {
    const downloadSpeed = await window.electronAPI.runSpeedTest();
    if (downloadSpeed !== null) {
      currentSpeedElement.textContent = downloadSpeed.toFixed(2);
    } else {
      currentSpeedElement.textContent = "Error";
    }
  } catch (error) {
    console.error("Failed to run speed test:", error);
    currentSpeedElement.textContent = "Error";
  } finally {
    updateSpeedTestState(false);
  }
}

// Update history display
function updateHistoryDisplay() {
  if (testHistory.length === 0) {
    historyContainer.innerHTML = "<p>No test history available yet.</p>";
    return;
  }

  historyContainer.innerHTML = "";

  // Sort by timestamp (newest first)
  testHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Take only the most recent 10 tests
  const recentTests = testHistory.slice(0, 10);

  recentTests.forEach((test) => {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";

    const date = new Date(test.timestamp);
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

    historyItem.innerHTML = `
      <span>${formattedDate}</span>
      <span>Download: ${test.download.toFixed(2)} Mbps</span>
      <span>Upload: ${test.upload.toFixed(2)} Mbps</span>
    `;

    historyContainer.appendChild(historyItem);
  });
}

// Event listeners
runTestButton.addEventListener("click", runSpeedTest);
saveConfigButton.addEventListener("click", saveConfig);

// Listen for speed test results from main process
window.electronAPI.onSpeedTestResult((result) => {
  testHistory.push(result);
  updateHistoryDisplay();
});

// Listen for speed test state changes from main process
window.electronAPI.onSpeedTestStateChange((running) => {
  updateSpeedTestState(running);
});

// Initialize
loadConfig();
// Set initial state to running since main.js starts a test on launch
updateSpeedTestState(true);
