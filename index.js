const { app, BrowserWindow, Tray, Menu, globalShortcut } = require("electron");
const path = require("path");
const dotenv = require('dotenv');

dotenv.config();

let mainWindow;
const isDev = process.env.NODE_ENV === "dev";

function createWindow() {
	mainWindow = new BrowserWindow({
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

		mainWindow.webContents.on("devtools-focused", () => {
			mainWindow.focus();
		});
	} else {
		mainWindow.loadFile(path.join(__dirname, "dist/index.html"));
	}

	mainWindow.on("close", event => {
		if (app.quitting) {
			mainWindow = null;
		} else {
			event.preventDefault();
			mainWindow.hide();
		}
	});

	const tray = new Tray(path.join(__dirname, "public/icon.png"));
	const contextMenu = Menu.buildFromTemplate([
		{
			label: "Show App",
			click: () => {
				mainWindow.show();
			},
		},
		{
			label: "Quit",
			click: () => {
				app.quitting = true;
				app.quit();
			},
		},
	]);
	tray.setToolTip("DeskAI");
	tray.setContextMenu(contextMenu);
	tray.on("click", () => {
		mainWindow.show();
	});
}

function registerShortcuts() {
	globalShortcut.register("CommandOrControl+Alt+Y", () => {
		if (mainWindow.isVisible()) {
			mainWindow.close();
		} else {
			mainWindow.show();
		}
	});
}

app.whenReady().then(() => {
	createWindow();
	registerShortcuts();
});
