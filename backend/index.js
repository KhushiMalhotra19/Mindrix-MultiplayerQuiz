import express from 'express';
import cors from 'cors';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
import db from './db.js';
import { generateQuizQuestions, generateSingleQuizQuestion, generateSingleQuizQuestionApiOnly, getSingleFallbackQuestion } from './quizGenerator.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP Server for Express & Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration (allow frontend credentials / cookies)
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Express Session setup with 7 days cookie maxAge
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

app.use(session({
  name: 'quiz_session_id',
  secret: 'multiplayer_quiz_super_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: SEVEN_DAYS, // 7 Days session age
    httpOnly: true,     // Prevents client-side JS cookie manipulation for security
    secure: false,      // Set to true if using HTTPS in production
    sameSite: 'lax'
  }
}));

// --- SOCKET.IO ROOM LOBBY STATE MANAGEMENT ---
// In-memory room store: roomCode -> { code, hostSocketId, maxPlayers: 10, players: [...], gameStarted: false, timerSeconds: 300 }
const rooms = {};

// Helper: Generate unique 6-character uppercase room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 5-minute (300s) Auto-Start Interval Timer tick
setInterval(() => {
  Object.keys(rooms).forEach(code => {
    const room = rooms[code];
    // Only tick lobby countdown if game has not started and poll has not started
    if (room && !room.gameStarted && (!room.pollState || !room.pollState.started)) {
      if (room.timerSeconds > 0) {
        room.timerSeconds -= 1;
        // Broadcast timer update to room
        io.to(code).emit('timer_update', { timerSeconds: room.timerSeconds });
      }

      // If 5-minute timer reaches 0
      if (room.timerSeconds <= 0) {
        if (room.isCustomRoom) {
          // CUSTOM QUIZ MODE: Host is NOT counted as a player!
          // Requires at least 2 contestants (non-host players) and 1 host
          const contestants = room.players.filter(p => !p.isHostSpectator && !p.isHost);
          const hasHost = room.players.some(p => p.isHost || p.isHostSpectator);

          if (contestants.length >= 2 && hasHost) {
            room.gameStarted = true;
            console.log(`⏱️ 5-Minute timer expired for custom room ${code} with ${contestants.length} players. Auto-starting custom quiz!`);
            io.to(code).emit('game_auto_started', {
              message: '5-minute timer expired! Custom quiz is starting automatically...'
            });
            io.to(code).emit('room_updated', { roomState: room });
            io.to(code).emit('player_event_toast', {
              type: 'start',
              message: '5-Minute timer expired! Starting custom quiz...'
            });
            startCustomQuiz(code);
          } else {
            console.log(`⏱️ 5-Minute timer expired for custom room ${code} with only ${contestants.length} player(s). Terminating room: Minimum 2 players and 1 host required.`);
            io.to(code).emit('game_terminated', {
              message: 'Not enough players in the room (Custom quiz requires at least 2 players and 1 host).'
            });
            io.to(code).emit('player_event_toast', {
              type: 'warning',
              message: 'Not enough players in the room.'
            });

            // Kick all sockets out of room channel & delete room
            room.players.forEach(p => {
              const pSocket = io.sockets.sockets.get(p.socketId);
              if (pSocket) {
                pSocket.leave(code);
                pSocket.currentRoomCode = null;
              }
            });
            delete rooms[code];
          }
        } else if (room.players.length >= 2) {
          // MORE THAN 1 PLAYER: Auto-start the genre poll even if host hasn't clicked start game!
          room.gameStarted = true;
          console.log(`⏱️ 5-Minute timer expired for room ${code} with ${room.players.length} players. Auto-starting genre poll!`);
          io.to(code).emit('game_auto_started', {
            message: '5-minute timer expired! Game is starting automatically...'
          });
          io.to(code).emit('room_updated', { roomState: room });
          io.to(code).emit('player_event_toast', {
            type: 'start',
            message: '5-Minute timer expired! Starting genre poll...'
          });
          startPollRound(code, false);
        } else {
          // ONLY HOST IN ROOM (NO OTHER PLAYER): End room & report "No competitor in the room"
          console.log(`⏱️ 5-Minute timer expired for room ${code} with only 1 player. Terminating room: No competitor.`);
          
          io.to(code).emit('game_terminated', {
            message: 'No competitor in the room'
          });
          io.to(code).emit('player_event_toast', {
            type: 'warning',
            message: 'No competitor in the room'
          });

          // Kick host socket out of room channel & delete room
          const hostPlayer = room.players[0];
          if (hostPlayer) {
            const hostSocket = io.sockets.sockets.get(hostPlayer.socketId);
            if (hostSocket) {
              hostSocket.leave(code);
              hostSocket.currentRoomCode = null;
            }
          }
          delete rooms[code];
        }
      }
    }
  });
}, 1000);

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // 1. CREATE ROOM
  socket.on('create_room', ({ user }) => {
    // Check if user is already in an active room
    const isAlreadyInRoom = Object.values(rooms).some(r =>
      r.players.some(p => (user?.id && p.userId && String(p.userId) === String(user.id)) ||
                          (user?.playerName && p.name && p.name.toLowerCase() === user.playerName.toLowerCase()))
    );

    if (isAlreadyInRoom) {
      return socket.emit('join_error', { message: 'You are already in the game!' });
    }

    let roomCode = generateRoomCode();
    while (rooms[roomCode]) {
      roomCode = generateRoomCode();
    }

    const hostPlayer = {
      socketId: socket.id,
      userId: user?.id || socket.id,
      name: user?.playerName || user?.fullName || 'Host',
      avatar: user?.avatarUrl || '/avatars/lion.png',
      isHost: true
    };

    rooms[roomCode] = {
      code: roomCode,
      hostSocketId: socket.id,
      maxPlayers: 10,
      players: [hostPlayer],
      gameStarted: false,
      timerSeconds: 300 // 5 Minutes Auto-Start Countdown
    };

    socket.join(roomCode);
    socket.currentRoomCode = roomCode;

    console.log(`🏠 Room ${roomCode} created by ${hostPlayer.name} (${socket.id})`);

    socket.emit('room_created', {
      success: true,
      roomCode,
      roomState: rooms[roomCode]
    });
  });

  // 1.2. CREATE CUSTOM GAME ROOM (Host creates topic, questions, options, correct answer & timer; host is spectator)
  socket.on('create_custom_room', async ({ user, topic, timerSeconds, questions }) => {
    // Check if user is already in an active room
    const isAlreadyInRoom = Object.values(rooms).some(r =>
      r.players.some(p => (user?.id && p.userId && String(p.userId) === String(user.id)) ||
                          (user?.playerName && p.name && p.name.toLowerCase() === user.playerName.toLowerCase()))
    );

    if (isAlreadyInRoom) {
      return socket.emit('join_error', { message: 'You are already in an active game!' });
    }

    if (!topic || !topic.trim()) {
      return socket.emit('join_error', { message: 'Please provide a topic for the custom quiz!' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return socket.emit('join_error', { message: 'Please add at least 1 question to create the quiz!' });
    }

    // Validate and sanitize each question
    const sanitizedQuestions = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.question.trim()) {
        return socket.emit('join_error', { message: `Question ${i + 1} has empty text!` });
      }
      if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(opt => !opt || !opt.trim())) {
        return socket.emit('join_error', { message: `Question ${i + 1} must have 4 non-empty options!` });
      }
      const correctIdx = Number(q.correctAnswerIndex);
      if (isNaN(correctIdx) || correctIdx < 0 || correctIdx > 3) {
        return socket.emit('join_error', { message: `Question ${i + 1} must have a valid correct option (0-3)!` });
      }

      sanitizedQuestions.push({
        question: q.question.trim(),
        options: q.options.map(o => o.trim()),
        correctAnswerIndex: correctIdx,
        explanation: q.explanation && q.explanation.trim() 
          ? q.explanation.trim() 
          : `The correct answer is: ${q.options[correctIdx].trim()}`
      });
    }

    const timerSec = Math.max(5, Math.min(120, Number(timerSeconds) || 20));

    // Optionally save custom quiz to MySQL custom_quizzes table
    if (user?.id && typeof user.id === 'number') {
      try {
        await db.execute(
          'INSERT INTO custom_quizzes (host_id, topic, timer_seconds, questions_json) VALUES (?, ?, ?, ?)',
          [user.id, topic.trim(), timerSec, JSON.stringify(sanitizedQuestions)]
        );
      } catch (err) {
        console.error('Error saving custom quiz to DB:', err);
      }
    }

    let roomCode = generateRoomCode();
    while (rooms[roomCode]) {
      roomCode = generateRoomCode();
    }

    // Host is NOT a participant in the game!
    const hostPlayer = {
      socketId: socket.id,
      userId: user?.id || socket.id,
      name: user?.playerName || user?.fullName || 'Host',
      avatar: user?.avatarUrl || '/avatars/lion.png',
      isHost: true,
      isHostSpectator: true
    };

    rooms[roomCode] = {
      code: roomCode,
      isCustomRoom: true,
      topic: topic.trim(),
      timerSecondsPerQuestion: timerSec,
      customQuestions: sanitizedQuestions,
      hostSocketId: socket.id,
      maxPlayers: 15,
      players: [hostPlayer],
      gameStarted: false,
      timerSeconds: 300
    };

    socket.join(roomCode);
    socket.currentRoomCode = roomCode;

    console.log(`🎨 Custom Game Room ${roomCode} created by ${hostPlayer.name} with ${sanitizedQuestions.length} questions on "${topic.trim()}" (Timer: ${timerSec}s)`);

    socket.emit('room_created', {
      success: true,
      roomCode,
      roomState: rooms[roomCode]
    });
  });

  // 1.5. CREATE VS AI GAME (No Waiting Lobby, Direct Start to Genre Poll)
  socket.on('create_ai_game', ({ user, numBots, botNames }) => {
    const isAlreadyInRoom = Object.values(rooms).some(r =>
      r.players.some(p => (user?.id && p.userId && String(p.userId) === String(user.id)) ||
                          (user?.playerName && p.name && p.name.toLowerCase() === user.playerName.toLowerCase()))
    );

    if (isAlreadyInRoom) {
      return socket.emit('join_error', { message: 'You are already in the game!' });
    }

    let roomCode = generateRoomCode();
    while (rooms[roomCode]) {
      roomCode = generateRoomCode();
    }

    const hostPlayer = {
      socketId: socket.id,
      userId: user?.id || socket.id,
      name: user?.playerName || user?.fullName || 'Player',
      avatar: user?.avatarUrl || '/avatars/lion.png',
      isHost: true,
      isAiBot: false
    };

    // Personalities definition:
    // Normal: 55% accuracy (0.55), answers within 15s (7s-15s)
    // Bit Smarter: 67% accuracy (0.67), answers within 10s (4s-10s)
    // Smart: 75% accuracy (0.75), answers within 7s (2s-7s)
    const ALL_PERSONALITIES = [
      { id: 'normal', nameTitle: 'Normal', accuracy: 0.55, minDelay: 7, maxDelay: 15 },
      { id: 'medium', nameTitle: 'Bit Smarter', accuracy: 0.67, minDelay: 4, maxDelay: 10 },
      { id: 'smart', nameTitle: 'Smart', accuracy: 0.75, minDelay: 2, maxDelay: 7 }
    ];

    const botCount = Math.min(3, Math.max(1, Number(numBots) || 1));
    const botAvatars = ['/avatars/cat.svg', '/avatars/fox.svg', '/avatars/owl.svg', '/avatars/puppy.svg', '/avatars/panda.png'];

    // Pick personalities:
    // 1 bot -> 1 random personality out of 3
    // 2 bots -> 2 distinct random personalities out of 3
    // 3 bots -> all 3 personalities
    const shuffledPersonalities = [...ALL_PERSONALITIES].sort(() => 0.5 - Math.random());
    const chosenPersonalities = shuffledPersonalities.slice(0, botCount);

    const playersList = [hostPlayer];

    for (let i = 0; i < botCount; i++) {
      const personality = chosenPersonalities[i];
      const defaultNames = ['Bot Alpha', 'Bot Turbo', 'Bot Brainiac'];
      const customName = botNames && botNames[i] && botNames[i].trim() ? botNames[i].trim() : (defaultNames[i] || `AI Bot ${i + 1}`);

      playersList.push({
        socketId: `bot_${roomCode}_${i + 1}_${Date.now()}`,
        userId: `bot_${i + 1}`,
        name: customName,
        avatar: botAvatars[i % botAvatars.length],
        isHost: false,
        isAiBot: true,
        personality
      });
    }

    rooms[roomCode] = {
      code: roomCode,
      hostSocketId: socket.id,
      maxPlayers: 10,
      players: playersList,
      gameStarted: true, // Direct start, NO lobby waiting
      isAiGame: true,
      timerSeconds: 300
    };

    socket.join(roomCode);
    socket.currentRoomCode = roomCode;

    console.log(`🤖 AI Game Room ${roomCode} created by ${hostPlayer.name} with ${botCount} AI Bots!`);

    socket.emit('room_created', {
      success: true,
      roomCode,
      roomState: rooms[roomCode]
    });

    // Directly start Genre Poll (No waiting lobby!)
    setTimeout(() => {
      startPollRound(roomCode, false);
    }, 500);
  });

  // 2. JOIN ROOM
  socket.on('join_room', ({ roomCode, user }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];

    if (!room) {
      return socket.emit('join_error', { message: 'Room code not found. Please check the code and try again.' });
    }

    // Check if user is already in ANY room on the server (duplicate window / browser prevention)
    const isAlreadyInRoom = Object.values(rooms).some(r =>
      r.players.some(p => (user?.id && p.userId && String(p.userId) === String(user.id)) ||
                          (user?.playerName && p.name && p.name.toLowerCase() === user.playerName.toLowerCase()))
    );

    if (isAlreadyInRoom) {
      return socket.emit('join_error', { message: 'You are already in the game!' });
    }

    if (room.players.length >= room.maxPlayers) {
      return socket.emit('join_error', { message: 'Room is full! Maximum limit is 10 players.' });
    }

    if (room.gameStarted || (room.pollState && room.pollState.started)) {
      return socket.emit('join_error', { message: 'Game has already started! Cannot join active room.' });
    }

    const newPlayer = {
      socketId: socket.id,
      userId: user?.id || socket.id,
      name: user?.playerName || user?.fullName || `Player ${room.players.length + 1}`,
      avatar: user?.avatarUrl || '/avatars/panda.png',
      isHost: false
    };

    room.players.push(newPlayer);
    socket.join(code);
    socket.currentRoomCode = code;

    console.log(`👤 ${newPlayer.name} joined room ${code}`);

    // Emit success to joiner
    socket.emit('room_joined', {
      success: true,
      roomCode: code,
      roomState: room
    });

    // Broadcast updated room state to everyone in room
    io.to(code).emit('room_updated', { roomState: room });

    // Broadcast join toast notification
    io.to(code).emit('player_event_toast', {
      type: 'join',
      message: `${newPlayer.name} joined!`
    });
  });

  // 3. KICK PLAYER (Host action)
  socket.on('kick_player', ({ roomCode, targetSocketId }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const requestingPlayer = room.players.find(p => p.socketId === socket.id);
    const isHost = room.hostSocketId === socket.id || requestingPlayer?.isHost || (room.players.length > 0 && room.players[0].socketId === socket.id);

    if (!isHost) {
      return socket.emit('error_message', 'Only the host can kick players!');
    }

    if (room.gameStarted) {
      return socket.emit('error_message', 'Cannot kick players after game has started.');
    }

    const playerIndex = room.players.findIndex(p => p.socketId === targetSocketId);
    if (playerIndex !== -1) {
      const kickedPlayer = room.players[playerIndex];
      room.players.splice(playerIndex, 1);

      console.log(`🚫 Player ${kickedPlayer.name} was kicked from room ${roomCode}`);

      // Notify target socket that they were removed by host
      io.to(targetSocketId).emit('kicked_from_room', {
        message: 'You were removed by the host'
      });

      // Target socket leaves room channel
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.leave(roomCode);
        targetSocket.currentRoomCode = null;
      }

      // Broadcast updated room state to remaining room members
      io.to(roomCode).emit('room_updated', { roomState: room });

      // Broadcast kick toast notification
      io.to(roomCode).emit('player_event_toast', {
        type: 'kick',
        message: `${kickedPlayer.name} was removed by host.`
      });
    }
  });

  // 3.5. SEND CHAT MESSAGE IN ROOM LOBBY
  socket.on('send_chat_message', ({ roomCode, message }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room) return;

    if (room.gameStarted) {
      return socket.emit('join_error', { message: 'Chat is disabled after game starts.' });
    }

    const trimmedMsg = (message || '').trim();
    if (!trimmedMsg) return;

    const senderPlayer = room.players.find(p => p.socketId === socket.id);
    const senderName = senderPlayer?.name || 'Player';

    const chatPayload = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderSocketId: socket.id,
      senderName,
      isHost: senderPlayer?.isHost || false,
      text: trimmedMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    io.to(code).emit('new_chat_message', chatPayload);
  });

  // --- GENRE POLL STATE MANAGEMENT & TIE-BREAKER LOGIC ---
  const pollIntervals = {};

  function startPollRound(roomCode, isTieBreaker = false, tiedGenres = []) {
    const room = rooms[roomCode];
    if (!room) return;

    if (pollIntervals[roomCode]) {
      clearInterval(pollIntervals[roomCode]);
      delete pollIntervals[roomCode];
    }

    const ALL_GENRES = ['Sports', 'History', 'Entertainment', 'Science', 'Mathematics', 'Riddles'];
    const availableGenres = isTieBreaker ? tiedGenres : ALL_GENRES;

    const initialVotes = {};
    availableGenres.forEach(g => { initialVotes[g] = 0; });

    room.pollState = {
      started: true,
      ended: false,
      isTieBreaker,
      round: isTieBreaker ? 2 : 1,
      pollTimer: 15,
      availableGenres,
      votes: initialVotes,
      playerVotes: {},
      winningGenre: null,
      message: isTieBreaker ? `TIE DETECTED! Re-voting between: ${tiedGenres.join(', ')}` : null
    };

    console.log(`📊 Genre poll (Round ${room.pollState.round}) started for room ${roomCode}`);
    io.to(roomCode).emit('room_updated', { roomState: room });
    io.to(roomCode).emit('genre_poll_started', { pollState: room.pollState });

    // Auto vote for AI Bots in room if present
    const aiBots = room.players.filter(p => p.isAiBot);
    if (aiBots.length > 0) {
      aiBots.forEach((bot, botIdx) => {
        const voteDelay = 800 + Math.floor(Math.random() * 1200) + (botIdx * 500);
        setTimeout(() => {
          if (rooms[roomCode] && rooms[roomCode].pollState && !rooms[roomCode].pollState.ended) {
            if (!rooms[roomCode].pollState.playerVotes[bot.socketId]) {
              const available = rooms[roomCode].pollState.availableGenres;
              const randomGenre = available[Math.floor(Math.random() * available.length)];
              rooms[roomCode].pollState.playerVotes[bot.socketId] = randomGenre;
              rooms[roomCode].pollState.votes[randomGenre] = (rooms[roomCode].pollState.votes[randomGenre] || 0) + 1;
              console.log(`🤖 AI Bot ${bot.name} voted for ${randomGenre} in room ${roomCode}`);

              const votedCount = Object.keys(rooms[roomCode].pollState.playerVotes).length;
              if (votedCount >= rooms[roomCode].players.length) {
                finishPollRound(roomCode);
              } else {
                io.to(roomCode).emit('poll_vote_update', {
                  votes: rooms[roomCode].pollState.votes,
                  playerVotesCount: votedCount,
                  totalPlayers: rooms[roomCode].players.length
                });
                io.to(roomCode).emit('room_updated', { roomState: rooms[roomCode] });
              }
            }
          }
        }, voteDelay);
      });
    }

    pollIntervals[roomCode] = setInterval(() => {
      if (!rooms[roomCode] || !rooms[roomCode].pollState) {
        if (pollIntervals[roomCode]) {
          clearInterval(pollIntervals[roomCode]);
          delete pollIntervals[roomCode];
        }
        return;
      }

      rooms[roomCode].pollState.pollTimer -= 1;
      io.to(roomCode).emit('poll_timer_tick', { pollTimer: rooms[roomCode].pollState.pollTimer });

      if (rooms[roomCode].pollState.pollTimer <= 0) {
        finishPollRound(roomCode);
      }
    }, 1000);
  }

  function finishPollRound(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.pollState || room.pollState.ended) return;

    if (pollIntervals[roomCode]) {
      clearInterval(pollIntervals[roomCode]);
      delete pollIntervals[roomCode];
    }

    const votes = room.pollState.votes;
    const availableGenres = room.pollState.availableGenres;

    let maxVotes = -1;
    let winners = [];

    availableGenres.forEach(g => {
      const v = votes[g] || 0;
      if (v > maxVotes) {
        maxVotes = v;
        winners = [g];
      } else if (v === maxVotes) {
        winners.push(g);
      }
    });

    // Single Winner
    if (winners.length === 1 || maxVotes === 0) {
      const winningGenre = maxVotes === 0 ? availableGenres[Math.floor(Math.random() * availableGenres.length)] : winners[0];
      room.pollState.ended = true;
      room.pollState.winningGenre = winningGenre;
      room.selectedGenre = winningGenre;

      console.log(`🏆 Genre poll ended for room ${roomCode}. Winner: ${winningGenre}`);
      io.to(roomCode).emit('genre_poll_ended', {
        votes: room.pollState.votes,
        winningGenre
      });
      io.to(roomCode).emit('room_updated', { roomState: room });

      // Automatically transition to Quiz Playground in 4 seconds!
      setTimeout(() => {
        if (rooms[roomCode] && (!rooms[roomCode].quizState || !rooms[roomCode].quizState.active)) {
          startMainQuiz(roomCode);
        }
      }, 4000);
      return;
    }

    // Tie detected!
    if (room.pollState.round === 1) {
      // Round 1 Tie -> Start Tie-Breaker Poll ONLY between tied genres!
      console.log(`⚖️ Round 1 Tie in room ${roomCode} between: ${winners.join(', ')}. Starting tie-breaker!`);
      startPollRound(roomCode, true, winners);
    } else {
      // Round 2 Tie -> Pick randomly between the tied genres!
      const randomWinner = winners[Math.floor(Math.random() * winners.length)];
      room.pollState.ended = true;
      room.pollState.winningGenre = randomWinner;
      room.selectedGenre = randomWinner;

      console.log(`🎲 Round 2 Tie resolved randomly in room ${roomCode}. Winner: ${randomWinner}`);
      io.to(roomCode).emit('genre_poll_ended', {
        votes: room.pollState.votes,
        winningGenre: randomWinner,
        isRandomTieBreaker: true
      });
      io.to(roomCode).emit('room_updated', { roomState: room });

      // Automatically transition to Quiz Playground in 4 seconds!
      setTimeout(() => {
        if (rooms[roomCode] && (!rooms[roomCode].quizState || !rooms[roomCode].quizState.active)) {
          startMainQuiz(roomCode);
        }
      }, 4000);
    }
  }

  // --- MULTIPLAYER QUIZ ENGINE (3 ROUNDS: EASY, MEDIUM, HARD, 5 Qs EACH) ---
  const questionTimers = {};

  function calculateQuestionScore(isCorrect, timeTakenSec) {
    if (!isCorrect) return { points: 0, speedBonus: 0, basePoints: 0 };
    
    const sec = Math.max(0, Math.min(20, Math.floor(timeTakenSec)));
    let speedBonus = 0;

    if (sec <= 4) {
      speedBonus = 5;
    } else if (sec >= 5 && sec <= 8) {
      speedBonus = 4;
    } else if (sec >= 9 && sec <= 12) {
      speedBonus = 3;
    } else if (sec >= 13 && sec <= 15) {
      speedBonus = 2;
    } else if (sec >= 16 && sec <= 18) {
      speedBonus = 1;
    } else { // 19-20 sec
      speedBonus = 0;
    }

    const basePoints = 5;
    const totalPoints = basePoints + speedBonus;
    return { points: totalPoints, speedBonus, basePoints };
  }

  function getActivePlayers(room) {
    if (!room || !room.players) return [];
    const eliminated = room.quizState?.eliminatedSockets || [];
    const scores = room.quizState?.scores || {};
    return room.players
      .filter(p => !eliminated.includes(p.socketId) && (!room.isCustomRoom || (!p.isHostSpectator && !p.isHost)))
      .map(p => ({
        ...p,
        score: scores[p.socketId] || 0
      }));
  }

  function getSortedLeaderboard(room) {
    if (!room || !room.players || !room.quizState) return [];
    const scores = room.quizState.scores || {};
    const eliminated = room.quizState.eliminatedSockets || [];
    const eliminatedRounds = room.quizState.eliminatedRounds || {};

    const eligiblePlayers = room.isCustomRoom
      ? room.players.filter(p => !p.isHostSpectator && !p.isHost)
      : room.players;

    return eligiblePlayers.map(p => {
      const isElim = eliminated.includes(p.socketId);
      return {
        socketId: p.socketId,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        score: scores[p.socketId] || 0,
        isEliminated: isElim,
        eliminatedRound: eliminatedRounds[p.socketId] || null
      };
    }).sort((a, b) => {
      // 1. Active players rank above eliminated players
      if (a.isEliminated !== b.isEliminated) {
        return a.isEliminated ? 1 : -1;
      }
      // 2. If both eliminated, player who survived more rounds ranks higher
      if (a.isEliminated && b.isEliminated) {
        const aRound = a.eliminatedRound || (eliminated.indexOf(a.socketId) + 1);
        const bRound = b.eliminatedRound || (eliminated.indexOf(b.socketId) + 1);
        if (bRound !== aRound) {
          return bRound - aRound;
        }
      }
      // 3. Sort by score descending
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  function startMainQuiz(roomCode) {
    const room = rooms[roomCode];
    if (!room) return;

    room.gameStarted = true;
    const initialScores = {};
    room.players.forEach(p => { initialScores[p.socketId] = 0; });

    room.quizState = {
      active: true,
      currentRound: 1, // 1: Easy, 2: Medium, 3: Hard
      roundName: 'Easy',
      currentQuestionIndex: 0,
      questions: [null, null, null, null, null],
      questionSources: [null, null, null, null, null],
      scores: initialScores,
      eliminatedSockets: [],
      eliminatedRounds: {},
      answersSubmitted: {},
      phase: 'loading'
    };

    io.to(roomCode).emit('room_updated', { roomState: room });
    startQuizRound(roomCode, 1);
  }

  async function startQuizRound(roomCode, roundNumber) {
    const room = rooms[roomCode];
    if (!room || !room.quizState) return;

    const roundNameMap = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
    const roundName = roundNameMap[roundNumber] || 'Easy';
    const roundId = Date.now() + Math.random();

    room.quizState.currentRound = roundNumber;
    room.quizState.roundName = roundName;
    room.quizState.currentQuestionIndex = 0;
    room.quizState.questions = [null, null, null, null, null];
    room.quizState.questionSources = [null, null, null, null, null];
    room.quizState.roundId = roundId;
    room.quizState.phase = 'loading';

    console.log(`🎯 Round ${roundNumber} (${roundName}) started for Room ${roomCode} | Genre: ${room.selectedGenre}`);
    
    io.to(roomCode).emit('quiz_round_loading', {
      roundNumber,
      roundName,
      genre: room.selectedGenre,
      message: `Level ${roundNumber} Loading...`,
      leaderboard: getSortedLeaderboard(room),
      eliminatedSockets: room.quizState?.eliminatedSockets || []
    });
    io.to(roomCode).emit('room_updated', { roomState: room });

    // 1. Generate Question 1 (API first, fallback only if API fails/times out)
    try {
      const q1 = await generateSingleQuizQuestionApiOnly(room.selectedGenre, roundName, 1, []);
      if (rooms[roomCode] && rooms[roomCode].quizState && rooms[roomCode].quizState.roundId === roundId) {
        if (q1) {
          rooms[roomCode].quizState.questions[0] = q1;
          rooms[roomCode].quizState.questionSources[0] = 'api';
        } else {
          rooms[roomCode].quizState.questions[0] = getSingleFallbackQuestion(room.selectedGenre, roundName, 0, []);
          rooms[roomCode].quizState.questionSources[0] = 'fallback';
        }
      }
    } catch (err) {
      console.error('Error generating Q1:', err);
      if (rooms[roomCode] && rooms[roomCode].quizState && rooms[roomCode].quizState.roundId === roundId) {
        rooms[roomCode].quizState.questions[0] = getSingleFallbackQuestion(room.selectedGenre, roundName, 0, []);
        rooms[roomCode].quizState.questionSources[0] = 'fallback';
      }
    }

    // 2. Immediately display Question 1!
    if (rooms[roomCode] && rooms[roomCode].quizState && rooms[roomCode].quizState.roundId === roundId) {
      sendQuestionToRoom(roomCode, 0);

      // 3. Immediately after Q1 is displayed, trigger background generation pipeline for Q2, Q3, Q4, Q5!
      runBackgroundGenerationPipeline(roomCode, roundId);
    }
  }

  // Progressive Background Async Question Generation Pipeline
  async function runBackgroundGenerationPipeline(roomCode, roundId) {
    const room = rooms[roomCode];
    if (!room || !room.quizState || room.quizState.roundId !== roundId) return;

    for (let targetIndex = 1; targetIndex < 5; targetIndex++) {
      const currentRoom = rooms[roomCode];
      if (!currentRoom || !currentRoom.quizState || currentRoom.quizState.roundId !== roundId) {
        console.log(`⏹️ Background question pipeline stopped for Room ${roomCode} (round changed).`);
        return;
      }

      // Skip if this slot already has a successfully generated API question
      if (currentRoom.quizState.questionSources[targetIndex] === 'api') {
        continue;
      }

      const genre = currentRoom.selectedGenre;
      const diff = currentRoom.quizState.roundName;
      const existingTexts = currentRoom.quizState.questions.filter(Boolean).map(q => q.question);

      console.log(`⏳ Pipeline generating Question ${targetIndex + 1}/5 (${diff.toUpperCase()}) for Room ${roomCode}...`);

      try {
        const apiQ = await generateSingleQuizQuestionApiOnly(genre, diff, targetIndex + 1, existingTexts);

        // Re-verify room & round validity after async API call
        const roomAfterFetch = rooms[roomCode];
        if (!roomAfterFetch || !roomAfterFetch.quizState || roomAfterFetch.quizState.roundId !== roundId) {
          return;
        }

        if (apiQ) {
          const activeIndex = roomAfterFetch.quizState.currentQuestionIndex;

          // If targetIndex is currently displayed or was already displayed as fallback
          if (targetIndex <= activeIndex) {
            // Place API question in next available un-displayed slot
            let nextSlot = -1;
            for (let s = activeIndex + 1; s < 5; s++) {
              if (roomAfterFetch.quizState.questionSources[s] !== 'api') {
                nextSlot = s;
                break;
              }
            }

            if (nextSlot !== -1) {
              roomAfterFetch.quizState.questions[nextSlot] = apiQ;
              roomAfterFetch.quizState.questionSources[nextSlot] = 'api';
              console.log(`⚡ Delayed API Question placed into next slot Q${nextSlot + 1} for Room ${roomCode}`);
            }
          } else {
            // Target slot is in the future. Store API question directly!
            roomAfterFetch.quizState.questions[targetIndex] = apiQ;
            roomAfterFetch.quizState.questionSources[targetIndex] = 'api';
            console.log(`✅ Pre-generated API Question Q${targetIndex + 1} ready in buffer for Room ${roomCode}`);
          }
        } else {
          console.warn(`⚠️ Background API generation failed for Q${targetIndex + 1} in Room ${roomCode}. Continuing pipeline...`);
        }
      } catch (err) {
        console.error(`❌ Background pipeline error for Q${targetIndex + 1}:`, err.message);
      }
    }
  }

  async function sendQuestionToRoom(roomCode, questionIndex) {
    const room = rooms[roomCode];
    if (!room || !room.quizState || !room.quizState.questions) return;

    if (questionTimers[roomCode]) {
      clearInterval(questionTimers[roomCode]);
      delete questionTimers[roomCode];
    }

    // Safety fallback only if required question is unavailable when display time arrives
    if (!room.quizState.questions[questionIndex]) {
      const existingQs = room.quizState.questions.filter(Boolean);
      const existingTexts = existingQs.map(q => q?.question).filter(Boolean);
      room.quizState.questions[questionIndex] = getSingleFallbackQuestion(
        room.selectedGenre,
        room.quizState.roundName,
        questionIndex,
        existingTexts
      );
      room.quizState.questionSources[questionIndex] = 'fallback';
      console.log(`⚠️ Q${questionIndex + 1} not ready from API when turn arrived. Displaying safety fallback Q${questionIndex + 1} for Room ${roomCode}`);
    }

    const question = room.quizState.questions[questionIndex];
    if (!question) return;

    room.quizState.currentQuestionIndex = questionIndex;
    room.quizState.phase = 'question';
    room.quizState.answersSubmitted = {};
    room.quizState.questionTimer = 20; // 20 Seconds Timer per question
    room.quizState.questionStartTime = Date.now();

    const sourceType = (room.quizState.questionSources[questionIndex] || 'fallback').toUpperCase();
    console.log(`❓ Question ${questionIndex + 1}/5 (Round ${room.quizState.currentRound}) [${sourceType}] sent to Room ${roomCode}`);

    io.to(roomCode).emit('quiz_question_start', {
      roundNumber: room.quizState.currentRound,
      roundName: room.quizState.roundName,
      questionNumber: questionIndex + 1,
      totalQuestions: 5,
      questionText: question.question,
      options: question.options,
      timeLimit: 20, // 20 Seconds
      genre: room.selectedGenre,
      leaderboard: getSortedLeaderboard(room),
      eliminatedSockets: room.quizState?.eliminatedSockets || []
    });

    // Simulate AI bot answers if any AI bots in room based on personality accuracy & timing
    const aiBots = getActivePlayers(room).filter(p => p.isAiBot);
    if (aiBots.length > 0) {
      aiBots.forEach(bot => {
        const botAccuracy = bot.personality?.accuracy ?? 0.65;
        const minDelaySec = bot.personality?.minDelay ?? 3;
        const maxDelaySec = bot.personality?.maxDelay ?? 10;

        // Generate answer delay within personality bounds
        const delayMs = Math.floor(Math.random() * ((maxDelaySec - minDelaySec) * 1000 + 1)) + (minDelaySec * 1000);

        setTimeout(() => {
          if (rooms[roomCode] && rooms[roomCode].quizState && rooms[roomCode].quizState.phase === 'question' && rooms[roomCode].quizState.currentQuestionIndex === questionIndex) {
            if (!rooms[roomCode].quizState.answersSubmitted[bot.socketId]) {
              const currentQ = rooms[roomCode].quizState.questions[questionIndex];
              if (currentQ) {
                // Server generates a random number from 0 to 1
                // If rand <= accuracy, choose right answer; else choose randomly from wrong options
                const rand = Math.random();
                const isCorrect = rand <= botAccuracy;
                let answerIndex;
                if (isCorrect) {
                  answerIndex = currentQ.correctAnswerIndex;
                } else {
                  const wrongOpts = [0, 1, 2, 3].filter(idx => idx !== currentQ.correctAnswerIndex);
                  answerIndex = wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
                }
                const timeTakenSec = delayMs / 1000;
                const scoreResult = calculateQuestionScore(isCorrect, timeTakenSec);
                rooms[roomCode].quizState.scores[bot.socketId] = (rooms[roomCode].quizState.scores[bot.socketId] || 0) + scoreResult.points;
                rooms[roomCode].quizState.answersSubmitted[bot.socketId] = {
                  answerIndex,
                  isCorrect,
                  pointsEarned: scoreResult.points,
                  speedBonus: scoreResult.speedBonus,
                  timeTakenSec
                };
                console.log(`🤖 AI Bot ${bot.name} (${bot.personality?.nameTitle || 'Bot'}, accuracy ${(botAccuracy * 100).toFixed(0)}%) answered Q${questionIndex + 1}: ${isCorrect ? 'CORRECT' : 'WRONG'} in ${timeTakenSec.toFixed(1)}s (rand: ${rand.toFixed(2)})`);

                const activePlayers = getActivePlayers(rooms[roomCode]);
                const answeredCount = Object.keys(rooms[roomCode].quizState.answersSubmitted).length;

                io.to(roomCode).emit('player_answered_notice', {
                  socketId: bot.socketId,
                  answeredCount,
                  totalActivePlayers: activePlayers.length
                });

                if (answeredCount >= activePlayers.length) {
                  revealQuestionAnswer(roomCode);
                }
              }
            }
          }
        }, delayMs);
      });
    }

    questionTimers[roomCode] = setInterval(() => {
      if (!rooms[roomCode] || !rooms[roomCode].quizState || rooms[roomCode].quizState.phase !== 'question') {
        if (questionTimers[roomCode]) {
          clearInterval(questionTimers[roomCode]);
          delete questionTimers[roomCode];
        }
        return;
      }

      rooms[roomCode].quizState.questionTimer -= 1;
      const timer = rooms[roomCode].quizState.questionTimer;

      io.to(roomCode).emit('quiz_timer_tick', { questionTimer: timer });

      if (timer <= 0) {
        revealQuestionAnswer(roomCode);
      }
    }, 1000);
  }

  function revealQuestionAnswer(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.quizState || room.quizState.phase !== 'question') return;

    if (questionTimers[roomCode]) {
      clearInterval(questionTimers[roomCode]);
      delete questionTimers[roomCode];
    }

    room.quizState.phase = 'reveal';
    const currentQ = room.quizState.questions[room.quizState.currentQuestionIndex];
    const leaderboard = getSortedLeaderboard(room);

    io.to(roomCode).emit('quiz_question_reveal', {
      correctAnswerIndex: currentQ.correctAnswerIndex,
      explanation: currentQ.explanation,
      answersSubmitted: room.quizState.answersSubmitted,
      leaderboard,
      eliminatedSockets: room.quizState?.eliminatedSockets || []
    });

    setTimeout(() => {
      if (!rooms[roomCode] || !rooms[roomCode].quizState) return;

      const nextQIndex = rooms[roomCode].quizState.currentQuestionIndex + 1;
      if (nextQIndex < 5) {
        sendQuestionToRoom(roomCode, nextQIndex);
      } else {
        finishQuizRound(roomCode);
      }
    }, 3500);
  }

  async function finishQuizRound(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.quizState) return;

    room.quizState.phase = 'round_end';
    const activePlayers = getActivePlayers(room);
    const currentRound = room.quizState.currentRound;

    if (currentRound < 3) {
      let eliminatedPlayer = null;
      // In VS AI mode or multiplayer mode, eliminate lowest scorer if activePlayers > 1
      if (activePlayers.length > 1) {
        const sortedActive = [...activePlayers].sort((a, b) => {
          if (a.score !== b.score) {
            return a.score - b.score; // Ascending by score (lowest score first)
          }
          // Tie-breaker: If scores are equal, prefer eliminating AI bot over human player
          if (a.isAiBot && !b.isAiBot) return -1;
          if (!a.isAiBot && b.isAiBot) return 1;
          return 0;
        });
        eliminatedPlayer = sortedActive[0];
        room.quizState.eliminatedSockets.push(eliminatedPlayer.socketId);
        if (!room.quizState.eliminatedRounds) room.quizState.eliminatedRounds = {};
        room.quizState.eliminatedRounds[eliminatedPlayer.socketId] = currentRound;
        console.log(`❌ Round ${currentRound} Elimination in ${roomCode}: ${eliminatedPlayer.name} (${eliminatedPlayer.score} pts)`);
      }

      // CRITICAL: Calculate sorted leaderboard AFTER registering the eliminated player!
      const leaderboard = getSortedLeaderboard(room);
      const isHumanEliminated = room.isAiGame && eliminatedPlayer && eliminatedPlayer.socketId === room.hostSocketId;
      const survivingPlayers = getActivePlayers(room);

      io.to(roomCode).emit('quiz_round_end', {
        roundNumber: currentRound,
        roundName: room.quizState.roundName,
        eliminatedPlayer,
        survivingPlayers,
        leaderboard,
        eliminatedSockets: room.quizState.eliminatedSockets || [],
        nextRoundNumber: currentRound + 1,
        isHumanEliminated,
        isAiGame: !!room.isAiGame
      });
      io.to(roomCode).emit('room_updated', { roomState: room });

      // If human player is eliminated in VS AI game or only 1 player remains, end the game!
      if (isHumanEliminated || (room.isAiGame && survivingPlayers.length <= 1)) {
        setTimeout(() => {
          if (rooms[roomCode] && rooms[roomCode].quizState) {
            finishFinalQuizGame(roomCode);
          }
        }, 3500);
      } else {
        setTimeout(() => {
          if (rooms[roomCode] && rooms[roomCode].quizState) {
            startQuizRound(roomCode, currentRound + 1);
          }
        }, 5000);
      }
    } else {
      finishFinalQuizGame(roomCode);
    }
  }

  async function finishFinalQuizGame(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.quizState) return;

    if (questionTimers[roomCode]) {
      clearInterval(questionTimers[roomCode]);
      delete questionTimers[roomCode];
    }

    room.quizState.phase = 'game_over';
    const finalStandings = getSortedLeaderboard(room);

    console.log(`🏆 GAME OVER for Room ${roomCode}! Final Standings:`, finalStandings);

    const enrichedStandings = finalStandings.map((p, idx) => {
      let medal = null;
      let xpEarned = 0;
      let isWin = idx === 0;

      // Only award medals & XP if NOT an AI match!
      if (!room.isAiGame) {
        if (idx === 0) {
          medal = 'gold';
          xpEarned = 300;
        } else if (idx === 1) {
          medal = 'silver';
          xpEarned = 200;
        } else if (idx === 2) {
          medal = 'bronze';
          xpEarned = 100;
        }
      }

      return {
        ...p,
        rank: idx + 1,
        medal,
        xpEarned,
        isWin
      };
    });

    if (!room.isAiGame) {
      for (const playerStats of enrichedStandings) {
        const roomPlayer = room.players.find(p => p.socketId === playerStats.socketId);
        if (roomPlayer && !roomPlayer.isAiBot && roomPlayer.userId && typeof roomPlayer.userId === 'number') {
          try {
            const goldAdd = playerStats.medal === 'gold' ? 1 : 0;
            const silverAdd = playerStats.medal === 'silver' ? 1 : 0;
            const bronzeAdd = playerStats.medal === 'bronze' ? 1 : 0;
            const winAdd = playerStats.isWin ? 1 : 0;
            const lossAdd = playerStats.isWin ? 0 : 1;

            await db.execute(
              `UPDATE users SET 
                xp = xp + ?, 
                gold_medals = gold_medals + ?, 
                silver_medals = silver_medals + ?, 
                bronze_medals = bronze_medals + ?, 
                wins = wins + ?, 
                losses = losses + ? 
              WHERE id = ?`,
              [playerStats.xpEarned, goldAdd, silverAdd, bronzeAdd, winAdd, lossAdd, roomPlayer.userId]
            );
            console.log(`💾 Saved stats for User ID ${roomPlayer.userId}: +${playerStats.xpEarned} XP, Medal: ${playerStats.medal || 'none'}`);
          } catch (err) {
            console.error(`Error saving DB stats for User ${roomPlayer.userId}:`, err);
          }
        }
      }
    } else {
      console.log(`🤖 VS AI Match completed for Room ${roomCode}. No XPs, medals, or DB stats updated.`);
    }

    io.to(roomCode).emit('quiz_game_over', {
      genre: room.selectedGenre,
      standings: enrichedStandings,
      isAiGame: !!room.isAiGame
    });
  }

  // --- CUSTOM GAME ROOM QUIZ ENGINE (HOST CREATED TOPIC, QUESTIONS & TIMER; HOST SPECTATOR; TOP 3 MEDALS ONLY, NO XP) ---
  function startCustomQuiz(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.isCustomRoom) return;

    // Custom quiz mode: Host is NOT counted as a player! Requires at least 2 players and 1 host
    const contestants = room.players.filter(p => !p.isHostSpectator && !p.isHost);
    const hasHost = room.players.some(p => p.isHost || p.isHostSpectator);
    if (contestants.length < 2 || !hasHost) {
      console.log(`⚠️ Cannot start custom quiz in room ${roomCode}: requires at least 2 players and 1 host (found ${contestants.length} players, hasHost: ${hasHost})`);
      return;
    }

    room.gameStarted = true;
    const initialScores = {};
    contestants.forEach(p => { initialScores[p.socketId] = 0; });

    room.quizState = {
      active: true,
      isCustom: true,
      currentRound: 1,
      roundName: room.topic,
      currentQuestionIndex: 0,
      totalQuestions: room.customQuestions.length,
      questions: room.customQuestions,
      scores: initialScores,
      eliminatedSockets: [],
      answersSubmitted: {},
      phase: 'loading'
    };

    io.to(roomCode).emit('room_updated', { roomState: room });
    io.to(roomCode).emit('quiz_round_loading', {
      roundNumber: 1,
      roundName: 'Custom Quiz',
      genre: room.topic,
      message: `Topic: ${room.topic} (${room.customQuestions.length} Questions)`,
      leaderboard: getSortedLeaderboard(room),
      eliminatedSockets: []
    });

    console.log(`🎯 Custom Quiz started for Room ${roomCode} | Topic: "${room.topic}" | Questions: ${room.customQuestions.length} | Timer: ${room.timerSecondsPerQuestion}s`);

    setTimeout(() => {
      if (rooms[roomCode] && rooms[roomCode].quizState) {
        sendCustomQuestionToRoom(roomCode, 0);
      }
    }, 2500);
  }

  function broadcastCustomHostLiveUpdate(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.quizState || !room.isCustomRoom) return;

    const contestants = room.players.filter(p => !p.isHostSpectator);
    const liveRankings = contestants.map(p => {
      const ans = room.quizState.answersSubmitted[p.socketId];
      return {
        socketId: p.socketId,
        name: p.name,
        avatar: p.avatar,
        score: room.quizState.scores[p.socketId] || 0,
        hasAnswered: !!ans,
        isCorrect: ans ? ans.isCorrect : null,
        answerIndex: ans ? ans.answerIndex : null,
        pointsEarned: ans ? ans.pointsEarned : 0,
        timeTakenSec: ans ? ans.timeTakenSec : null
      };
    }).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.hasAnswered && b.hasAnswered) {
        return (a.timeTakenSec || 999) - (b.timeTakenSec || 999);
      }
      if (a.hasAnswered) return -1;
      if (b.hasAnswered) return 1;
      return 0;
    });

    const currentQ = room.customQuestions[room.quizState.currentQuestionIndex];

    io.to(roomCode).emit('host_live_ranking_update', {
      questionIndex: room.quizState.currentQuestionIndex,
      questionNumber: room.quizState.currentQuestionIndex + 1,
      totalQuestions: room.customQuestions.length,
      questionText: currentQ?.question || '',
      options: currentQ?.options || [],
      correctAnswerIndex: currentQ?.correctAnswerIndex ?? 0,
      explanation: currentQ?.explanation || '',
      timeLimit: room.timerSecondsPerQuestion,
      timeRemaining: room.quizState.questionTimer,
      answeredCount: Object.keys(room.quizState.answersSubmitted).length,
      totalContestants: contestants.length,
      phase: room.quizState.phase,
      genre: room.topic,
      liveRankings
    });
  }

  function sendCustomQuestionToRoom(roomCode, questionIndex) {
    const room = rooms[roomCode];
    if (!room || !room.quizState || !room.customQuestions) return;

    if (questionTimers[roomCode]) {
      clearInterval(questionTimers[roomCode]);
      delete questionTimers[roomCode];
    }

    const currentQ = room.customQuestions[questionIndex];
    if (!currentQ) return;

    room.quizState.currentQuestionIndex = questionIndex;
    room.quizState.phase = 'question';
    room.quizState.answersSubmitted = {};
    room.quizState.questionTimer = room.timerSecondsPerQuestion;
    room.quizState.questionStartTime = Date.now();

    console.log(`❓ Custom Question ${questionIndex + 1}/${room.customQuestions.length} sent to Room ${roomCode}`);

    io.to(roomCode).emit('quiz_question_start', {
      roundNumber: 1,
      roundName: 'Custom Quiz',
      questionNumber: questionIndex + 1,
      totalQuestions: room.customQuestions.length,
      questionText: currentQ.question,
      options: currentQ.options,
      timeLimit: room.timerSecondsPerQuestion,
      genre: room.topic,
      isCustom: true,
      correctAnswerIndex: currentQ.correctAnswerIndex,
      leaderboard: getSortedLeaderboard(room),
      eliminatedSockets: []
    });

    broadcastCustomHostLiveUpdate(roomCode);

    questionTimers[roomCode] = setInterval(() => {
      if (!rooms[roomCode] || !rooms[roomCode].quizState || rooms[roomCode].quizState.phase !== 'question') {
        if (questionTimers[roomCode]) {
          clearInterval(questionTimers[roomCode]);
          delete questionTimers[roomCode];
        }
        return;
      }

      rooms[roomCode].quizState.questionTimer -= 1;
      const timer = rooms[roomCode].quizState.questionTimer;

      io.to(roomCode).emit('quiz_timer_tick', { questionTimer: timer });

      if (timer <= 0) {
        revealCustomQuestionAnswer(roomCode);
      }
    }, 1000);
  }

  function revealCustomQuestionAnswer(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.quizState || room.quizState.phase !== 'question') return;

    if (questionTimers[roomCode]) {
      clearInterval(questionTimers[roomCode]);
      delete questionTimers[roomCode];
    }

    room.quizState.phase = 'reveal';
    const currentQ = room.customQuestions[room.quizState.currentQuestionIndex];
    const leaderboard = getSortedLeaderboard(room);

    io.to(roomCode).emit('quiz_question_reveal', {
      correctAnswerIndex: currentQ.correctAnswerIndex,
      explanation: currentQ.explanation,
      answersSubmitted: room.quizState.answersSubmitted,
      leaderboard,
      eliminatedSockets: []
    });

    broadcastCustomHostLiveUpdate(roomCode);

    setTimeout(() => {
      if (!rooms[roomCode] || !rooms[roomCode].quizState) return;

      const nextQIndex = rooms[roomCode].quizState.currentQuestionIndex + 1;
      if (nextQIndex < rooms[roomCode].customQuestions.length) {
        sendCustomQuestionToRoom(roomCode, nextQIndex);
      } else {
        finishCustomQuizGame(roomCode);
      }
    }, 3500);
  }

  async function finishCustomQuizGame(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.quizState) return;

    if (questionTimers[roomCode]) {
      clearInterval(questionTimers[roomCode]);
      delete questionTimers[roomCode];
    }

    room.quizState.phase = 'game_over';
    const standings = getSortedLeaderboard(room);

    console.log(`🏆 CUSTOM GAME OVER for Room ${roomCode}! Final Standings:`, standings);

    const enrichedStandings = standings.map((p, idx) => {
      let medal = null;
      if (idx === 0) medal = 'gold';
      else if (idx === 1) medal = 'silver';
      else if (idx === 2) medal = 'bronze';

      return {
        ...p,
        rank: idx + 1,
        medal,
        xpEarned: 0, // NO XP REWARDED for custom room! Only medals to top 3!
        isWin: idx === 0
      };
    });

    // Update MySQL user records: ONLY medals & win/loss, NO XP added!
    for (const playerStats of enrichedStandings) {
      const roomPlayer = room.players.find(p => p.socketId === playerStats.socketId);
      if (roomPlayer && roomPlayer.userId && typeof roomPlayer.userId === 'number') {
        try {
          const goldAdd = playerStats.medal === 'gold' ? 1 : 0;
          const silverAdd = playerStats.medal === 'silver' ? 1 : 0;
          const bronzeAdd = playerStats.medal === 'bronze' ? 1 : 0;
          const winAdd = playerStats.isWin ? 1 : 0;
          const lossAdd = playerStats.isWin ? 0 : 1;

          await db.execute(
            `UPDATE users SET 
              gold_medals = gold_medals + ?, 
              silver_medals = silver_medals + ?, 
              bronze_medals = bronze_medals + ?, 
              wins = wins + ?, 
              losses = losses + ? 
            WHERE id = ?`,
            [goldAdd, silverAdd, bronzeAdd, winAdd, lossAdd, roomPlayer.userId]
          );
          console.log(`💾 Custom Quiz Stats saved for User ${roomPlayer.userId}: Medal: ${playerStats.medal || 'none'} (0 XP rewarded)`);
        } catch (err) {
          console.error(`Error saving Custom Quiz stats for User ${roomPlayer.userId}:`, err);
        }
      }
    }

    io.to(roomCode).emit('quiz_game_over', {
      genre: room.topic,
      standings: enrichedStandings,
      isCustomRoom: true,
      noXp: true
    });
  }

  // 3.95. SUBMIT QUIZ ANSWER
  socket.on('submit_quiz_answer', ({ roomCode, answerIndex }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room || !room.quizState || room.quizState.phase !== 'question') return;

    // In Custom Room: Host is a spectator and cannot participate in the quiz
    if (room.isCustomRoom && (socket.id === room.hostSocketId || room.players.find(p => p.socketId === socket.id)?.isHostSpectator)) {
      return socket.emit('join_error', { message: 'The host is a spectator and does not answer questions!' });
    }

    if (room.quizState.eliminatedSockets.includes(socket.id)) {
      return socket.emit('join_error', { message: 'You have been eliminated from this quiz!' });
    }

    if (room.quizState.answersSubmitted[socket.id]) return;

    const currentQ = room.isCustomRoom
      ? room.customQuestions[room.quizState.currentQuestionIndex]
      : room.quizState.questions[room.quizState.currentQuestionIndex];
    if (!currentQ) return;

    const timeTakenSec = Math.max(0.1, (Date.now() - room.quizState.questionStartTime) / 1000);
    const isCorrect = Number(answerIndex) === Number(currentQ.correctAnswerIndex);
    const scoreResult = calculateQuestionScore(isCorrect, timeTakenSec);

    room.quizState.scores[socket.id] = (room.quizState.scores[socket.id] || 0) + scoreResult.points;
    room.quizState.answersSubmitted[socket.id] = {
      answerIndex,
      isCorrect,
      pointsEarned: scoreResult.points,
      speedBonus: scoreResult.speedBonus,
      timeTakenSec
    };

    console.log(`📝 ${socket.id} answered Q${room.quizState.currentQuestionIndex + 1}: ${isCorrect ? 'CORRECT' : 'WRONG'} (+${scoreResult.points} pts in ${timeTakenSec.toFixed(1)}s)`);

    socket.emit('quiz_answer_feedback', {
      isCorrect,
      answerIndex,
      correctAnswerIndex: currentQ.correctAnswerIndex,
      pointsEarned: scoreResult.points,
      speedBonus: scoreResult.speedBonus,
      totalScore: room.quizState.scores[socket.id],
      explanation: currentQ.explanation
    });

    const activePlayers = room.isCustomRoom
      ? room.players.filter(p => !p.isHostSpectator)
      : getActivePlayers(room);
    const answeredCount = Object.keys(room.quizState.answersSubmitted).length;

    io.to(code).emit('player_answered_notice', {
      socketId: socket.id,
      answeredCount,
      totalActivePlayers: activePlayers.length
    });

    // If Custom Room, broadcast live rankings and question state to host immediately!
    if (room.isCustomRoom) {
      broadcastCustomHostLiveUpdate(code);
    }

    if (answeredCount >= activePlayers.length) {
      console.log(`⚡ All ${answeredCount} active players answered! Revealing answer...`);
      if (room.isCustomRoom) {
        revealCustomQuestionAnswer(code);
      } else {
        revealQuestionAnswer(code);
      }
    }
  });

  // 3.96. MANUAL START MAIN QUIZ (Host Action)
  socket.on('start_main_quiz', ({ roomCode }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room) return;
    if (room.isCustomRoom) {
      const contestants = room.players.filter(p => !p.isHostSpectator && !p.isHost);
      const hasHost = room.players.some(p => p.isHost || p.isHostSpectator);
      if (contestants.length < 2 || !hasHost) {
        return socket.emit('join_error', { message: 'Minimum 2 players and 1 host are required to start the custom quiz!' });
      }
      startCustomQuiz(code);
    } else {
      startMainQuiz(code);
    }
  });

  // 3.97. START CUSTOM GAME (Host Action)
  socket.on('start_custom_game', ({ roomCode }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room || !room.isCustomRoom) return;

    const requestingPlayer = room.players.find(p => p.socketId === socket.id);
    const isHost = room.hostSocketId === socket.id || requestingPlayer?.isHost;
    if (!isHost) {
      return socket.emit('join_error', { message: 'Only the host can start the custom game!' });
    }

    // Custom quiz mode: Host is NOT counted as a player! At least 2 players and 1 host required.
    const contestants = room.players.filter(p => !p.isHostSpectator && !p.isHost);
    if (contestants.length < 2) {
      return socket.emit('join_error', { message: 'Minimum 2 players and 1 host are required to start the custom quiz!' });
    }

    if (room.gameStarted) return;
    startCustomQuiz(code);
  });

  // 3.98. HOST FORCE NEXT / REVEAL (Host Action in Custom Room)
  socket.on('host_force_next', ({ roomCode }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room || !room.isCustomRoom) return;
    if (socket.id !== room.hostSocketId) return;

    if (room.quizState && room.quizState.phase === 'question') {
      revealCustomQuestionAnswer(code);
    } else if (room.quizState && room.quizState.phase === 'reveal') {
      const nextQIndex = room.quizState.currentQuestionIndex + 1;
      if (nextQIndex < room.customQuestions.length) {
        sendCustomQuestionToRoom(code, nextQIndex);
      } else {
        finishCustomQuizGame(code);
      }
    }
  });

  // 3.99. HOST END QUIZ (Host Action in Custom Room)
  socket.on('host_end_quiz', ({ roomCode }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room || !room.isCustomRoom) return;
    if (socket.id !== room.hostSocketId) return;

    finishCustomQuizGame(code);
  });

  // 3.8. START GENRE POLL (Host action)
  socket.on('start_genre_poll', ({ roomCode }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room) return;

    const requestingPlayer = room.players.find(p => p.socketId === socket.id);
    const isHost = room.hostSocketId === socket.id || requestingPlayer?.isHost || (room.players.length > 0 && room.players[0].socketId === socket.id);

    if (!isHost) {
      return socket.emit('join_error', { message: 'Only the host can start the game!' });
    }

    // If Custom Room, start custom quiz directly! No genre poll needed!
    // Custom quiz mode: Host is NOT counted as a player! At least 2 players and 1 host required.
    if (room.isCustomRoom) {
      const contestants = room.players.filter(p => !p.isHostSpectator && !p.isHost);
      if (contestants.length < 2) {
        return socket.emit('join_error', { message: 'Minimum 2 players and 1 host are required to start the custom quiz!' });
      }
      if (room.gameStarted) return;
      startCustomQuiz(code);
      return;
    }

    if (room.players.length < 2) {
      return socket.emit('join_error', { message: 'Minimum 2 players are required to start the game!' });
    }

    if (room.gameStarted || (room.pollState && room.pollState.started && !room.pollState.ended)) return;

    room.gameStarted = true;
    startPollRound(code, false);
  });

  // 3.9. SUBMIT GENRE VOTE
  socket.on('submit_genre_vote', ({ roomCode, genre }) => {
    const code = (roomCode || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room || !room.pollState || room.pollState.ended) return;

    if (!room.pollState.availableGenres.includes(genre)) return;

    const previousVote = room.pollState.playerVotes[socket.id];
    if (previousVote && room.pollState.votes[previousVote] > 0) {
      room.pollState.votes[previousVote] -= 1;
    }

    room.pollState.playerVotes[socket.id] = genre;
    room.pollState.votes[genre] = (room.pollState.votes[genre] || 0) + 1;

    console.log(`🗳️ Vote in ${code} for ${genre} by ${socket.id}`);

    // Auto-end poll immediately if ALL active players in the room have voted!
    const votedCount = Object.keys(room.pollState.playerVotes).length;
    if (votedCount >= room.players.length) {
      console.log(`⚡ All ${votedCount} players in room ${code} have voted! Finishing poll round immediately.`);
      finishPollRound(code);
    } else {
      io.to(code).emit('poll_vote_update', {
        votes: room.pollState.votes,
        playerVotesCount: votedCount,
        totalPlayers: room.players.length
      });
      io.to(code).emit('room_updated', { roomState: room });
    }
  });

  // 4. LEAVE ROOM
  socket.on('leave_room', ({ roomCode }) => {
    handleLeaveRoom(socket, roomCode);
  });

  // 5. DISCONNECT
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    if (socket.currentRoomCode) {
      handleLeaveRoom(socket, socket.currentRoomCode);
    }
  });

  function handleLeaveRoom(soc, code) {
    const room = rooms[code];
    if (!room) return;

    const index = room.players.findIndex(p => p.socketId === soc.id);
    if (index === -1) return;

    const leavingPlayer = room.players[index];
    const wasHost = room.hostSocketId === soc.id || leavingPlayer.isHost;

    // Remove leaving player from room
    room.players.splice(index, 1);
    soc.leave(code);
    soc.currentRoomCode = null;

    console.log(`👋 Player ${leavingPlayer.name} left room ${code}`);

    // If no players remain, clean up and delete room
    if (room.players.length === 0) {
      console.log(`🗑️ Room ${code} is empty. Deleting room.`);
      if (pollIntervals[code]) {
        clearInterval(pollIntervals[code]);
        delete pollIntervals[code];
      }
      if (questionTimers[code]) {
        clearInterval(questionTimers[code]);
        delete questionTimers[code];
      }
      delete rooms[code];
      return;
    }

    // If custom room and host left, terminate room
    if (room.isCustomRoom && wasHost) {
      console.log(`🛑 Host left Custom Room ${code}. Terminating custom room.`);
      if (questionTimers[code]) {
        clearInterval(questionTimers[code]);
        delete questionTimers[code];
      }
      io.to(code).emit('game_terminated', {
        message: 'Host has left the room. Custom room closed.'
      });
      delete rooms[code];
      return;
    }

    // If host left and players still remain, transfer host leadership to next remaining player
    if (wasHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.hostSocketId = room.players[0].socketId;
      console.log(`👑 Host left room ${code}. Leadership transferred to ${room.players[0].name}`);
    }

    const wasGameActive = room.gameStarted || 
                          (room.pollState && room.pollState.started) || 
                          (room.quizState && room.quizState.active);

    // If only 1 player is left in standard room, or in custom room fewer than 2 contestants left
    const isBelowMinPlayers = room.isCustomRoom
      ? room.players.filter(p => !p.isHostSpectator && !p.isHost).length < 2
      : room.players.length === 1;

    if (isBelowMinPlayers) {
      if (wasGameActive) {
        console.log(`🛑 Game terminated in room ${code}: not enough players remaining.`);

        // Clear active timers
        if (pollIntervals[code]) {
          clearInterval(pollIntervals[code]);
          delete pollIntervals[code];
        }
        if (questionTimers[code]) {
          clearInterval(questionTimers[code]);
          delete questionTimers[code];
        }

        // Reset game states back to lobby
        room.gameStarted = false;
        room.pollState = null;
        room.quizState = null;
        room.timerSeconds = 300;

        // Broadcast game_terminated event
        io.to(code).emit('game_terminated', {
          message: room.isCustomRoom
            ? 'Game terminated: Custom quiz requires at least two players and one host.'
            : 'Game terminated: No competitor left in the room.'
        });

        // Broadcast toast notification
        io.to(code).emit('player_event_toast', {
          type: 'warning',
          message: room.isCustomRoom
            ? 'Game terminated! Minimum 2 players required.'
            : 'Game terminated! No competitor left.'
        });
      } else {
        // In lobby phase when below minimum players
        io.to(code).emit('player_event_toast', {
          type: 'leave',
          message: room.isCustomRoom
            ? `${leavingPlayer.name} left. Waiting for at least 2 players...`
            : `${leavingPlayer.name} left. No competitor left in the room.`
        });
      }
    } else {
      // More than required players still left in room
      io.to(code).emit('player_event_toast', {
        type: 'leave',
        message: `${leavingPlayer.name} left the room.`
      });
    }

    // Broadcast updated room state to remaining player(s)
    io.to(code).emit('room_updated', { roomState: room });
  }
});

// --- LEVEL PROGRESSION HELPER ---
// Level 1 -> 2: 1000 XP
// Level 2 -> 3: 2000 XP (Total 3000 XP)
// Level 3 -> 4: 3000 XP (Total 6000 XP), and so on
export function calculateLevelInfo(totalXp = 0) {
  let xp = Math.max(0, Number(totalXp) || 0);
  let level = 1;
  let xpForNextLevel = 1000;

  while (xp >= xpForNextLevel) {
    xp -= xpForNextLevel;
    level += 1;
    xpForNextLevel += 1000;
  }

  return {
    level,
    currentXpInLevel: xp,
    xpNeededForNextLevel: xpForNextLevel,
    progressPercent: Math.min(100, Math.round((xp / xpForNextLevel) * 100))
  };
}

// --- AUTHENTICATION ROUTES ---

// 1. REGISTER USER
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const [existingUsers] = await db.execute('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user into MySQL database
    const [result] = await db.execute(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [fullName.trim(), normalizedEmail, passwordHash]
    );

    // Create session for the new user (Auto-login after registration)
    const lvl = calculateLevelInfo(0);
    const userSession = {
      id: result.insertId,
      fullName: fullName.trim(),
      email: normalizedEmail,
      playerName: null,
      avatarUrl: null,
      xp: 0,
      level: lvl.level,
      levelInfo: lvl,
      goldMedals: 0,
      silverMedals: 0,
      bronzeMedals: 0,
      wins: 0,
      losses: 0
    };

    req.session.user = userSession;

    return res.status(201).json({
      message: 'Registration successful!',
      user: userSession
    });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// 2. LOGIN USER
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user in database
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    const user = users[0];
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Verify password match
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Set session cookie
    const lvl = calculateLevelInfo(user.xp || 0);
    const userSession = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      playerName: user.player_name || null,
      avatarUrl: user.avatar_url || null,
      xp: user.xp || 0,
      level: lvl.level,
      levelInfo: lvl,
      goldMedals: user.gold_medals || 0,
      silverMedals: user.silver_medals || 0,
      bronzeMedals: user.bronze_medals || 0,
      wins: user.wins || 0,
      losses: user.losses || 0
    };

    req.session.user = userSession;

    return res.json({
      message: 'Login successful!',
      user: userSession
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// 3. SAVE / UPDATE PLAYER PROFILE
app.post('/api/user/profile', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized. Session expired.' });
    }

    const { playerName, avatarUrl } = req.body;
    if (!playerName || !avatarUrl) {
      return res.status(400).json({ error: 'Please provide a player name and select an avatar.' });
    }

    const userId = req.session.user.id;

    await db.execute(
      'UPDATE users SET player_name = ?, avatar_url = ? WHERE id = ?',
      [playerName.trim(), avatarUrl, userId]
    );

    req.session.user.playerName = playerName.trim();
    req.session.user.avatarUrl = avatarUrl;

    return res.json({
      message: 'Profile updated successfully!',
      user: req.session.user
    });
  } catch (err) {
    console.error('Profile Save Error:', err);
    return res.status(500).json({ error: 'Server error saving profile.' });
  }
});

// 3. CHECK SESSION STATUS (Auto-login on refresh/re-visit within 7 days)
app.get('/api/auth/me', async (req, res) => {
  if (req.session && req.session.user) {
    try {
      const [users] = await db.execute('SELECT id, full_name, email, player_name, avatar_url, xp, gold_medals, silver_medals, bronze_medals, wins, losses FROM users WHERE id = ?', [req.session.user.id]);
      if (users.length > 0) {
        const u = users[0];
        const lvl = calculateLevelInfo(u.xp || 0);
        const userSession = {
          id: u.id,
          fullName: u.full_name,
          email: u.email,
          playerName: u.player_name || null,
          avatarUrl: u.avatar_url || null,
          xp: u.xp || 0,
          level: lvl.level,
          levelInfo: lvl,
          goldMedals: u.gold_medals || 0,
          silverMedals: u.silver_medals || 0,
          bronzeMedals: u.bronze_medals || 0,
          wins: u.wins || 0,
          losses: u.losses || 0
        };
        req.session.user = userSession;
        return res.json({ authenticated: true, user: userSession });
      }
    } catch (err) {
      console.error('Error fetching user in /api/auth/me:', err);
    }
    return res.json({
      authenticated: true,
      user: req.session.user
    });
  }
  return res.json({
    authenticated: false,
    user: null
  });
});

// 4. LOGOUT USER
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out. Try again.' });
    }
    res.clearCookie('quiz_session_id');
    return res.json({ message: 'Logged out successfully.' });
  });
});

// 5. VERIFY PASSWORD (for inline profile editing security check)
app.post('/api/auth/verify-password', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized. Session expired.' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Please enter your password.' });
    }

    const userId = req.session.user.id;
    const [users] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password. Access denied.' });
    }

    return res.json({ verified: true, message: 'Password verified.' });
  } catch (err) {
    console.error('Verify Password Error:', err);
    return res.status(500).json({ error: 'Server error verifying password.' });
  }
});

// --- CUSTOM QUIZZES API ROUTES ---
// 1. SAVE CUSTOM QUIZ
app.post('/api/custom-quizzes', async (req, res) => {
  try {
    const { topic, timerSeconds, questions } = req.body;
    const userId = req.session?.user?.id || null;

    if (!topic || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Topic and at least 1 question are required.' });
    }

    const [result] = await db.execute(
      'INSERT INTO custom_quizzes (host_id, topic, timer_seconds, questions_json) VALUES (?, ?, ?, ?)',
      [userId, topic.trim(), Number(timerSeconds) || 20, JSON.stringify(questions)]
    );

    return res.status(201).json({ success: true, id: result.insertId, message: 'Custom quiz saved successfully!' });
  } catch (err) {
    console.error('Save Custom Quiz Error:', err);
    return res.status(500).json({ error: 'Server error saving custom quiz.' });
  }
});

// 2. GET USER'S SAVED CUSTOM QUIZZES
app.get('/api/custom-quizzes', async (req, res) => {
  try {
    if (!req.session?.user?.id) {
      return res.json({ quizzes: [] });
    }

    const [quizzes] = await db.execute(
      'SELECT id, topic, timer_seconds, questions_json, created_at FROM custom_quizzes WHERE host_id = ? ORDER BY created_at DESC',
      [req.session.user.id]
    );

    const formatted = quizzes.map(q => {
      let parsed = [];
      try {
        parsed = typeof q.questions_json === 'string' ? JSON.parse(q.questions_json) : q.questions_json;
      } catch (e) {
        parsed = [];
      }
      return {
        id: q.id,
        topic: q.topic,
        timerSeconds: q.timer_seconds,
        questions: parsed,
        createdAt: q.created_at
      };
    });

    return res.json({ quizzes: formatted });
  } catch (err) {
    console.error('Fetch Custom Quizzes Error:', err);
    return res.status(500).json({ error: 'Server error fetching custom quizzes.' });
  }
});

// Start HTTP & Socket.IO Server
server.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Quiz Server & Socket.IO running on http://127.0.0.1:${PORT}`);
});

