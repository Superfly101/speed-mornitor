const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  runSpeedTest: () => ipcRenderer.invoke("run-speed-test"),
  getConfig: () => ipcRenderer.invoke("get-config"),
  updateConfig: (config) => ipcRenderer.invoke("update-config", config),
  onSpeedTestResult: (callback) => {
    ipcRenderer.on("speed-test-result", (event, data) => callback(data));
    return () => {
      ipcRenderer.removeAllListeners("speed-test-result");
    };
  },
  onSpeedTestStateChange: (callback) => {
    ipcRenderer.on("speed-test-state", (event, running) => callback(running));
    return () => {
      ipcRenderer.removeAllListeners("speed-test-state");
    };
  },
});
