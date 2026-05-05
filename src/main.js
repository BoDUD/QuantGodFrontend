import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import App from './App.vue';
import './styles.css';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/responsive-hardening.css';
import { installOperatorExperience } from './app/operatorExperience.js';

const app = createApp(App);
app.use(Antd).mount('#app');
installOperatorExperience();
