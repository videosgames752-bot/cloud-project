const socket = io('http://192.168.1.25:3001');

let currentRoom = '';
let myName = '';

socket.on('connect', () => {
    console.log('Connected to server');
    document.getElementById('status').innerText = 'Server Connected';
});

socket.on('error', (msg) => {
    alert(msg);
    document.getElementById('status').innerText = msg;
    document.getElementById('login').classList.remove('hidden');
    document.getElementById('controls').classList.add('hidden');
});

socket.on('room-joined', () => {
    document.getElementById('login').classList.add('hidden');
    document.getElementById('controls').classList.remove('hidden');
    document.getElementById('roomDisplay').innerText = `Room: ${currentRoom}`;
});

socket.on('kicked', () => {
    alert('You were kicked by the host.');
    location.reload();
});

function joinRoom() {
    const name = document.getElementById('username').value;
    const room = document.getElementById('roomId').value;
    
    if (!name || !room) {
        alert('Please enter name and room code');
        return;
    }

    myName = name;
    currentRoom = room;
    document.getElementById('status').innerText = 'Connecting...';
    
    socket.emit('join-room', { roomId: room, userName: name });
}

function sendInput(code) {
    // Basic input simulation for vanilla client
    // In a real scenario, this would send WebRTC data channel messages
    // For this simple test, we just log it or could emit via socket if needed fallback
    console.log('Pressed:', code);
    // Note: The main React app uses WebRTC DataChannels. 
    // This vanilla client is just for connectivity testing.
}
