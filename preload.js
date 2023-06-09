const { contextBridge } = require("electron");


contextBridge.exposeInMainWorld("env", {
	OPENAI_KEY: process.env.OPENAI_KEY
});
