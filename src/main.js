import "./assets/main.css"

import { createApp } from "vue"
import App from "./App.vue"

//font awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'

library.add(faPaperPlane)

createApp(App).component('font-awesome-icon', FontAwesomeIcon).mount("#app")
