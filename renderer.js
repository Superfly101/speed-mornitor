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
let originalConfig = {}; // Store original config for comparison

// Tab switching functionality
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Remove active class from all buttons and hide all contents
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.add("hidden"));

    // Add active class to clicked button and show corresponding content
    button.classList.add("active");
    const tabId = button.dataset.tab;
    document.getElementById(tabId).classList.remove("hidden");
  });
});

// Update UI state during speed test
function updateSpeedTestState(running) {
  isSpeedTestRunning = running;
  runTestButton.disabled = running;
  runTestButton.textContent = running ? "Running Test..." : "Run Speed Test";
  if (running) {
    currentSpeedElement.textContent = "0.00";
  }
}

// Update speed display
function updateSpeedDisplay(speed) {
  if (typeof speed === "number") {
    currentSpeedElement.textContent = speed.toFixed(2);
  } else {
    currentSpeedElement.textContent = speed;
  }
}

// Validate settings form
function validateSettings() {
  const threshold = parseInt(thresholdInput.value);
  const interval = parseInt(intervalInput.value);

  if (!thresholdInput.value || !intervalInput.value) {
    return false;
  }

  if (isNaN(threshold) || threshold < 1 || threshold > 1000) {
    return false;
  }

  if (isNaN(interval) || interval < 5 || interval > 1440) {
    return false;
  }

  return true;
}

// Check if settings have changed
function hasSettingsChanged() {
  return (
    parseInt(thresholdInput.value) !== originalConfig.threshold ||
    parseInt(intervalInput.value) !== originalConfig.interval ||
    notificationsCheckbox.checked !== originalConfig.notifications ||
    startupCheckbox.checked !== originalConfig.runAtStartup
  );
}

// Update save button state
function updateSaveButtonState() {
  saveConfigButton.disabled = !validateSettings() || !hasSettingsChanged();
}

// Load configuration on startup
async function loadConfig() {
  const config = await window.electronAPI.getConfig();
  originalConfig = { ...config }; // Store original config

  thresholdInput.value = config.threshold;
  intervalInput.value = config.interval;
  notificationsCheckbox.checked = config.notifications;
  startupCheckbox.checked = config.runAtStartup;

  updateSaveButtonState();
}

// Save configuration
async function saveConfig() {
  if (!validateSettings()) {
    alert(
      "Please ensure all fields are filled with valid values:\n- Threshold: 1-1000 Mbps\n- Interval: 5-1440 minutes"
    );
    return;
  }

  const config = {
    threshold: parseInt(thresholdInput.value, 10),
    interval: parseInt(intervalInput.value, 10),
    notifications: notificationsCheckbox.checked,
    runAtStartup: startupCheckbox.checked,
  };

  await window.electronAPI.updateConfig(config);
  originalConfig = { ...config }; // Update original config
  updateSaveButtonState();
  alert("Configuration saved!");
}

// Run a speed test
async function runSpeedTest() {
  if (isSpeedTestRunning) return;

  updateSpeedTestState(true);

  try {
    const downloadSpeed = await window.electronAPI.runSpeedTest();
    if (downloadSpeed !== null) {
      updateSpeedDisplay(downloadSpeed);
    } else {
      updateSpeedDisplay("Error");
    }
  } catch (error) {
    console.error("Failed to run speed test:", error);
    updateSpeedDisplay("Error");
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
  updateSpeedDisplay(result.download);
  testHistory.push(result);
  updateHistoryDisplay();
});

// Listen for speed test state changes from main process
window.electronAPI.onSpeedTestStateChange((running) => {
  updateSpeedTestState(running);
});

// Listen for live speed updates
window.electronAPI.onLiveSpeedUpdate((speed) => {
  if (isSpeedTestRunning) {
    updateSpeedDisplay(speed);
  }
});

// Add input event listeners for settings
thresholdInput.addEventListener("input", updateSaveButtonState);
intervalInput.addEventListener("input", updateSaveButtonState);
notificationsCheckbox.addEventListener("change", updateSaveButtonState);
startupCheckbox.addEventListener("change", updateSaveButtonState);

// Initialize
loadConfig();
// Set initial state to running since main.js starts a test on launch
updateSpeedTestState(true);
