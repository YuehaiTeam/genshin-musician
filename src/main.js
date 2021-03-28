import { createApp } from 'vue'
import App from './App.vue'
import { ev } from './ev'
window.ev = ev

createApp(App).mount('#app')
