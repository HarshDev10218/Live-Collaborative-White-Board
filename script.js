// --- Bulletproof Socket.IO Connection Engine ---
let socketUrl = window.location.origin;

// If testing locally via double-click (file:) or VS Code Live Server (port 5500), force routing to Node backend
if (window.location.protocol === 'file:' || window.location.port === '5500') {
  socketUrl = 'http://localhost:3000';
}
const socket = io(socketUrl);

// --- DOM Element Registrations ---
const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
const statusBadge = document.getElementById('status-badge');
const userCountVal = document.getElementById('user-count-val');
const roomIdVal = document.getElementById('room-id-val');

const colorPicker = document.getElementById('color-picker');
const brushSizeSlider = document.getElementById('brush-size');
const sizeValText = document.getElementById('size-val');

const btnPen = document.getElementById('btn-pen');
const btnEraser = document.getElementById('btn-eraser');
const btnUndo = document.getElementById('btn-undo');
const btnClear = document.getElementById('btn-clear');
const btnDownload = document.getElementById('btn-download');

// --- Dynamic Canvas Application States ---
let isDrawing = false;
let isEraserMode = false;
let lastX = 0;
let lastY = 0;

// --- Collaborative Undo History Core Memory ---
let historyStack = [];
const MAX_HISTORY = 25; // Prevents browser memory bloat

let currentConfig = {
  color: colorPicker.value,
  size: parseInt(brushSizeSlider.value)
};

// --- Multi-Room URL Router ---
const urlParams = new URLSearchParams(window.location.search);
const targetRoom = urlParams.get('room') || 'default';
roomIdVal.textContent = targetRoom;

// --- Connection Event Listeners ---
socket.on('connect', () => {
  statusBadge.textContent = "Connected";
  statusBadge.className = "badge connected";
  socket.emit('join-room', targetRoom);
});

socket.on('disconnect', () => {
  statusBadge.textContent = "Disconnected";
  statusBadge.className = "badge disconnected";
});

socket.on('update-user-count', (count) => {
  userCountVal.textContent = count;
});

// --- Non-Destructive Resolution Management Engine ---
function resizeCanvas() {
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight;

  // Temporary container to cache existing artwork prior to frame manipulation
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(canvas, 0, 0);

  // Resize live canvas element
  canvas.width = width;
  canvas.height = height;

  // Restore necessary line smoothing definitions
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Repaint historical vector contents 
  ctx.drawImage(tempCanvas, 0, 0, width, height);
  
  // Prime baseline layer if memory stack is entirely empty
  if (historyStack.length === 0) {
    saveCanvasSnapshot();
  }
}
window.addEventListener('resize', resizeCanvas);

// Captures a snapshot of the whiteboard state
function saveCanvasSnapshot() {
  if (historyStack.length >= MAX_HISTORY) {
    historyStack.shift(); // Evict oldest frame
  }
  historyStack.push(canvas.toDataURL());
}

// --- Fundamental Vector Drawing Module ---
function drawLine(x0, y0, x1, y1, color, size, emit = false) {
  ctx.beginPath();
  ctx.moveTo(x0 * canvas.width, y0 * canvas.height);
  ctx.lineTo(x1 * canvas.width, y1 * canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.stroke();
  ctx.closePath();

  if (!emit) return;

  // Broadcast relative coordinates (percentages) to ensure absolute cross-device parity
  socket.emit('drawing', { x0, y0, x1, y1, color, size });
}

// Translates raw pointer input coordinates into safe canvas scaling percentages
function getCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height
  };
}

// --- User Interaction Hooks ---
function startDrawing(e) {
  // Capture snapshot BEFORE rendering the new stroke to allow rolling back
  saveCanvasSnapshot();
  
  isDrawing = true;
  const coords = getCoordinates(e);
  lastX = coords.x;
  lastY = coords.y;
}

function processDrawing(e) {
  if (!isDrawing) return;
  e.preventDefault(); // Prevents touch devices from scrolling the page while drawing

  const coords = getCoordinates(e);
  const strokeColor = isEraserMode ? '#FFFFFF' : currentConfig.color;

  drawLine(lastX, lastY, coords.x, coords.y, strokeColor, currentConfig.size, true);

  lastX = coords.x;
  lastY = coords.y;
}

function stopDrawing() {
  isDrawing = false;
}

// Hardware Mouse Input Hooks
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', processDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Hardware Mobile Touch Input Hooks
canvas.addEventListener('touchstart', startDrawing, { passive: false });
canvas.addEventListener('touchmove', processDrawing, { passive: false });
canvas.addEventListener('touchend', stopDrawing);

// --- Inbound Network Action Receivers ---
socket.on('drawing', (data) => {
  drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size, false);
});

socket.on('clear-board', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  historyStack = [];
  saveCanvasSnapshot();
});

socket.on('sync-undo', (snapshot) => {
  applySnapshotToCanvas(snapshot);
});

// --- Dynamic Undo Execution Systems ---
function executeUndo() {
  if (historyStack.length > 1) {
    historyStack.pop(); // Remove current canvas frame state
    const targetSnapshot = historyStack[historyStack.length - 1];
    applySnapshotToCanvas(targetSnapshot);
    
    // Broadcast state adjustment to all room peers
    socket.emit('sync-undo', targetSnapshot);
  }
}

function applySnapshotToCanvas(dataURL) {
  const img = new Image();
  img.src = dataURL;
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

// --- Toolbar Interface Interactive Controls ---
colorPicker.addEventListener('input', (e) => {
  currentConfig.color = e.target.value;
  setPenMode();
});

brushSizeSlider.addEventListener('input', (e) => {
  currentConfig.size = parseInt(e.target.value);
  sizeValText.textContent = `${currentConfig.size}px`;
});

function setPenMode() {
  isEraserMode = false;
  btnPen.classList.add('active');
  btnEraser.classList.remove('active');
}

function setEraserMode() {
  isEraserMode = true;
  btnEraser.classList.add('active');
  btnPen.classList.remove('active');
}

btnPen.addEventListener('click', setPenMode);
btnEraser.addEventListener('click', setEraserMode);
btnUndo.addEventListener('click', executeUndo);

btnClear.addEventListener('click', () => {
  if (confirm("Clear the whiteboard for everyone in this room?")) {
    socket.emit('clear-board');
  }
});

btnDownload.addEventListener('click', () => {
  const imageURI = canvas.toDataURL('image/png');
  const anchor = document.createElement('a');
  anchor.href = imageURI;
  anchor.download = `whiteboard-room-${targetRoom}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
});

// Fire layout calculations on init loop
resizeCanvas();