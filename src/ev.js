import { EventEmitter } from 'events'
import { ipcRenderer as ipc } from 'electron-better-ipc'

export const ev = new EventEmitter

ipc.answerMain('captureKey', async event => {
    ev.emit('captureKey', event)
    return true;
});
ev.on('sendKey', (key) => {
    ipc.callMain("sendKey", key)
})
