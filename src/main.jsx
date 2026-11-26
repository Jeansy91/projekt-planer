import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './AppRouter.jsx';
import './i18n.js';
import './index.css';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
    .catch((error) => console.error('Offline app shell registration failed:', error));
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(BrowserRouter, null, React.createElement(AppRouter))
  )
);
