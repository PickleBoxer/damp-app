import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        appName: 'electron-shadcn',
        titleDashboardPage: 'Dashboard',
        titleServicesPage: 'Services',
        titleSitesPage: 'Sites',
        titleSettingsPage: 'Settings',
        titleAboutPage: 'About',
      },
    },
    'pt-BR': {
      translation: {
        appName: 'electron-shadcn',
        titleDashboardPage: 'Página Inicial',
        titleServicesPage: 'Página de Serviços',
        titleSitesPage: 'Página de Sites',
        titleSettingsPage: 'Página de Configurações',
        titleAboutPage: 'Página Sobre',
      },
    },
  },
});
