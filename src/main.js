import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";

//font awesome
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faPaperPlane, faFileLines, faPenToSquare, faRotate } from "@fortawesome/free-solid-svg-icons";
import { faMarkdown } from "@fortawesome/free-brands-svg-icons";

library.add(faPaperPlane, faFileLines, faMarkdown, faPenToSquare, faRotate);

createApp(App)
	.component("font-awesome-icon", FontAwesomeIcon)
	.mount("#app");
