// --- Bulletproof Socket.IO Connection Engine ---
let socketUrl = window.location.origin;

// If testing locally via double-click (file:) or VS Code Live Server (port 5500), force routing to Node backend
if (window.location.protocol === 'file:' || window.location.port === '5500') {
  socketUrl = 'http://localhost:3000';
}
const socket = io(socketUrl);

// --- DOM Element Registrations ---
const canvasContainer = document.getElementById('canvas-container');
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

// Screen controls
const btnPrevScreen = document.getElementById('btn-prev-screen');
const btnNextScreen = document.getElementById('btn-next-screen');
const btnAddScreen = document.getElementById('btn-add-screen');
const screenIndicator = document.getElementById('screen-indicator');

// --- Dynamic Canvas Application States ---
let screens = [];
let currentScreenIndex = 0;

let isEraserMode = false;

// --- Collaborative Undo History Core Memory ---
const MAX_HISTORY = 25; // Prevents browser memory bloat

function createScreen(index) {
  const newCanvas = document.createElement('canvas');
  newCanvas.classList.add('whiteboard');
  canvasContainer.appendChild(newCanvas);

  const newCtx = newCanvas.getContext('2d');

  const screenData = {
    canvas: newCanvas,
    ctx: newCtx,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    historyStack: []
  };

  // Hardware Mouse Input Hooks
  newCanvas.addEventListener('mousedown', startDrawing);
  newCanvas.addEventListener('mousemove', processDrawing);
  newCanvas.addEventListener('mouseup', stopDrawing);
  newCanvas.addEventListener('mouseout', stopDrawing);

  // Hardware Mobile Touch Input Hooks
  newCanvas.addEventListener('touchstart', startDrawing, { passive: false });
  newCanvas.addEventListener('touchmove', processDrawing, { passive: false });
  newCanvas.addEventListener('touchend', stopDrawing);

  screens[index] = screenData;
  return screenData;
}

function updateActiveScreen() {
  screens.forEach((screen, index) => {
    if (screen) {
      if (index === currentScreenIndex) {
        screen.canvas.classList.add('active');
      } else {
        screen.canvas.classList.remove('active');
      }
    }
  });

  const totalCreated = screens.length;
  screenIndicator.textContent = `Screen ${currentScreenIndex + 1} / ${totalCreated}`;
}

// Initialize the first screen
createScreen(0);
updateActiveScreen();

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
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  screens.forEach(screen => {
    if (!screen) return;
    const { canvas, ctx, historyStack } = screen;

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
      saveCanvasSnapshot(screen);
    }
  });
}
window.addEventListener('resize', resizeCanvas);

// Captures a snapshot of the whiteboard state
function saveCanvasSnapshot(screen) {
  if (screen.historyStack.length >= MAX_HISTORY) {
    screen.historyStack.shift(); // Evict oldest frame
  }
  screen.historyStack.push(screen.canvas.toDataURL());
}

// --- Fundamental Vector Drawing Module ---
function drawLine(screenIndex, x0, y0, x1, y1, color, size, emit = false) {
  if (!screens[screenIndex]) {
    for (let i = screens.length; i <= screenIndex; i++) {
      if (!screens[i]) {
        createScreen(i);
      }
    }
    updateActiveScreen();
  }
  const screen = screens[screenIndex];

  screen.ctx.beginPath();
  screen.ctx.moveTo(x0 * screen.canvas.width, y0 * screen.canvas.height);
  screen.ctx.lineTo(x1 * screen.canvas.width, y1 * screen.canvas.height);
  screen.ctx.strokeStyle = color;
  screen.ctx.lineWidth = size;
  screen.ctx.stroke();
  screen.ctx.closePath();

  if (!emit) return;

  // Broadcast relative coordinates (percentages) to ensure absolute cross-device parity
  socket.emit('drawing', { screenIndex, x0, y0, x1, y1, color, size });
}

// Translates raw pointer input coordinates into safe canvas scaling percentages
function getCoordinates(e, canvas) {
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
  const screen = screens[currentScreenIndex];
  // Capture snapshot BEFORE rendering the new stroke to allow rolling back
  saveCanvasSnapshot(screen);

  screen.isDrawing = true;
  const coords = getCoordinates(e, screen.canvas);
  screen.lastX = coords.x;
  screen.lastY = coords.y;
}

function processDrawing(e) {
  const screen = screens[currentScreenIndex];
  if (!screen.isDrawing) return;
  e.preventDefault(); // Prevents touch devices from scrolling the page while drawing

  const coords = getCoordinates(e, screen.canvas);
  const strokeColor = isEraserMode ? '#FFFFFF' : currentConfig.color;

  drawLine(currentScreenIndex, screen.lastX, screen.lastY, coords.x, coords.y, strokeColor, currentConfig.size, true);

  screen.lastX = coords.x;
  screen.lastY = coords.y;
}

function stopDrawing() {
  const screen = screens[currentScreenIndex];
  if (screen) screen.isDrawing = false;
}

// --- Inbound Network Action Receivers ---
socket.on('drawing', (data) => {
  drawLine(data.screenIndex, data.x0, data.y0, data.x1, data.y1, data.color, data.size, false);
});

socket.on('clear-board', (data) => {
  const { screenIndex } = data;
  if (!screens[screenIndex]) {
    for (let i = screens.length; i <= screenIndex; i++) {
      if (!screens[i]) {
        createScreen(i);
      }
    }
    updateActiveScreen();
  }
  const screen = screens[screenIndex];

  screen.ctx.clearRect(0, 0, screen.canvas.width, screen.canvas.height);
  screen.historyStack = [];
  saveCanvasSnapshot(screen);
});

socket.on('sync-undo', (data) => {
  applySnapshotToCanvas(data.screenIndex, data.snapshot);
});

socket.on('add-screen', () => {
  const newIndex = screens.length;
  createScreen(newIndex);
  resizeCanvas(); // Make sure new canvas gets correct sizing
  updateActiveScreen();
});

// --- Dynamic Undo Execution Systems ---
function executeUndo() {
  const screen = screens[currentScreenIndex];
  if (screen.historyStack.length > 1) {
    screen.historyStack.pop(); // Remove current canvas frame state
    const targetSnapshot = screen.historyStack[screen.historyStack.length - 1];
    applySnapshotToCanvas(currentScreenIndex, targetSnapshot);

    // Broadcast state adjustment to all room peers
    socket.emit('sync-undo', { screenIndex: currentScreenIndex, snapshot: targetSnapshot });
  }
}

function applySnapshotToCanvas(screenIndex, dataURL) {
  if (!screens[screenIndex]) {
    for (let i = screens.length; i <= screenIndex; i++) {
      if (!screens[i]) {
        createScreen(i);
      }
    }
    updateActiveScreen();
  }
  const screen = screens[screenIndex];
  const img = new Image();
  img.src = dataURL;
  img.onload = () => {
    screen.ctx.clearRect(0, 0, screen.canvas.width, screen.canvas.height);
    screen.ctx.drawImage(img, 0, 0);
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
    const screen = screens[currentScreenIndex];
    screen.ctx.clearRect(0, 0, screen.canvas.width, screen.canvas.height);
    screen.historyStack = [];
    saveCanvasSnapshot(screen);
    socket.emit('clear-board', { screenIndex: currentScreenIndex });
  }
});

btnDownload.addEventListener('click', () => {
  const screen = screens[currentScreenIndex];
  const imageURI = screen.canvas.toDataURL('image/png');
  const anchor = document.createElement('a');
  anchor.href = imageURI;
  anchor.download = `whiteboard-room-${targetRoom}-screen-${currentScreenIndex + 1}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
});

btnPrevScreen.addEventListener('click', () => {
  if (currentScreenIndex > 0) {
    currentScreenIndex--;
    updateActiveScreen();
  }
});

btnNextScreen.addEventListener('click', () => {
  if (currentScreenIndex < screens.length - 1) {
    currentScreenIndex++;
    updateActiveScreen();
  }
});

btnAddScreen.addEventListener('click', () => {
  const newIndex = screens.length;
  createScreen(newIndex);
  currentScreenIndex = newIndex;
  resizeCanvas();
  updateActiveScreen();
  socket.emit('add-screen');
});

// Fire layout calculations on init loop
resizeCanvas();
