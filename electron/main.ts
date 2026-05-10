import { app, BrowserWindow, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    title: "Ground Base",
    icon: path.join(process.env.VITE_PUBLIC, "logo.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  win.removeMenu();

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

ipcMain.handle("send-command", async (_event, commandText: string) => {
  return new Promise((resolve) => {
    const client = new net.Socket();
    const IP = "192.168.4.1";
    const PORT = 8888;

    let isFinished = false;
    let responseData = Buffer.alloc(0);

    client.setTimeout(5000);

    client.connect(PORT, IP, () => {
      client.write(commandText);
    });

    client.on("data", (chunk) => {
      responseData = Buffer.concat([responseData, chunk]);
    });

    const processResponse = () => {
      if (isFinished) return;
      isFinished = true;
      client.destroy();

      if (responseData.length === 0) {
        resolve({ success: true, data: "" });
        return;
      }

      const checkStr = responseData.subarray(0, 50).toString("utf8");

      if (checkStr.includes("name:") && responseData.includes("data:")) {
        const dataIndex = responseData.indexOf("data:");
        const textPrefix = responseData
          .subarray(0, dataIndex + 5)
          .toString("utf8");
        const binaryData = responseData.subarray(dataIndex + 5);
        const base64Image = binaryData.toString("base64");

        resolve({ success: true, data: textPrefix + base64Image });
      } else {
        resolve({ success: true, data: responseData.toString("utf8") });
      }
    };

    client.on("end", processResponse);
    client.on("close", processResponse);

    client.on("error", (err) => {
      if (!isFinished) {
        isFinished = true;
        client.destroy();
        resolve({ success: false, error: err.message });
      }
    });

    client.on("timeout", () => {
      if (!isFinished) {
        isFinished = true;
        client.destroy();
        resolve({ success: false, error: "Timeout" });
      }
    });
  });
});

ipcMain.handle("get-telemetry", async () => {
  return new Promise((resolve) => {
    const client = new net.Socket();
    const IP = "192.168.4.1";
    const PORT = 8888;

    let isFinished = false;
    let responseData = Buffer.alloc(0);

    client.setTimeout(1000);

    client.connect(PORT, IP, () => {
      client.write("#telemetry");
    });

    client.on("data", (chunk) => {
      responseData = Buffer.concat([responseData, chunk]);
    });

    const processResponse = () => {
      if (isFinished) return;
      isFinished = true;
      client.destroy();

      if (responseData.length === 0) {
        resolve({ success: false });
        return;
      }

      try {
        let rawString = responseData.toString("utf8");
        rawString = rawString.replace(/\b[-+]?nan\b/gi, '"nan"');
        const data = JSON.parse(rawString);
        resolve({ success: true, data });
      } catch (e) {
        console.error(
          "Parse error:",
          e,
          "String was:",
          responseData.toString("utf8"),
        );
        resolve({ success: false });
      }
    };

    client.on("end", processResponse);
    client.on("close", processResponse);

    client.on("error", () => {
      if (!isFinished) {
        isFinished = true;
        client.destroy();
        resolve({ success: false });
      }
    });

    client.on("timeout", () => {
      if (!isFinished) {
        isFinished = true;
        client.destroy();
        resolve({ success: false });
      }
    });
  });
});
