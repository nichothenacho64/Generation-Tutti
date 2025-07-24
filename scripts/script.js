// import {createSentimentBarChart, createProsodicLineChart, createLemmaHeatmap} from "./charts/charts.js"

const transitionDelay = 600;

function loadTransitions() {
    const rows = document.querySelectorAll('.row-container');

    const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });

    }, {
    threshold: 0.3
    });

    rows.forEach(row => {
        observer.observe(row);
    });

    window.myObserver = observer;
};

function resetTransitions() {
    const rows = document.querySelectorAll('.row-container');
    window.myObserver.disconnect(); 

    rows.forEach(row => {row.classList.remove('visible')});
    
    setTimeout(() => rows.forEach(row => window.myObserver.observe(row)), transitionDelay); 
}

document.addEventListener("DOMContentLoaded", () => {
    loadTransitions();
});