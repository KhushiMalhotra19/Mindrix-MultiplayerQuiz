import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Users, Crown, LogOut, UserMinus, ShieldAlert, Sparkles, Clock, MessageSquare, Send } from 'lucide-react';
import GenrePoll from './GenrePoll';
import QuizPlayground from './QuizPlayground';
import { useAuth } from '../context/AuthContext';

export default function GameRoomLobby({ socket, roomState, user: propUser, onLeaveRoom }) {
  const auth = useAuth();
  const user = propUser !== undefined ? propUser : auth.user;
  const [copied, setCopied] = useState(false);
  const [showKickModal, setShowKickModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(roomState?.timerSeconds ?? 300);

  // Lobby Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [minPlayersNotice, setMinPlayersNotice] = useState('');
  const chatMessagesEndRef = useRef(null);

  // Check if current user is host
  const isHost = roomState?.players?.find(p => p.socketId === socket?.id)?.isHost || 
                 roomState?.hostSocketId === socket?.id || 
                 (roomState?.players?.length > 0 && (roomState.players[0].socketId === socket?.id || (user?.id && String(roomState.players[0].userId) === String(user.id))));

  const [gameTerminatedNotice, setGameTerminatedNotice] = useState('');

  // Set up socket listeners for notifications, timer, chat & room updates
  useEffect(() => {
    if (!socket) return;

    const handleToast = ({ type, message }) => {
      setToastMessage({ type, text: message });
      setTimeout(() => {
        setToastMessage(null);
      }, 3500);
    };

    const handleTimerUpdate = ({ timerSeconds }) => {
      setTimerSeconds(timerSeconds);
    };

    const handleNewChatMessage = (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    };

    const handleGameTerminated = ({ message }) => {
      setGameTerminatedNotice(message || 'Game terminated: No competitor left in the room.');
    };

    socket.on('player_event_toast', handleToast);
    socket.on('timer_update', handleTimerUpdate);
    socket.on('new_chat_message', handleNewChatMessage);
    socket.on('game_terminated', handleGameTerminated);

    return () => {
      socket.off('player_event_toast', handleToast);
      socket.off('timer_update', handleTimerUpdate);
      socket.off('new_chat_message', handleNewChatMessage);
      socket.off('game_terminated', handleGameTerminated);
    };
  }, [socket]);

  // Auto-scroll chat feed to bottom on new message
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !roomState?.code) return;
    socket.emit('send_chat_message', {
      roomCode: roomState.code,
      message: chatInput.trim()
    });
    setChatInput('');
  };

  // Sync initial timerSeconds from roomState if updated
  useEffect(() => {
    if (roomState?.timerSeconds !== undefined) {
      setTimerSeconds(roomState.timerSeconds);
    }
  }, [roomState?.timerSeconds]);

  // Local smooth timer countdown fallback
  useEffect(() => {
    if (timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds > 0]);

  // Format MM:SS for 5-minute timer
  const formatTime = (totalSeconds) => {
    const sec = Math.max(0, totalSeconds || 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Handle Copy Room Code
  const handleCopyCode = () => {
    if (roomState?.code) {
      navigator.clipboard.writeText(roomState.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle Kick Player (Host action)
  const handleKickPlayer = (targetSocketId, _targetName) => {
    if (!socket || !roomState?.code) return;
    socket.emit('kick_player', {
      roomCode: roomState.code,
      targetSocketId
    });
  };

  // Handle Leave Room Action
  const handleLeave = () => {
    if (socket && roomState?.code) {
      socket.emit('leave_room', { roomCode: roomState.code });
    }
    if (onLeaveRoom) {
      onLeaveRoom();
    }
  };

  const confirmLeave = () => {
    setShowLeaveModal(false);
    handleLeave();
  };

  // Handle Start Game Action (Host only - Triggers Genre Poll or Custom Quiz)
  const handleStartGame = () => {
    if (roomState?.isCustomRoom) {
      if (playerSocketsExceptHost.length < 2) {
        setMinPlayersNotice('Minimum 2 players and 1 host are required to start custom quiz!');
        setTimeout(() => setMinPlayersNotice(''), 4000);
        return;
      }
      if (socket && roomState?.code) {
        socket.emit('start_custom_game', { roomCode: roomState.code });
      }
      return;
    }

    if (players.length < 2) {
      setMinPlayersNotice('Minimum 2 players are required to start the game!');
      setTimeout(() => setMinPlayersNotice(''), 4000);
      return;
    }
    if (socket && roomState?.code) {
      socket.emit('start_genre_poll', { roomCode: roomState.code });
    }
  };

  // Helper to calculate circular/elliptical positioning for players around the center host
  const getPlayerPosition = (index, total) => {
    // Single player or Host (index 0) always positioned in center
    if (total === 1 || index === 0) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const nonHostTotal = total - 1;
    const nonHostIndex = index - 1;

    // Generous elliptical radii tailored for an expanded 920px wide x 430px tall arena on desktop/laptop
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
    const radiusX = isMobile ? Math.min(135, 110 + nonHostTotal * 5) : Math.min(340, 240 + nonHostTotal * 10);
    const radiusY = isMobile ? Math.min(100, 80 + nonHostTotal * 4) : Math.min(175, 120 + nonHostTotal * 6);

    // Smart angle assignment: for 1 or 2 non-host players, position on sides (right/left) to eliminate vertical overlap
    let angle;
    if (nonHostTotal === 1) {
      angle = 0; // Right side of host (x = +radiusX, y = 0)
    } else if (nonHostTotal === 2) {
      angle = nonHostIndex === 0 ? 0 : Math.PI; // Right and Left of host
    } else {
      angle = (nonHostIndex / nonHostTotal) * 2 * Math.PI - Math.PI / 2;
    }

    const x = Math.cos(angle) * radiusX;
    const y = Math.sin(angle) * radiusY;

    return {
      top: `calc(50% + ${y}px)`,
      left: `calc(50% + ${x}px)`,
      transform: 'translate(-50%, -50%)'
    };
  };

  const players = roomState?.players || [];
  const roomCode = roomState?.code || '------';
  const playerSocketsExceptHost = players.filter(p => !p.isHost);
  const canStartGame = roomState?.isCustomRoom
    ? playerSocketsExceptHost.length >= 2
    : players.length >= 2;

  // IF QUIZ GAME IS ACTIVE, RENDER QUIZ PLAYGROUND
  if (roomState?.quizState?.active || roomState?.quizState?.phase) {
    return (
      <QuizPlayground
        socket={socket}
        roomState={roomState}
        user={user}
        onReturnToLobby={onLeaveRoom}
      />
    );
  }

  // IF GENRE POLL IS ACTIVE, RENDER GENRE POLL SCREEN
  if (roomState?.pollState?.started) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '92vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}
      >
        <GenrePoll
          socket={socket}
          roomCode={roomState.code}
          pollState={roomState.pollState}
          isHost={isHost}
        />
      </div>
    );
  }

  return (
    <div
      className="game-room-lobby-container"
      style={{
        width: 'calc(100% - 32px)',
        maxWidth: '1520px',
        margin: '0 auto 32px auto',
        minHeight: 'auto',
        maxHeight: 'none',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 10,
        padding: '24px 28px 36px 28px',
        backgroundColor: 'rgba(8, 19, 34, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '6px solid #000000',
        borderRadius: '24px',
        boxShadow: '12px 12px 0px #000000',
        boxSizing: 'border-box',
        gap: '24px',
        overflow: 'visible'
      }}
    >
      {/* ----------------------------------------------------
         LEFT MAIN LOBBY CONTENT (HEADER + ARENA + START BUTTON)
         ---------------------------------------------------- */}
      <div
        style={{
          flex: '1 1 760px',
          minWidth: '320px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        {/* Dynamic Keyframe Style for Smooth Floating Effect */}
        <style>{`
          @keyframes floatAvatar {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-10px);
            }
          }
        `}</style>

        {/* ----------------------------------------------------
           FLOATING EVENT TOAST NOTIFICATION
           ---------------------------------------------------- */}
        {toastMessage && (
          <div
            style={{
              position: 'absolute',
              top: '80px',
              zIndex: 100,
              backgroundColor: toastMessage.type === 'kick' ? '#D32231' : '#32715C',
              color: '#ffffff',
              border: '4px solid #000000',
              boxShadow: '6px 6px 0px #000000',
              borderRadius: '12px',
              padding: '10px 20px',
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '0.5px',
              animation: 'fadeInUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Sparkles size={20} />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* ----------------------------------------------------
           TOP LEFT: KICK OUT TRIANGLE BUTTON (Host Only)
           ---------------------------------------------------- */}
        {isHost && (
          <div
            className="lobby-kick-btn"
            onClick={() => setShowKickModal(true)}
            title="Kick out participants"
            style={{
              position: 'absolute',
              top: '0px',
              left: '0px',
              zIndex: 40,
              cursor: 'pointer',
              filter: 'drop-shadow(6px 6px 0px #000000)',
              transition: 'transform 0.15s ease',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-2px, -2px) scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0px, 0px) scale(1)';
            }}
          >
            <svg width="105" height="90" viewBox="0 0 110 95">
              <polygon
                points="55,6 105,90 5,90"
                fill="#D32231"
                stroke="#000000"
                strokeWidth="5"
                strokeLinejoin="round"
              />
              <text
                x="55"
                y="60"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="14"
                fontWeight="900"
                fontFamily="Space Grotesk, sans-serif"
                letterSpacing="0.5px"
              >
                KICK OUT
              </text>
            </svg>
          </div>
        )}

        {/* ----------------------------------------------------
           TOP RIGHT: LEAVE ROOM TRIANGLE BUTTON (All Players)
           ---------------------------------------------------- */}
        <div
          className="lobby-leave-btn"
          onClick={() => setShowLeaveModal(true)}
          title="Leave Room"
          style={{
            position: 'absolute',
            top: '0px',
            right: '0px',
            zIndex: 40,
            cursor: 'pointer',
            filter: 'drop-shadow(6px 6px 0px #000000)',
            transition: 'transform 0.15s ease',
            userSelect: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(-2px, -2px) scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0px, 0px) scale(1)';
          }}
        >
          <svg width="105" height="90" viewBox="0 0 110 95">
            <polygon
              points="55,6 105,90 5,90"
              fill="#D32231"
              stroke="#000000"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <text
              x="55"
              y="54"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="13"
              fontWeight="900"
              fontFamily="Space Grotesk, sans-serif"
              letterSpacing="0.5px"
            >
              LEAVE
            </text>
            <text
              x="55"
              y="70"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="13"
              fontWeight="900"
              fontFamily="Space Grotesk, sans-serif"
              letterSpacing="0.5px"
            >
              ROOM
            </text>
          </svg>
        </div>

        {/* ----------------------------------------------------
           TOP CENTER: ROOM CODE, PLAYER COUNT & 5-MIN TIMER HEADER
           ---------------------------------------------------- */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            marginTop: '0px',
            zIndex: 30
          }}
        >
          {/* Custom Room Topic Banner */}
          {roomState?.isCustomRoom && (
            <div
              style={{
                backgroundColor: '#32715C',
                color: '#ffffff',
                border: '3.5px solid #000000',
                boxShadow: '4px 4px 0px #000000',
                borderRadius: '12px',
                padding: '6px 18px',
                fontWeight: 900,
                fontSize: '0.92rem',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                letterSpacing: '0.5px'
              }}
            >
              <Sparkles size={16} />
              <span>CUSTOM QUIZ: {roomState.topic} ({roomState.customQuestions?.length || 0} Questions, {roomState.timerSecondsPerQuestion}s)</span>
            </div>
          )}

          {/* Room Code Badge */}
          <div
            className="lobby-code-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#0b192c',
              color: '#ffffff',
              border: '4px solid #000000',
              boxShadow: '6px 6px 0px #000000',
              borderRadius: '16px',
              padding: '8px 20px'
            }}
          >
            <span style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase', color: '#4E9F83' }}>
              Room Code:
            </span>
            <span
              style={{
                fontSize: '1.65rem',
                fontWeight: 900,
                letterSpacing: '2.5px',
                color: '#D32231'
              }}
            >
              {roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              title="Copy Room Code"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '6px 14px',
                backgroundColor: copied ? '#D32231' : '#32715C',
                color: '#ffffff',
                border: '3px solid #000000',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.85rem',
                transition: 'all 0.15s ease'
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>

          {/* Players Count & 5-Minute Auto-Start Timer Badges */}
          <div
            className="lobby-stats-badges"
            style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#0b192c',
                border: '3px solid #000000',
                boxShadow: '4px 4px 0px #000000',
                borderRadius: '12px',
                padding: '6px 16px',
                fontSize: '1.02rem',
                fontWeight: 800,
                color: '#ffffff'
              }}
            >
              <Users size={18} color="#4E9F83" />
              <span>
                {roomState?.isCustomRoom ? 'Contestants: ' : 'Players: '}
                <span style={{ color: '#4E9F83', fontWeight: 900 }}>
                  {roomState?.isCustomRoom ? playerSocketsExceptHost.length : players.length}
                </span>
              </span>
              <span style={{ color: '#D32231', marginLeft: '6px', fontWeight: 800 }}>Max: 10</span>
            </div>

            {/* 5-Minute Countdown Timer Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: timerSeconds > 0 && timerSeconds <= 10 ? '#D32231' : '#0b192c',
                color: '#ffffff',
                border: timerSeconds > 0 && timerSeconds <= 10 ? '3px solid #ff4d4d' : '3px solid #000000',
                boxShadow: timerSeconds > 0 && timerSeconds <= 10 ? '0 0 16px rgba(211, 34, 49, 0.8), 4px 4px 0px #000000' : '4px 4px 0px #000000',
                borderRadius: '12px',
                padding: '6px 16px',
                fontSize: '0.95rem',
                fontWeight: 800,
                transition: 'all 0.3s ease'
              }}
            >
              <Clock size={16} color={timerSeconds > 0 && timerSeconds <= 10 ? '#ffffff' : '#D32231'} />
              <span>Auto-start: <span style={{ color: timerSeconds > 0 && timerSeconds <= 10 ? '#ffffff' : '#D32231', fontSize: '1.08rem', fontWeight: 900 }}>{formatTime(timerSeconds)}</span></span>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------
           CENTER ARENA: PLAYER CIRCLES DISPLAY
           ---------------------------------------------------- */}
        <div
          className="lobby-arena-container"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '920px',
            height: '430px',
            margin: '12px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20
          }}
        >
          {players.map((player, idx) => {
            const pos = getPlayerPosition(idx, players.length);
            const isCurrentPlayerHost = player.isHost;

            return (
              <div
                key={player.socketId || idx}
                style={{
                  position: 'absolute',
                  top: pos.top,
                  left: pos.left,
                  transform: pos.transform,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  zIndex: isCurrentPlayerHost ? 30 : 25
                }}
              >
                {/* Themed Circular Avatar Container with Floating Animation */}
                <div
                  style={{
                    position: 'relative',
                    width: isCurrentPlayerHost ? '96px' : '80px',
                    height: isCurrentPlayerHost ? '96px' : '80px',
                    borderRadius: '50%',
                    backgroundColor: '#FAF6F0',
                    border: isCurrentPlayerHost ? '5px solid #D32231' : '4.5px solid #32715C',
                    boxShadow: '6px 6px 0px #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    animation: 'floatAvatar 3.2s ease-in-out infinite',
                    animationDelay: `${idx * 0.35}s`
                  }}
                >
                  {/* Crown badge for Host */}
                  {isCurrentPlayerHost && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        backgroundColor: '#D32231',
                        border: '2px solid #000000',
                        borderRadius: '50%',
                        padding: '3px',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Crown size={13} color="#ffffff" fill="#ffffff" />
                    </div>
                  )}

                  <img
                    src={player.avatar || '/avatars/lion.png'}
                    alt={player.name}
                    style={{
                      width: '85%',
                      height: '85%',
                      objectFit: 'contain',
                      filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.3))'
                    }}
                  />
                </div>

                {/* Player Name Pill: Host in Tomato Jam (#D32231), Everyone else in Deep Teal (#32715C) */}
                <div
                  style={{
                    backgroundColor: isCurrentPlayerHost ? '#D32231' : '#32715C',
                    color: '#ffffff',
                    border: '3px solid #000000',
                    boxShadow: '3px 3px 0px #000000',
                    borderRadius: '12px',
                    padding: '4px 12px',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    whiteSpace: 'nowrap',
                    maxWidth: '125px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</span>
                  {isCurrentPlayerHost && (
                    <span style={{ fontSize: '0.74rem', opacity: 0.95, flexShrink: 0 }}>
                      {roomState?.isCustomRoom ? '(Host / Spectator)' : '(host)'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ----------------------------------------------------
           BOTTOM CENTER: START GAME CIRCLE BUTTON (GREEN TEAL) (Host Only)
           ---------------------------------------------------- */}
        {isHost ? (
          <div
            style={{
              marginTop: 'auto',
              marginBottom: '6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              zIndex: 40
            }}
          >
            {minPlayersNotice && (
              <div
                style={{
                  position: 'absolute',
                  top: '-38px',
                  whiteSpace: 'nowrap',
                  backgroundColor: '#D32231',
                  color: '#ffffff',
                  border: '3px solid #000000',
                  boxShadow: '4px 4px 0px #000000',
                  borderRadius: '10px',
                  padding: '4px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  zIndex: 60,
                  animation: 'fadeInUp 0.25s ease forwards'
                }}
              >
                ⚠️ {minPlayersNotice}
              </div>
            )}
            <button
              onClick={handleStartGame}
              disabled={!canStartGame}
              title={
                !canStartGame
                  ? (roomState?.isCustomRoom
                      ? 'Minimum 2 players and 1 host required to start'
                      : 'Minimum 2 players required to start')
                  : 'Start Game'
              }
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                backgroundColor: !canStartGame ? '#4A5568' : '#32715C',
                color: '#ffffff',
                border: '5px solid #000000',
                boxShadow: !canStartGame ? '4px 4px 0px #000000' : '8px 8px 0px #000000',
                cursor: !canStartGame ? 'not-allowed' : 'pointer',
                opacity: !canStartGame ? 0.75 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.98rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                if (canStartGame) {
                  e.currentTarget.style.transform = 'translate(-3px, -3px) scale(1.06)';
                  e.currentTarget.style.boxShadow = '11px 11px 0px #000000';
                }
              }}
              onMouseLeave={(e) => {
                if (canStartGame) {
                  e.currentTarget.style.transform = 'translate(0px, 0px) scale(1)';
                  e.currentTarget.style.boxShadow = '8px 8px 0px #000000';
                }
              }}
            >
              <span>Start</span>
              <span>Game</span>
            </button>
            {!canStartGame && (
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#D32231',
                  marginTop: '4px',
                  textAlign: 'center'
                }}
              >
                {roomState?.isCustomRoom
                  ? `Min 2 players required (excluding host) (${playerSocketsExceptHost.length}/2 joined)`
                  : `Min 2 players required (${players.length}/10)`
                }
              </span>
            )}
          </div>
        ) : (
          <div
            style={{
              marginTop: 'auto',
              marginBottom: '14px',
              backgroundColor: '#ffffff',
              color: '#000000',
              border: '4px solid #000000',
              boxShadow: '6px 6px 0px #000000',
              borderRadius: '16px',
              padding: '12px 24px',
              fontWeight: 800,
              fontSize: '1rem',
              zIndex: 30,
              textAlign: 'center'
            }}
          >
            ⏳ Waiting for host to start the game...
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
         RIGHT SIDEBAR: INSIDE LOBBY TRANSLUCENT GREEN TEAL CHAT (BEFORE GAME STARTS)
         ---------------------------------------------------- */}
      {!roomState?.gameStarted && (
        <div
          className="lobby-chat-sidebar"
          style={{
            width: '320px',
            minWidth: '280px',
            flex: '0 0 320px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(50, 113, 92, 0.35)', // High Translucency Green Teal
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '4px solid #000000',
            borderRadius: '20px',
            boxShadow: '4px 4px 0px #000000',
            padding: '16px',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 30,
            height: 'auto',
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingBottom: '12px',
              borderBottom: '3px solid #000000',
              color: '#ffffff'
            }}
          >
            <div
              style={{
                backgroundColor: '#0b192c',
                border: '2px solid #000000',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MessageSquare size={20} color="#4E9F83" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Lobby Chat
              </span>
              <span style={{ fontSize: '0.74rem', opacity: 0.9, fontWeight: 700 }}>
                Chat with players before game starts
              </span>
            </div>
          </div>

          {/* Messages Feed Area */}
          <div
            style={{
              flex: 1,
              minHeight: '200px',
              maxHeight: '400px',
              overflowY: 'auto',
              margin: '12px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '6px'
            }}
          >
            {chatMessages.length === 0 ? (
              <div
                style={{
                  margin: 'auto 0',
                  textAlign: 'center',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(11, 25, 44, 0.4)',
                  border: '2px solid #000000',
                  borderRadius: '12px',
                  padding: '16px 12px'
                }}
              >
                💬 Say hi! Chat with everyone while waiting for the game to start.
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.senderSocketId === socket?.id;

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      gap: '2px'
                    }}
                  >
                    {/* Player Name Display (NO AVATARS) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        color: isMe ? '#FAF6F0' : '#FFE082',
                        paddingLeft: '2px',
                        paddingRight: '2px'
                      }}
                    >
                      <span>{msg.senderName}</span>
                      {msg.isHost && (
                        <span style={{ fontSize: '0.66rem', backgroundColor: '#D32231', color: '#ffffff', padding: '1px 5px', borderRadius: '4px', border: '1px solid #000' }}>
                          HOST
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>{msg.timestamp}</span>
                    </div>

                    {/* Chat Bubble */}
                    <div
                      style={{
                        backgroundColor: isMe ? '#16382C' : '#0B192C',
                        color: '#ffffff',
                        border: '2.5px solid #000000',
                        boxShadow: '3px 3px 0px #000000',
                        borderRadius: isMe ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                        padding: '8px 12px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        maxWidth: '90%',
                        wordBreak: 'break-word'
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatMessagesEndRef} />
          </div>

          {/* Send Message Form */}
          <form
            onSubmit={handleSendChatMessage}
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: 'auto'
            }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={200}
              style={{
                flex: 1,
                backgroundColor: '#FAF6F0',
                color: '#000000',
                border: '3px solid #000000',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '0.88rem',
                fontWeight: 800,
                outline: 'none',
                boxShadow: '3px 3px 0px #000000'
              }}
            />
            <button
              type="submit"
              title="Send Message"
              style={{
                backgroundColor: '#D32231',
                color: '#ffffff',
                border: '3px solid #000000',
                borderRadius: '10px',
                boxShadow: '3px 3px 0px #000000',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-2px, -2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translate(0px, 0px)')}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* ----------------------------------------------------
         LEAVE ROOM CONFIRMATION MODAL
         ---------------------------------------------------- */}
      {showLeaveModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#0F172A',
              color: '#ffffff',
              border: '6px solid #000000',
              boxShadow: '12px 12px 0px #000000',
              borderRadius: '20px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '18px',
              animation: 'fadeInUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#D32231',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '4px solid #000000',
                boxShadow: '4px 4px 0px #000000'
              }}
            >
              <LogOut size={28} />
            </div>

            <div>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase', margin: 0, color: '#ffffff' }}>
                Leave Room?
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#cbd5e1', marginTop: '8px', fontWeight: 600, lineHeight: 1.4 }}>
                {isHost 
                  ? 'Are you sure you want to leave the room? As host, leaving will dissolve the lobby for all players.' 
                  : 'Are you sure you want to leave the room?'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '14px', width: '100%', marginTop: '6px' }}>
              <button
                onClick={confirmLeave}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#D32231',
                  color: '#ffffff',
                  border: '4px solid #000000',
                  boxShadow: '4px 4px 0px #000000',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                Yes, Leave
              </button>

              <button
                onClick={() => setShowLeaveModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#32715C',
                  color: '#ffffff',
                  border: '4px solid #000000',
                  boxShadow: '4px 4px 0px #000000',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
         KICK PARTICIPANTS MODAL (Host Only)
         ---------------------------------------------------- */}
      {showKickModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              backgroundColor: '#0F172A',
              color: '#ffffff',
              border: '6px solid #000000',
              boxShadow: '12px 12px 0px #000000',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'fadeInUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert color="#D32231" size={24} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>
                  Kick Out Player
                </h3>
              </div>
              <button
                onClick={() => setShowKickModal(false)}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  border: '3px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', fontWeight: 600, margin: 0 }}>
              Select a player to remove them from this lobby before the game starts:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {playerSocketsExceptHost.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontWeight: 700 }}>
                  No other players in the room yet!
                </div>
              ) : (
                playerSocketsExceptHost.map((player) => (
                  <div
                    key={player.socketId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#1E293B',
                      border: '3px solid #000000',
                      borderRadius: '12px',
                      padding: '10px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={player.avatar || '/avatars/panda.png'}
                        alt={player.name}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#FFE082',
                          border: '2px solid #000'
                        }}
                      />
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#32715C' }}>{player.name}</span>
                    </div>

                    <button
                      onClick={() => handleKickPlayer(player.socketId, player.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#D32231',
                        color: '#ffffff',
                        border: '3px solid #000000',
                        boxShadow: '3px 3px 0px #000000',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textTransform: 'uppercase'
                      }}
                    >
                      <UserMinus size={14} />
                      Kick
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowKickModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#32715C',
                color: '#ffffff',
                border: '3px solid #000000',
                boxShadow: '4px 4px 0px #000000',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                marginTop: '6px'
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* GAME TERMINATED POPUP MODAL (Only 1 player left) */}
      {gameTerminatedNotice && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(8, 19, 34, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#081322',
              color: '#ffffff',
              border: '6px solid #D32231',
              boxShadow: '12px 12px 0px #000000',
              borderRadius: '24px',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '18px',
              animation: 'fadeInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#D32231',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '4px solid #000000',
                boxShadow: '4px 4px 0px #000000'
              }}
            >
              <ShieldAlert size={34} />
            </div>

            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', margin: 0, color: '#ffffff', letterSpacing: '0.5px' }}>
              Game Terminated
            </h3>

            <p style={{ fontSize: '1.1rem', color: '#ff6b6b', fontWeight: 800, margin: 0, lineHeight: 1.4 }}>
              {gameTerminatedNotice}
            </p>

            <button
              onClick={() => setGameTerminatedNotice('')}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#32715C',
                color: '#ffffff',
                border: '4px solid #000000',
                boxShadow: '5px 5px 0px #000000',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '1.05rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginTop: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translate(-2px, -2px)';
                e.currentTarget.style.boxShadow = '7px 7px 0px #000000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translate(0px, 0px)';
                e.currentTarget.style.boxShadow = '5px 5px 0px #000000';
              }}
            >
              Back to Room Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
