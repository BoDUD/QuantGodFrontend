import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/responsive-hardening.css';
import { installOperatorExperience } from './app/operatorExperience.js';

const app = createApp(App);
app.mount('#app');
installOperatorExperience();
