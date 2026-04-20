"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  sendCommand: (text) => electron.ipcRenderer.invoke("send-command", text)
});
