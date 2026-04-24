import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld("api", {
  sendCommand: (text: string) => ipcRenderer.invoke("send-command", text),
  getTelemetry: () => ipcRenderer.invoke("get-telemetry"),
});
