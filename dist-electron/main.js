import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dgram from "node:dgram";
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
ipcMain.handle("send-command", async (_event, commandText) => {
  return new Promise((resolve) => {
    const client = dgram.createSocket("udp4");
    const message = Buffer.from(commandText);
    const IP = "192.168.4.1";
    const PORT = 8888;
    client.send(message, PORT, IP, (err) => {
      if (err) {
        client.close();
        resolve({ success: false, error: err.message });
      }
    });
    client.on("message", (msg) => {
      client.close();
      resolve({ success: true, data: msg.toString() });
    });
    client.on("error", (err) => {
      client.close();
      resolve({ success: false, error: err.message });
    });
    setTimeout(() => {
      if (!client.closed) {
        client.close();
        resolve({ success: false, error: "Timeout" });
      }
    }, 2e3);
  });
});
ipcMain.handle("get-telemetry", async () => {
  return new Promise((resolve) => {
    const client = dgram.createSocket("udp4");
    client.send(Buffer.from("#telemetry"), 8888, "192.168.4.1");
    client.on("message", (msg) => {
      client.close();
      try {
        const data = JSON.parse(msg.toString());
        resolve({ success: true, data });
      } catch (e) {
        resolve({ success: false });
      }
    });
    setTimeout(() => {
      if (!client.closed) {
        client.close();
        resolve({ success: false });
      }
    }, 500);
  });
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
