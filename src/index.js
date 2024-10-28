import React from 'react';
import ReactDOM from 'react-dom';
import './index.css'; // Keep this if you have custom CSS
import App from './App.jsx';

ReactDOM.render(
    <App />, // Removed React.StrictMode for now
    document.getElementById('root')
);


// Patch to suppress ResizeObserver loop limit exceeded error
const resizeObserverErr = () => {
    let resizeObserverErrDiv = document.createElement('div');
    resizeObserverErrDiv.id = 'resizeObserverErr';
    resizeObserverErrDiv.style.display = 'none';
    document.body.appendChild(resizeObserverErrDiv);
    const observer = new ResizeObserver(() => {
        resizeObserverErrDiv.style.display = 'block';
    });
    observer.observe(document.body);
};

resizeObserverErr();
