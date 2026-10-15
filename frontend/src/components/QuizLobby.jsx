import React, { useState, useEffect } from 'react';
import { LogOut, User, Check, Sparkles, Lock, Eye, EyeOff, X, UserMinus } from 'lucide-react';
import { io } from 'socket.io-client';
import GameRoomLobby from './GameRoomLobby';
import JoinRoomModal from './JoinRoomModal';
import CustomQuizCreator from './CustomQuizCreator';
import { useAuth } from '../context/AuthContext';

const AVATARS = [
  { id: 'lion', name: 'Cool Lion', url: '/avatars/lion.png' },
  { id: 'panda', name: 'Cute Panda', url: '/avatars/panda.png' },
  { id: 'cat', name: 'Smart Cat', url: '/avatars/cat.svg' },
  { id: 'fox', name: 'Smart Fox', url: '/avatars/fox.svg' },
  { id: 'owl', name: 'Studious Owl', url: '/avatars/owl.svg' },
  { id: 'puppy', name: 'Cute Puppy', url: '/avatars/puppy.svg' },
];

// Calculate Level & Progress from total XP
// Level 1 -> 2: 1000 XP
// Level 2 -> 3: 2000 XP (Total 3000 XP)
// Level 3 -> 4: 3000 XP (Total 6000 XP), etc.
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

export default function QuizLobby({ user: propUser, onProfileUpdated: propOnProfileUpdated, onLogout: propOnLogout }) {
  const auth = useAuth();
  const user = propUser !== undefined ? propUser : auth.user;
  const onProfileUpdated = propOnProfileUpdated || auth.handleProfileUpdated;
  const onLogout = propOnLogout || auth.handleLogout;
  const playerName = user?.playerName || user?.fullName || 'Player';
  const avatarUrl = user?.avatarUrl || '/avatars/lion.png';

  // Socket.IO Room Lobby States
  const [socket, setSocket] = useState(null);
  const [currentRoomState, setCurrentRoomState] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [kickedModalMessage, setKickedModalMessage] = useState('');

  // Selection states for progressive disclosure layout
  // Level 1: 'competitor' | 'custom' | null
  const [activeMainChoice, setActiveMainChoice] = useState(null);
  // Level 2: 'multiplayer' | 'ai' | null
  const [activeSubChoice, setActiveSubChoice] = useState(null);
  // Level 3 (Multiplayer): 'create_room' | 'join_room' | null
  const [activeRoomAction, setActiveRoomAction] = useState(null);
  // Level 3 (V/S AI): 1 | 2 | 3 | null
  const [activeAiCount, setActiveAiCount] = useState(null);

  // VS AI Bot Setup Modal States
  const [showAiCustomizationModal, setShowAiCustomizationModal] = useState(false);
  const [aiBotNames, setAiBotNames] = useState(['Bot Alpha', 'Bot Turbo', 'Bot Brainiac']);

  // Top right settings menu toggle
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Inline Profile Edit Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEditStep, setProfileEditStep] = useState('auth'); // 'auth' | 'edit'
  
  // Password Auth States
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Profile Edit Form States
  const [editPlayerName, setEditPlayerName] = useState(playerName);
  const [editAvatarUrl, setEditAvatarUrl] = useState(avatarUrl);
  const [saveError, setSaveError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Connect Socket.IO on mount
  useEffect(() => {
    const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:5000' 
      : window.location.origin;

    const newSocket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    newSocket.on('room_created', ({ roomState }) => {
      setCurrentRoomState(roomState);
      setActiveRoomAction('create');
    });

    newSocket.on('room_joined', ({ roomState }) => {
      setCurrentRoomState(roomState);
      setShowJoinModal(false);
      setJoinError('');
      setActiveRoomAction('join');
    });

    newSocket.on('join_error', ({ message }) => {
      setJoinError(message);
      if (message === 'You are already in the game!') {
        setKickedModalMessage(message);
      }
    });

    newSocket.on('room_updated', ({ roomState }) => {
      setCurrentRoomState(roomState);
    });

    newSocket.on('kicked_from_room', ({ message }) => {
      setKickedModalMessage(message || 'You were removed by the host');
      setCurrentRoomState(null);
    });

    newSocket.on('room_dissolved', ({ message }) => {
      alert(message || 'The room was dissolved by the host.');
      setCurrentRoomState(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleCreateRoom = () => {
    setActiveRoomAction('create');

    // Immediately generate random 6-character room code & set host room state
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const hostPlayer = {
      socketId: socket?.id || 'host-socket',
      userId: user?.id || 'host-id',
      name: user?.playerName || user?.fullName || 'Host',
      avatar: user?.avatarUrl || '/avatars/lion.png',
      isHost: true
    };

    const initialRoom = {
      code,
      hostSocketId: socket?.id || 'host-socket',
      maxPlayers: 10,
      players: [hostPlayer],
      gameStarted: false,
      timerSeconds: 300
    };

    setCurrentRoomState(initialRoom);

    if (socket) {
      socket.emit('create_room', { user });
    }
  };

  const handleCreateCustomRoom = ({ user, topic, timerSeconds, questions }) => {
    setActiveRoomAction('create_custom');
    if (socket) {
      socket.emit('create_custom_room', { user, topic, timerSeconds, questions });
    }
  };

  const handleOpenJoinModal = () => {
    setActiveRoomAction('join');
    setJoinError('');
    setShowJoinModal(true);
  };

  const handleJoinRoomSubmit = (roomCode) => {
    if (!socket) return;
    setJoinError('');
    socket.emit('join_room', { roomCode, user });
  };

  const handleLeaveRoom = () => {
    setCurrentRoomState(null);
  };

  const handleSelectAiCount = (num) => {
    setActiveAiCount(num);
    const defaults = ['Bot Alpha', 'Bot Turbo', 'Bot Brainiac'];
    setAiBotNames(defaults.slice(0, num));
    setShowAiCustomizationModal(true);
  };

  const handleStartAiGameSubmit = () => {
    if (!socket) return;
    const defaults = ['Bot Alpha', 'Bot Turbo', 'Bot Brainiac'];
    const names = aiBotNames.slice(0, activeAiCount).map((name, idx) => {
      const trimmed = (name || '').trim();
      return trimmed ? trimmed : (defaults[idx] || `AI Bot ${idx + 1}`);
    });

    socket.emit('create_ai_game', {
      user,
      numBots: activeAiCount,
      botNames: names
    });

    setShowAiCustomizationModal(false);
  };

  const handleOpenEditProfile = () => {
    setShowSettingsMenu(false);
    setProfileEditStep('auth');
    setAuthPassword('');
    setAuthError('');
    setSaveError('');
    setSaveSuccessMsg('');
    setEditPlayerName(playerName);
    setEditAvatarUrl(avatarUrl);
    setShowProfileModal(true);
  };

  const handlePasswordAuth = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!authPassword) {
      setAuthError('Please enter your password.');
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: authPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error || 'Password verification failed.');
        setAuthLoading(false);
        return;
      }

      setAuthLoading(false);
      setProfileEditStep('edit');
    } catch (err) {
      console.error('Verify Password Error:', err);
      setAuthError('Connection error. Please try again.');
      setAuthLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccessMsg('');

    const trimmed = editPlayerName.trim();
    if (!trimmed) {
      setSaveError('Please enter a valid player name.');
      return;
    }

    setSaveLoading(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          playerName: trimmed,
          avatarUrl: editAvatarUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveError(data.error || 'Failed to update profile.');
        setSaveLoading(false);
        return;
      }

      setSaveLoading(false);
      setSaveSuccessMsg('Profile updated successfully!');
      
      if (onProfileUpdated && data.user) {
        onProfileUpdated(data.user);
      }

      setTimeout(() => {
        setShowProfileModal(false);
      }, 1000);
    } catch (err) {
      console.error('Save Profile Error:', err);
      setSaveError('Connection error. Please try again.');
      setSaveLoading(false);
    }
  };

  const handleMainChoiceClick = (choice) => {
    if (choice === 'competitor') {
      if (activeMainChoice === 'competitor') {
        setActiveMainChoice(null);
        setActiveSubChoice(null);
        setActiveRoomAction(null);
        setActiveAiCount(null);
      } else {
        setActiveMainChoice('competitor');
        setActiveSubChoice(null);
        setActiveRoomAction(null);
        setActiveAiCount(null);
      }
    } else if (choice === 'custom') {
      setActiveMainChoice('custom');
      setActiveSubChoice(null);
      setActiveRoomAction(null);
      setActiveAiCount(null);
    }
  };

  const handleSubChoiceClick = (subChoice) => {
    if (subChoice === 'multiplayer') {
      if (activeSubChoice === 'multiplayer') {
        setActiveSubChoice(null);
        setActiveRoomAction(null);
      } else {
        setActiveSubChoice('multiplayer');
        setActiveAiCount(null);
      }
    } else if (subChoice === 'ai') {
      if (activeSubChoice === 'ai') {
        setActiveSubChoice(null);
        setActiveAiCount(null);
      } else {
        setActiveSubChoice('ai');
        setActiveRoomAction(null);
      }
    }
  };

  // If player is inside an active Socket.IO room lobby, render GameRoomLobby
  if (currentRoomState) {
    return (
      <GameRoomLobby
        socket={socket}
        roomState={currentRoomState}
        user={user}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return (
    <div
      className="quiz-lobby-card"
      style={{
        width: 'calc(100% - 32px)',
        maxWidth: '1280px',
        margin: '0 auto 32px auto',
        minHeight: '640px',
        maxHeight: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
        padding: '16px 24px 32px 24px',
        backgroundColor: 'rgba(8, 19, 34, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '6px solid #000000',
        borderRadius: '24px',
        boxShadow: '12px 12px 0px #000000',
        boxSizing: 'border-box',
      }}
    >
      {/* ----------------------------------------------------
         TOP RIGHT: AVATAR BUTTON FOR PROFILE SETTINGS
         (Positioned tightly at top right corner)
         ---------------------------------------------------- */}
      <div style={{ position: 'absolute', top: '8px', right: '12px', zIndex: 50 }}>
        <button
          onClick={() => setShowSettingsMenu(!showSettingsMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px',
            backgroundColor: '#081322',
            border: '4px solid #000000',
            boxShadow: '4px 4px 0px #000000',
            borderRadius: '50%',
            cursor: 'pointer',
            width: '48px',
            height: '48px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(-2px, -2px)';
            e.currentTarget.style.boxShadow = '6px 6px 0px #000000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0px, 0px)';
            e.currentTarget.style.boxShadow = '4px 4px 0px #000000';
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              border: '2px solid #000000',
            }}
          >
            <img
              src={avatarUrl}
              alt={playerName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </button>

        {/* Dropdown Menu */}
        {showSettingsMenu && (
          <div
            style={{
              position: 'absolute',
              top: '56px',
              right: '0',
              backgroundColor: '#ffffff',
              border: '4px solid #000000',
              boxShadow: '6px 6px 0px #000000',
              borderRadius: '12px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              minWidth: '170px',
            }}
          >
            <button
              onClick={handleOpenEditProfile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: '#32715C',
                color: '#ffffff',
                border: '3px solid #000000',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              <User size={16} strokeWidth={2.5} />
              Edit Profile
            </button>
            <button
              onClick={() => {
                setShowSettingsMenu(false);
                onLogout();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: '#D32231',
                color: '#ffffff',
                border: '3px solid #000000',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              <LogOut size={16} strokeWidth={2.5} />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
         TOP HEADER: Welcome PlayerName & Tomato Jam Tagline
         (Moved all the way to the top)
         ---------------------------------------------------- */}
      <div style={{ textAlign: 'center', marginTop: '0px', marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '2.8rem',
            fontWeight: 900,
            textTransform: 'none',
            letterSpacing: '0.5px',
            textShadow: '4px 4px 0px #000000',
            lineHeight: 1.1,
            margin: '0',
          }}
        >
          <span style={{ color: '#32715C' }}>Welcome Player </span>
          <span style={{ color: '#D32231' }}>{playerName}</span>
        </h1>

        {/* USER STATS BAR (LEVEL, MEDALS, WINS & LOSSES FROM DATABASE) */}
        {user && (() => {
          const levelInfo = calculateLevelInfo(user.xp || 0);
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '10px',
                backgroundColor: '#0b192c',
                border: '3px solid #000000',
                boxShadow: '4px 4px 0px #000000',
                borderRadius: '14px',
                padding: '6px 18px',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 800
              }}
            >
              <span
                style={{ color: '#FFD700', display: 'flex', alignItems: 'center', gap: '4px' }}
                title={`${levelInfo.currentXpInLevel} / ${levelInfo.xpNeededForNextLevel} XP towards Level ${levelInfo.level + 1} (${levelInfo.progressPercent}% - Total: ${user.xp || 0} XP)`}
              >
                ⭐ Level: <span style={{ color: '#ffffff', fontWeight: 900 }}>{levelInfo.level}</span>
                <span style={{ color: '#94A3B8', fontSize: '0.78rem', fontWeight: 700, marginLeft: '2px' }}>
                  ({levelInfo.currentXpInLevel}/{levelInfo.xpNeededForNextLevel} XP)
                </span>
              </span>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                🥇 <span style={{ color: '#FFD700', fontWeight: 900 }}>{user.goldMedals || 0}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                🥈 <span style={{ color: '#C0C0C0', fontWeight: 900 }}>{user.silverMedals || 0}</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                🥉 <span style={{ color: '#CD7F32', fontWeight: 900 }}>{user.bronzeMedals || 0}</span>
              </span>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <span style={{ color: '#4E9F83' }}>
                Wins: <span style={{ color: '#ffffff', fontWeight: 900 }}>{user.wins || 0}</span>
              </span>
              <span style={{ color: '#D32231' }}>
                Losses: <span style={{ color: '#ffffff', fontWeight: 900 }}>{user.losses || 0}</span>
              </span>
            </div>
          );
        })()}

        {/* Challenge message text in Tomato Jam (Appears character by character) */}
        <h2
          style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#D32231', // Tomato Jam Red
            textShadow: '2px 2px 0px #000000',
            marginTop: '6px',
            marginBottom: '0',
            letterSpacing: '0.5px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0.45rem',
          }}
        >
          {(() => {
            const sentence = "Think you are smart enough? Wanna bet?";
            const words = sentence.split(' ');
            let cumulativeLength = 0;
            return words.map((word, wordIdx) => {
              const startIndex = cumulativeLength;
              cumulativeLength += word.length + 1;
              return (
                <span key={wordIdx} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                  {word.split('').map((char, charIdx) => {
                    const charGlobalIndex = startIndex + charIdx;
                    return (
                      <span
                        key={charIdx}
                        style={{
                          display: 'inline-block',
                          opacity: 0,
                          animation: `fadeInUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${charGlobalIndex * 0.045}s forwards`,
                        }}
                      >
                        {char}
                      </span>
                    );
                  })}
                </span>
              );
            });
          })()}
        </h2>
      </div>

      {/* ----------------------------------------------------
         MAIN DASHBOARD GRID (Two Primary Rectangles)
         ---------------------------------------------------- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '40px',
          width: '100%',
          alignItems: 'start',
        }}
      >
        {/* ====================================================
           COLUMN 1: CHOOSE COMPETITOR (RED RECTANGLE & FLOW)
           ==================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          {/* LEVEL 1: CHOOSE COMPETITOR (RED RECTANGLE - TOMATO JAM) */}
          <button
            onClick={() => handleMainChoiceClick('competitor')}
            style={{
              width: '100%',
              maxWidth: '340px',
              minHeight: '105px',
              backgroundColor: activeMainChoice === 'competitor' ? '#921824' : '#D32231', // Tomato Jam Red
              color: '#000000',
              border: '5px solid #000000',
              boxShadow: activeMainChoice === 'competitor' ? '4px 4px 0px #000000' : '8px 8px 0px #000000',
              transform: activeMainChoice === 'competitor' ? 'translate(4px, 4px)' : 'translate(0px, 0px)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 20px',
              textAlign: 'center',
              fontSize: '1.75rem',
              fontWeight: 800,
              transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            onMouseEnter={(e) => {
              if (activeMainChoice !== 'competitor') {
                e.currentTarget.style.transform = 'translate(-3px, -3px)';
                e.currentTarget.style.boxShadow = '11px 11px 0px #000000';
              }
            }}
            onMouseLeave={(e) => {
              if (activeMainChoice !== 'competitor') {
                e.currentTarget.style.transform = 'translate(0px, 0px)';
                e.currentTarget.style.boxShadow = '8px 8px 0px #000000';
              }
            }}
          >
            Choose Competitor
          </button>

          {/* LEVEL 2 & 3: MULTIPLAYER COLUMN (LEFT) & V/S AI COLUMN (RIGHT) */}
          {activeMainChoice === 'competitor' && (
            <div
              style={{
                display: 'flex',
                gap: '32px',
                alignItems: 'flex-start',
                justifyContent: 'center',
                marginTop: '10px',
                animation: 'fadeInUp 0.3s ease-out forwards',
              }}
            >
              {/* ----------------------------------------------------
                 PARENT BUTTON 1: MULTIPLAYER (RED DIAMOND) & ITS CHILDREN
                 ---------------------------------------------------- */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Parent Button: Multiplayer */}
                <div
                  onClick={() => handleSubChoiceClick('multiplayer')}
                  style={{
                    width: '102px',
                    height: '102px',
                    backgroundColor: activeSubChoice === 'multiplayer' ? '#921824' : '#D32231', // Tomato Jam
                    border: '4px solid #000000',
                    boxShadow: activeSubChoice === 'multiplayer' ? '2px 2px 0px #000000' : '5px 5px 0px #000000',
                    transform: activeSubChoice === 'multiplayer' ? 'rotate(45deg) scale(0.95)' : 'rotate(45deg)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    margin: '12px',
                  }}
                >
                  <span
                    style={{
                      transform: 'rotate(-45deg)',
                      color: '#000000',
                      fontWeight: 900,
                      fontSize: '0.85rem',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      lineHeight: 1.1,
                    }}
                  >
                    Multiplayer
                  </span>
                </div>

                {/* Level 3 Children for Multiplayer: Bottom-Left (Create Room) & Bottom-Right (Join Room) */}
                {activeSubChoice === 'multiplayer' && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '6px',
                      animation: 'fadeInUp 0.3s ease-out forwards',
                    }}
                  >
                    {/* Bottom-Left Child: Create Room (Red Diamond) */}
                    <div
                      onClick={handleCreateRoom}
                      style={{
                        width: '84px',
                        height: '84px',
                        backgroundColor: activeRoomAction === 'create' ? '#921824' : '#D32231',
                        border: '4px solid #000000',
                        boxShadow: activeRoomAction === 'create' ? '2px 2px 0px #000000' : '5px 5px 0px #000000',
                        transform: 'rotate(45deg)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        margin: '8px',
                      }}
                    >
                      <span
                        style={{
                          transform: 'rotate(-45deg)',
                          color: '#000000',
                          fontWeight: 900,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          textAlign: 'center',
                          lineHeight: 1.1,
                        }}
                      >
                        Create room
                      </span>
                    </div>

                    {/* Bottom-Right Child: Join Room (Green Circle) */}
                    <div
                      onClick={handleOpenJoinModal}
                      style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '50%',
                        backgroundColor: activeRoomAction === 'join' ? '#145A32' : '#1E824C',
                        border: '4px solid #000000',
                        boxShadow: activeRoomAction === 'join' ? '2px 2px 0px #000000' : '5px 5px 0px #000000',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span
                        style={{
                          color: '#000000',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          textAlign: 'center',
                          lineHeight: 1.1,
                        }}
                      >
                        Join room
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ----------------------------------------------------
                 PARENT BUTTON 2: V/S AI (GREEN CIRCLE) & ITS CHILDREN
                 ---------------------------------------------------- */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Parent Button: V/S AI */}
                <div
                  onClick={() => handleSubChoiceClick('ai')}
                  style={{
                    width: '102px',
                    height: '102px',
                    borderRadius: '50%',
                    backgroundColor: activeSubChoice === 'ai' ? '#145A32' : '#1E824C', // Green
                    border: '4px solid #000000',
                    boxShadow: activeSubChoice === 'ai' ? '2px 2px 0px #000000' : '5px 5px 0px #000000',
                    transform: activeSubChoice === 'ai' ? 'scale(0.95)' : 'scale(1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    margin: '12px',
                  }}
                >
                  <span
                    style={{
                      color: '#000000',
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      lineHeight: 1.1,
                    }}
                  >
                    V/S AI
                  </span>
                </div>

                {/* Level 3 Children for V/S AI: Directly underneath V/S AI button */}
                {activeSubChoice === 'ai' && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '6px',
                      animation: 'fadeInUp 0.3s ease-out forwards',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 900,
                        color: '#FFD700',
                        textShadow: '2px 2px 0px #000000',
                        letterSpacing: '1px',
                      }}
                    >
                      V/S
                    </span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {[1, 2, 3].map((num) => {
                        // Background colors: 2 = Tomato Jam (#D32231), 1 & 3 = Green Circle Color (#1E824C)
                        const bgColor =
                          num === 2
                            ? (activeAiCount === num ? '#921824' : '#D32231')
                            : (activeAiCount === num ? '#145A32' : '#1E824C');

                        return (
                          <button
                            key={num}
                            onClick={() => handleSelectAiCount(num)}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              backgroundColor: bgColor,
                              color: '#000000',
                              border: activeAiCount === num ? '3.5px solid #FFD700' : '3.5px solid #000000',
                              boxShadow: activeAiCount === num ? '2px 2px 0px #000000' : '4px 4px 0px #000000',
                              transform: activeAiCount === num ? 'translate(2px, 2px) scale(0.95)' : 'translate(0px, 0px)',
                              fontSize: '1.25rem',
                              fontWeight: 900,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ====================================================
           COLUMN 2: CREATE CUSTOM QUIZ (GREEN RECTANGLE & PAGE)
           ==================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* LEVEL 1: CREATE CUSTOM QUIZ (GREEN RECTANGLE) */}
          <button
            onClick={() => handleMainChoiceClick('custom')}
            style={{
              width: '100%',
              maxWidth: '340px',
              minHeight: '110px',
              backgroundColor: activeMainChoice === 'custom' ? '#145A32' : '#1E824C', // Green
              color: '#000000',
              border: '5px solid #000000',
              boxShadow: activeMainChoice === 'custom' ? '4px 4px 0px #000000' : '8px 8px 0px #000000',
              transform: activeMainChoice === 'custom' ? 'translate(4px, 4px)' : 'translate(0px, 0px)',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 20px',
              textAlign: 'center',
              fontSize: '1.75rem',
              fontWeight: 800,
              transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            onMouseEnter={(e) => {
              if (activeMainChoice !== 'custom') {
                e.currentTarget.style.transform = 'translate(-3px, -3px)';
                e.currentTarget.style.boxShadow = '11px 11px 0px #000000';
              }
            }}
            onMouseLeave={(e) => {
              if (activeMainChoice !== 'custom') {
                e.currentTarget.style.transform = 'translate(0px, 0px)';
                e.currentTarget.style.boxShadow = '8px 8px 0px #000000';
              }
            }}
          >
            Create Custom Quiz
          </button>

          {/* CUSTOM QUIZ CREATOR MODAL OVERLAY */}
          {activeMainChoice === 'custom' && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(8, 19, 34, 0.88)',
                backdropFilter: 'blur(10px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '24px 16px 64px 16px',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                boxSizing: 'border-box'
              }}
            >
              <CustomQuizCreator
                user={user}
                onCreateRoom={handleCreateCustomRoom}
                onCancel={() => setActiveMainChoice(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------
         INLINE EDIT PROFILE MODAL (PASSWORD AUTHENTICATED)
         ---------------------------------------------------- */}
      {showProfileModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(8, 19, 34, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#081322',
              color: '#ffffff',
              border: '6px solid #000000',
              boxShadow: '12px 12px 0px #000000',
              borderRadius: '24px',
              padding: '28px',
              position: 'relative',
              animation: 'fadeInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          >
            {/* Close Modal X Button */}
            <button
              onClick={() => setShowProfileModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                backgroundColor: '#D32231',
                color: '#ffffff',
                border: '3px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 800,
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <X size={20} />
            </button>

            {/* STEP 1: PASSWORD AUTHENTICATION */}
            {profileEditStep === 'auth' && (
              <form onSubmit={handlePasswordAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#32715C',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '4px solid #000000',
                      boxShadow: '4px 4px 0px #000000',
                      marginBottom: '12px',
                    }}
                  >
                    <Lock size={28} />
                  </div>
                  <h2 style={{ fontSize: '1.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.5px', margin: 0 }}>
                    Security Check
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: '#4E9F83', marginTop: '6px', fontWeight: 700 }}>
                    Please enter your password to edit profile settings.
                  </p>
                </div>

                {authError && (
                  <div
                    style={{
                      backgroundColor: '#D32231',
                      color: '#ffffff',
                      border: '3px solid #000000',
                      boxShadow: '4px 4px 0px #000000',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      textAlign: 'center'
                    }}
                  >
                    {authError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.5px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showAuthPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter account password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 46px 12px 14px',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#ffffff',
                        backgroundColor: '#0b192c',
                        border: '4px solid #000000',
                        borderRadius: '12px',
                        outline: 'none',
                        boxShadow: '4px 4px 0px #000000',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPassword(!showAuthPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#4E9F83',
                      }}
                    >
                      {showAuthPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
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
                  {authLoading ? 'Verifying...' : 'Verify Password'}
                </button>
              </form>
            )}

            {/* STEP 2: PROFILE EDIT FORM (AFTER AUTHENTICATION) */}
            {profileEditStep === 'edit' && (
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: '1.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.5px', margin: 0 }}>
                    Edit Profile
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: '#4E9F83', marginTop: '6px', fontWeight: 700 }}>
                    Update your player name and avatar
                  </p>
                </div>

                {saveError && (
                  <div
                    style={{
                      backgroundColor: '#D32231',
                      color: '#ffffff',
                      border: '3px solid #000000',
                      boxShadow: '4px 4px 0px #000000',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      textAlign: 'center'
                    }}
                  >
                    {saveError}
                  </div>
                )}

                {saveSuccessMsg && (
                  <div
                    style={{
                      backgroundColor: '#32715C',
                      color: '#ffffff',
                      border: '3px solid #000000',
                      boxShadow: '4px 4px 0px #000000',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      textAlign: 'center'
                    }}
                  >
                    {saveSuccessMsg}
                  </div>
                )}

                {/* Player Name Field */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.5px' }}>
                    Player Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Player Name"
                    value={editPlayerName}
                    onChange={(e) => setEditPlayerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      backgroundColor: '#0b192c',
                      border: '4px solid #000000',
                      borderRadius: '12px',
                      outline: 'none',
                      boxShadow: '4px 4px 0px #000000',
                    }}
                  />
                </div>

                {/* Avatar Selection Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.5px' }}>
                    Select Avatar
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '10px',
                      backgroundColor: '#0b192c',
                      padding: '12px',
                      borderRadius: '16px',
                      border: '4px solid #000000',
                      boxShadow: '4px 4px 0px #000000',
                    }}
                  >
                    {AVATARS.map((avatar) => {
                      const isSelected = editAvatarUrl === avatar.url;
                      return (
                        <div
                          key={avatar.id}
                          onClick={() => setEditAvatarUrl(avatar.url)}
                          style={{
                            position: 'relative',
                            aspectRatio: '1',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: isSelected ? '4px solid #32715C' : '3px solid #000000',
                            boxShadow: isSelected ? '0 0 12px rgba(50, 113, 92, 0.8), 4px 4px 0px #000000' : '3px 3px 0px #000000',
                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                            backgroundColor: '#ffffff',
                          }}
                        >
                          <img
                            src={avatar.url}
                            alt={avatar.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '3px',
                                right: '3px',
                                backgroundColor: '#32715C',
                                color: '#fff',
                                borderRadius: '50%',
                                width: '22px',
                                height: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #000000',
                              }}
                            >
                              <Check size={14} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saveLoading}
                  style={{
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
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
                  <Sparkles size={20} />
                  {saveLoading ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* JOIN ROOM CODE INPUT MODAL */}
      <JoinRoomModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinRoomSubmit}
        errorMessage={joinError}
      />

      {/* KICKED OR ALREADY IN GAME POPUP MODAL */}
      {kickedModalMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(8, 19, 34, 0.75)',
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
              backgroundColor: '#081322',
              color: '#ffffff',
              border: '6px solid #000000',
              boxShadow: '12px 12px 0px #000000',
              borderRadius: '24px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px',
              animation: 'fadeInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
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
              <UserMinus size={28} />
            </div>

            <h3 style={{ fontSize: '1.65rem', fontWeight: 900, textTransform: 'uppercase', margin: 0, color: '#ffffff', letterSpacing: '0.5px' }}>
              Notice
            </h3>

            <p style={{ fontSize: '1.05rem', color: '#ff4d4d', fontWeight: 800, margin: 0 }}>
              {kickedModalMessage}
            </p>

            <button
              onClick={() => setKickedModalMessage('')}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#32715C',
                color: '#ffffff',
                border: '4px solid #000000',
                boxShadow: '5px 5px 0px #000000',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '1rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginTop: '6px',
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
              Understand
            </button>
          </div>
        </div>
      )}

      {/* VS AI BOT CUSTOMIZATION & NAMING MODAL */}
      {showAiCustomizationModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(10px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '90vw',
              maxWidth: '520px',
              height: '520px',
              backgroundColor: '#081322',
              color: '#ffffff',
              border: '6px solid #000000',
              boxShadow: '10px 10px 0px #000000',
              borderRadius: '50%',
              padding: '40px 45px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              position: 'relative',
              boxSizing: 'border-box',
              animation: 'fadeInUp 0.3s ease-out forwards'
            }}
          >
            <button
              onClick={() => setShowAiCustomizationModal(false)}
              style={{
                position: 'absolute',
                top: '32px',
                right: '32px',
                backgroundColor: '#D32231',
                color: '#ffffff',
                border: '3.5px solid #000000',
                borderRadius: '4px',
                width: '38px',
                height: '38px',
                transform: 'rotate(45deg)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                boxShadow: '2px 2px 0px #000000',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(45deg) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(45deg) scale(1.0)';
              }}
            >
              <div style={{ transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </div>
            </button>

            <div style={{ textAlign: 'center', maxWidth: '340px' }}>
              <h2
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: '#FFD700',
                  textShadow: '3px 3px 0px #000000',
                  margin: '0 0 4px 0',
                  textTransform: 'uppercase'
                }}
              >
                🤖 Name Your AI Competitors
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#4E9F83', margin: 0, fontWeight: 700 }}>
                Competing against {activeAiCount} AI Bot{activeAiCount > 1 ? 's' : ''} (No XP or Medals awarded)
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '80%', maxWidth: '310px' }}>
              {Array.from({ length: activeAiCount }).map((_, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase' }}>
                    AI Bot #{idx + 1} Name:
                  </label>
                  <input
                    type="text"
                    value={aiBotNames[idx] || ''}
                    onChange={(e) => {
                      const updated = [...aiBotNames];
                      updated[idx] = e.target.value;
                      setAiBotNames(updated);
                    }}
                    placeholder={`e.g. Bot ${idx + 1}`}
                    maxLength={16}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0b192c',
                      color: '#ffffff',
                      border: '3px solid #000000',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleStartAiGameSubmit}
              style={{
                width: '105px',
                height: '105px',
                borderRadius: '50%',
                backgroundColor: '#1E824C',
                color: '#000000',
                border: '4px solid #000000',
                boxShadow: '4px 4px 0px #000000',
                fontWeight: 900,
                fontSize: '0.95rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '10px',
                lineHeight: 1.2,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.boxShadow = '6px 6px 0px #000000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '4px 4px 0px #000000';
              }}
            >
              Begin match
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


