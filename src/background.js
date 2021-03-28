'use strict'
import { app, protocol, BrowserWindow, Menu } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import { ipcMain as ipc } from 'electron-better-ipc'
import bindings from "bindings"

const isDevelopment = process.env.NODE_ENV !== 'production'

const kbd = bindings({
    bindings: "keybd_event.node",
    module_root: __dirname + "/../"
})
import { KC } from './keycode'

import ioHook from "iohook"
let win


// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        alwaysOnTop: true,
        width: 400,
        height: 80,
        webPreferences: {

            // Use pluginOptions.nodeIntegration, leave this alone
            // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
            nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
        }
    })
    Menu.setApplicationMenu(null)
    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
        win.webContents.openDevTools()
    } else {
        createProtocol('app')
        // Load the index.html when not in development
        win.loadURL('app://./index.html')
    }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
    createWindow()
    ioHook.on('keydown', event => {
        ipc.callRenderer(win, "captureKey", event)
    })
    ioHook.start()
    ipc.answerRenderer('sendKey', async key => {
        const toPress = key ? KC[key] : false
        if (!toPress) return
        kbd.keybd_event(toPress, 0, 0, 0)
        setTimeout(() => {
            kbd.keybd_event(toPress, 0, kbd.KEYEVENTF_KEYUP, 0)
        }, 3)
    });
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
    if (process.platform === 'win32') {
        process.on('message', (data) => {
            if (data === 'graceful-exit') {
                app.quit()
            }
        })
    } else {
        process.on('SIGTERM', () => {
            app.quit()
        })
    }
}
