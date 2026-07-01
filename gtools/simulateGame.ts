import { io, Socket } from 'socket.io-client';

const URL = 'http://localhost:4000';

function createClient(name: string): Socket {
  return io(URL, { transports: ['websocket'] });
}

const host = createClient('Player 1 (Host)');
const p2 = createClient('Player 2');
const p3 = createClient('Player 3');
const p4 = createClient('Player 4');

let roomCode = '';
let connectedCount = 0;

function setupClient(socket: Socket, name: string) {
  socket.on('connect', () => {
    console.log(`${name} connected.`);
    connectedCount++;
    if (connectedCount === 4) {
      console.log('All clients connected. Host creating room...');
      host.emit('createRoom', { name: 'Player 1', ruleset: 'cuban', mode: 'team2v2', targetScore: 100 });
    }
  });

  socket.on('roomUpdate', (room) => {
    if (socket === host && room.seats.length === 1) {
      roomCode = room.code;
      console.log(`Room created: ${roomCode}. Others joining...`);
      p2.emit('joinRoom', { code: roomCode, name: 'Player 2' });
      p3.emit('joinRoom', { code: roomCode, name: 'Player 3' });
      p4.emit('joinRoom', { code: roomCode, name: 'Player 4' });
    }
    
    if (socket === host && room.seats.length === 4 && room.status === 'lobby') {
      console.log('Room full. Host starting game...');
      host.emit('startGame');
    }
  });

  socket.on('gameUpdate', (view) => {
    // Greedy approach: try to play the first valid move we can find.
    // If it's not our turn, the server will ignore it.
    let movePlayed = false;
    
    if (view.openEnds === null) {
      // First turn, play any tile (e.g. highest double)
      const tile = view.myHand.length > 0 ? view.myHand[0] : null;
      if (tile) {
        socket.emit('playTile', { tile, end: 'any' });
        movePlayed = true;
      }
    } else {
      // Try to find a matching tile
      for (const tile of view.myHand) {
        if (tile.includes(view.openEnds[0])) {
          socket.emit('playTile', { tile, end: 'left' });
          movePlayed = true;
          break;
        } else if (tile.includes(view.openEnds[1])) {
          socket.emit('playTile', { tile, end: 'right' });
          movePlayed = true;
          break;
        }
      }
    }

    if (!movePlayed) {
      // We have no valid moves, we must pass
      socket.emit('pass');
    }
  });

  socket.on('handResult', (result) => {
    console.log(`[${name}] Hand over! Result:`, result);
    // Exit
    process.exit(0);
  });
}

setupClient(host, 'Player 1');
setupClient(p2, 'Player 2');
setupClient(p3, 'Player 3');
setupClient(p4, 'Player 4');
