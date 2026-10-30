import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import { AiLabApp } from './AiLabApp';

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AiLabApp />
  </React.StrictMode>,
);
