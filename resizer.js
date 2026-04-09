// resizer.js
const resizer  = document.getElementById('resizer');
const history  = document.querySelector('.history');
const container = document.querySelector('.container');

let startX, startWidth;

resizer.addEventListener('mousedown', (e) => {
    startX     = e.clientX;
    startWidth = history.getBoundingClientRect().width;
    resizer.classList.add('dragging');

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    document.body.style.cursor    = 'col-resize';
    document.body.style.userSelect = 'none';
});

function onMouseMove(e) {
    const delta    = startX - e.clientX;         // positif = on agrandit
    const newWidth = Math.min(Math.max(startWidth + delta, 200), 700);

    container.style.gridTemplateColumns = `220px 1fr 4px ${newWidth}px`;
}

function onMouseUp() {
    resizer.classList.remove('dragging');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup',   onMouseUp);
    document.body.style.cursor    = '';
    document.body.style.userSelect = '';
}