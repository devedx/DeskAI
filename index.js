const { app, BrowserWindow } = require("electron");
const path = require("path");
const dotenv = require('dotenv');

dotenv.config();

const isDev = process.env.NODE_ENV === "dev";

function createWindow() {
	const mainWindow = new BrowserWindow({
		width: 1100,
		height: 700,
		icon: path.join(__dirname, "public/icon.png"),
		webPreferences: {
			nodeIntegration: true,
			preload: path.join(__dirname, "preload.js")
		}
	});

	if (isDev) {
		mainWindow.loadURL("http://localhost:5173");
		mainWindow.webContents.openDevTools();
	} else {
		mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
	}
}

app.whenReady().then(createWindow);
