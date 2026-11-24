import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

// Tunggu navigasi pertama selesai (termasuk guard yang menunggu Firebase memulihkan sesi)
// supaya tidak ada halaman yang "kedip" sebelum redirect.
router.isReady().then(() => app.mount('#app'))
