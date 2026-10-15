import React, { useState, useEffect, useRef } from 'react';
import { Award, Trophy, Medal, Clock, CheckCircle2, XCircle, Sparkles, Home } from 'lucide-react';
import confetti from 'canvas-confetti';
import CustomHostDashboard from './CustomHostDashboard';

export default function QuizPlayground({ socket, roomState, _user, onReturnToLobby }) {
  // Quiz Socket States
  const [quizPhase, setQuizPhase] = useState('loading'); // 'loading' | 'question' | 'reveal' | 'round_end' | 'game_over'
  const [currentRound, setCurrentRound] = useState(1);
  const [roundName, setRoundName] = useState('Easy');
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([]);
  const [genre, setGenre] = useState(roomState?.selectedGenre || 'Quiz');
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [loadingMessage, setLoadingMessage] = useState('Level 1 Loading...');

  // User Selection & Feedback States
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [answerFeedback, setAnswerFeedback] = useState(null); // { isCorrect, pointsEarned, speedBonus, totalScore, correctAnswerIndex, explanation }

  // Answer Reveal & Round End States
  const [revealData, setRevealData] = useState(null); // { correctAnswerIndex, explanation, answersSubmitted, leaderboard }
  const [roundEndData, setRoundEndData] = useState(null); // { roundNumber, eliminatedPlayer, survivingPlayers, leaderboard }
  const [gameOverData, setGameOverData] = useState(null); // { genre, standings }

  // Live Standings & Elimination State
  const [leaderboard, setLeaderboard] = useState(() => {
    if (roomState?.quizState?.scores && roomState?.players) {
      const scores = roomState.quizState.scores || {};
      const eliminated = roomState.quizState.eliminatedSockets || [];
      const eligiblePlayers = roomState.isCustomRoom
        ? roomState.players.filter(p => !p.isHostSpectator && !p.isHost)
        : roomState.players;

      return eligiblePlayers.map(p => ({
        socketId: p.socketId,
        name: p.name || 'Player',
        avatar: p.avatar || '/avatars/lion.png',
        score: scores[p.socketId] || 0,
        isEliminated: eliminated.includes(p.socketId)
      })).sort((a, b) => {
        if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
        return (b.score || 0) - (a.score || 0);
      });
    }
    return [];
  });

  const [eliminatedSockets, setEliminatedSockets] = useState(() => {
    return Array.isArray(roomState?.quizState?.eliminatedSockets) ? roomState.quizState.eliminatedSockets : [];
  });

  // Sync eliminatedSockets if roomState updates
  useEffect(() => {
    if (Array.isArray(roomState?.quizState?.eliminatedSockets) && roomState.quizState.eliminatedSockets.length > 0) {
      setEliminatedSockets(prev => Array.from(new Set([...prev, ...roomState.quizState.eliminatedSockets])));
    }
  }, [roomState?.quizState?.eliminatedSockets]);

  // Ticking Audio Reference for last 5s
  const tickAudioRef = useRef(null);
  const tickTriggeredRef = useRef({});

  const stopTickingAudio = () => {
    if (tickAudioRef.current) {
      try {
        tickAudioRef.current.pause();
        tickAudioRef.current.currentTime = 0;
      } catch (err) {}
    }
  };

  useEffect(() => {
    const audio = new Audio('/sounds/dragon-studio-slow-cinematic-clock-ticking-357979.mp3');
    audio.preload = 'auto';
    tickAudioRef.current = audio;

    return () => {
      stopTickingAudio();
    };
  }, []);

  // Ticking Sound Trigger for last 5 seconds (5s to 1s)
  useEffect(() => {
    if (quizPhase === 'question' && timeRemaining > 0 && timeRemaining <= 5) {
      if (!tickTriggeredRef.current[timeRemaining] && tickAudioRef.current) {
        tickTriggeredRef.current[timeRemaining] = true;
        try {
          tickAudioRef.current.currentTime = 0;
          tickAudioRef.current.play().catch(() => {});
        } catch {}
      }
    } else {
      stopTickingAudio();
    }
  }, [timeRemaining, quizPhase]);

  // Socket Listeners for Quiz Playground
  useEffect(() => {
    if (!socket) return;

    // 1. Loading Round
    const handleRoundLoading = ({ roundNumber, roundName, genre, message, leaderboard: lb, eliminatedSockets: elims }) => {
      stopTickingAudio();
      tickTriggeredRef.current = {};
      setQuizPhase('loading');
      setCurrentRound(roundNumber);
      setRoundName(roundName);
      if (genre) setGenre(genre);
      setLoadingMessage(message || `Level ${roundNumber} Loading...`);
      setSelectedOptionIndex(null);
      setAnswerFeedback(null);
      setRevealData(null);
      if (Array.isArray(lb) && lb.length > 0) setLeaderboard(lb);
      if (Array.isArray(elims)) setEliminatedSockets(elims);
    };

    // 2. Question Start
    const handleQuestionStart = ({ roundNumber, roundName, questionNumber, totalQuestions, questionText, options, timeLimit, genre, leaderboard: lb, eliminatedSockets: elims }) => {
      stopTickingAudio();
      tickTriggeredRef.current = {};
      setQuizPhase('question');
      setCurrentRound(roundNumber);
      setRoundName(roundName);
      setQuestionNumber(questionNumber);
      setTotalQuestions(totalQuestions || 5);
      setQuestionText(questionText);
      setOptions(options || []);
      setTimeRemaining(timeLimit || 20);
      if (genre) setGenre(genre);

      setSelectedOptionIndex(null);
      setAnswerFeedback(null);
      setRevealData(null);
      if (Array.isArray(lb) && lb.length > 0) setLeaderboard(lb);
      if (Array.isArray(elims)) setEliminatedSockets(elims);
    };

    // 3. Timer Tick
    const handleTimerTick = ({ questionTimer }) => {
      setTimeRemaining(questionTimer);
      if (questionTimer === 0) {
        stopTickingAudio();
      }
    };

    // 4. Answer Feedback (Private to answering socket)
    const handleAnswerFeedback = (feedback) => {
      setAnswerFeedback(feedback);
      if (feedback && feedback.totalScore !== undefined && socket?.id) {
        setLeaderboard(prev => {
          return prev.map(p => {
            if (p.socketId === socket.id) {
              return { ...p, score: feedback.totalScore };
            }
            return p;
          }).sort((a, b) => {
            if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
            return (b.score || 0) - (a.score || 0);
          });
        });
      }
    };

    // 5. Notice when another player answered
    const handlePlayerAnsweredNotice = ({ answeredCount, totalActivePlayers }) => {
    };

    // 6. Question Reveal
    const handleQuestionReveal = (data) => {
      stopTickingAudio();
      tickTriggeredRef.current = {};
      setQuizPhase('reveal');
      setRevealData(data);
      if (Array.isArray(data?.leaderboard) && data.leaderboard.length > 0) {
        setLeaderboard(data.leaderboard);
      }
      if (Array.isArray(data?.eliminatedSockets)) {
        setEliminatedSockets(data.eliminatedSockets);
      }
    };

    // 7. Round End (Elimination)
    const handleRoundEnd = (data) => {
      stopTickingAudio();
      tickTriggeredRef.current = {};
      setQuizPhase('round_end');
      setRoundEndData(data);
      if (Array.isArray(data?.leaderboard) && data.leaderboard.length > 0) {
        setLeaderboard(data.leaderboard);
      }
      if (Array.isArray(data?.eliminatedSockets)) {
        setEliminatedSockets(data.eliminatedSockets);
      } else if (data?.eliminatedPlayer?.socketId) {
        setEliminatedSockets(prev => Array.from(new Set([...prev, data.eliminatedPlayer.socketId])));
      }
    };

    // 8. Game Over (Podium & Final Standings)
    const handleGameOver = (data) => {
      stopTickingAudio();
      tickTriggeredRef.current = {};
      setQuizPhase('game_over');
      setGameOverData(data);

      // Trigger Confetti explosion for winners!
      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      }, 300);
    };

    const handleLeaderboardUpdate = ({ leaderboard: lb, eliminatedSockets: elims }) => {
      if (Array.isArray(lb)) setLeaderboard(lb);
      if (Array.isArray(elims)) setEliminatedSockets(elims);
    };

    socket.on('quiz_round_loading', handleRoundLoading);
    socket.on('quiz_question_start', handleQuestionStart);
    socket.on('quiz_timer_tick', handleTimerTick);
    socket.on('quiz_answer_feedback', handleAnswerFeedback);
    socket.on('player_answered_notice', handlePlayerAnsweredNotice);
    socket.on('quiz_question_reveal', handleQuestionReveal);
    socket.on('quiz_round_end', handleRoundEnd);
    socket.on('quiz_game_over', handleGameOver);
    socket.on('quiz_leaderboard_update', handleLeaderboardUpdate);

    return () => {
      stopTickingAudio();
      socket.off('quiz_round_loading', handleRoundLoading);
      socket.off('quiz_question_start', handleQuestionStart);
      socket.off('quiz_timer_tick', handleTimerTick);
      socket.off('quiz_answer_feedback', handleAnswerFeedback);
      socket.off('player_answered_notice', handlePlayerAnsweredNotice);
      socket.off('quiz_question_reveal', handleQuestionReveal);
      socket.off('quiz_round_end', handleRoundEnd);
      socket.off('quiz_game_over', handleGameOver);
      socket.off('quiz_leaderboard_update', handleLeaderboardUpdate);
    };
  }, [socket]);

  // Handle Option Select & Answer Submission
  const handleSelectOption = (index) => {
    if (selectedOptionIndex !== null || quizPhase !== 'question' || !socket || !roomState?.code) return;

    setSelectedOptionIndex(index);
    socket.emit('submit_quiz_answer', {
      roomCode: roomState.code,
      answerIndex: index
    });
  };

  // Determine if current player is eliminated and if host
  const isCurrentPlayerEliminated = (Boolean(socket?.id) && eliminatedSockets.includes(socket.id)) || 
                                    Boolean(roomState?.quizState?.eliminatedSockets?.includes(socket?.id));
  const mySocketId = socket?.id;
  const isHost = roomState?.players?.find(p => p.socketId === socket?.id)?.isHost || 
                 roomState?.hostSocketId === socket?.id || 
                 (roomState?.players?.length > 0 && roomState.players[0].socketId === socket?.id);

  // If this is a custom room and user is the host, render the Host Live Dashboard!
  const isHostSpectator = roomState?.isCustomRoom && (isHost || socket?.id === roomState?.hostSocketId);

  if (isHostSpectator) {
    return (
      <CustomHostDashboard
        socket={socket}
        roomState={roomState}
        onReturnToLobby={onReturnToLobby}
      />
    );
  }

  // Render 1: LOADING ROUND SCREEN
  if (quizPhase === 'loading') {
    return (
      <div
        style={{
          width: 'calc(100% - 24px)',
          maxWidth: '1240px',
          margin: '8px auto',
          minHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(8, 19, 34, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '6px solid #000000',
          borderRadius: '24px',
          boxShadow: '12px 12px 0px #000000',
          padding: '40px 24px',
          textAlign: 'center',
          color: '#ffffff',
          position: 'relative',
          zIndex: 10
        }}
      >
        <div
          style={{
            backgroundColor: '#D32231',
            color: '#ffffff',
            border: '4px solid #000000',
            boxShadow: '6px 6px 0px #000000',
            borderRadius: '16px',
            padding: '12px 28px',
            fontWeight: 900,
            fontSize: '1.4rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <Sparkles size={28} />
          <span>ROUND {currentRound}: {roundName.toUpperCase()} LEVEL</span>
        </div>

        <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: '12px 0', textShadow: '4px 4px 0px #000' }}>
          GENRE: <span style={{ color: '#FFD700' }}>{genre}</span>
        </h2>

        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4E9F83', marginTop: '16px' }}>
          {loadingMessage}
        </p>

        {/* Animated Loading Bar */}
        <div
          style={{
            width: '280px',
            height: '16px',
            backgroundColor: '#0b192c',
            border: '3px solid #000000',
            borderRadius: '10px',
            overflow: 'hidden',
            marginTop: '32px',
            position: 'relative'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#32715C',
              animation: 'loadingProgress 3s ease-in-out infinite'
            }}
          />
        </div>
        <style>{`
          @keyframes loadingProgress {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  // Render 2: FINAL GAME OVER & VICTORY PODIUM SCREEN
  if (quizPhase === 'game_over' && gameOverData) {
    const standings = gameOverData.standings || [];
    const isAiGame = gameOverData.isAiGame || roomState?.isAiGame;
    const isCustomRoom = gameOverData.isCustomRoom || roomState?.isCustomRoom;
    const winnerGold = standings[0];
    const winnerSilver = standings[1];
    const winnerBronze = standings[2];
    const isHumanWinner = winnerGold && winnerGold.socketId === mySocketId;

    return (
      <div
        style={{
          width: 'calc(100% - 24px)',
          maxWidth: '1240px',
          margin: '0 auto 32px auto',
          minHeight: 'auto',
          maxHeight: 'none',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'rgba(8, 19, 34, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '6px solid #000000',
          borderRadius: '24px',
          boxShadow: '12px 12px 0px #000000',
          padding: '24px 20px 40px 20px',
          color: '#ffffff',
          position: 'relative',
          zIndex: 10,
          boxSizing: 'border-box'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1
            style={{
              fontSize: '2.8rem',
              fontWeight: 900,
              color: '#FFD700',
              textShadow: '4px 4px 0px #000000',
              margin: '0',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            {isCustomRoom ? '🏆 CUSTOM QUIZ COMPLETED! 🏆' : isAiGame ? (isHumanWinner ? '🏆 YOU WON THE MATCH! 🏆' : '🤖 VS AI MATCH OVER! 🤖') : '🏆 QUIZ CHAMPIONS! 🏆'}
          </h1>
          <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4E9F83', marginTop: '6px' }}>
            Final Standings for <span style={{ color: '#D32231' }}>{genre}</span> Quiz
            {isCustomRoom && <span style={{ display: 'block', fontSize: '0.95rem', color: '#FFD700', marginTop: '4px', fontWeight: 900 }}>🏅 Top 3 contestants awarded medals! (Custom Match: 0 XP)</span>}
            {isAiGame && <span style={{ display: 'block', fontSize: '0.95rem', color: '#f59e0b', marginTop: '4px', fontWeight: 900 }}>⚠️ VS AI Mode: No XPs, Medals, or Level-ups awarded</span>}
          </p>
        </div>

        {/* VICTORY PODIUM DISPLAY */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '16px',
            width: '100%',
            maxWidth: '720px',
            margin: '12px 0 20px 0'
          }}
        >
          {/* 2nd Place */}
          {winnerSilver ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: '#E0E0E0',
                  border: '4px solid #000000',
                  boxShadow: '4px 4px 0px #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <img src={winnerSilver.avatar || '/avatars/panda.png'} alt={winnerSilver.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                {!isAiGame && (
                  <div style={{ position: 'absolute', top: '-10px', right: '-6px', backgroundColor: '#C0C0C0', border: '2px solid #000', borderRadius: '50%', padding: '3px' }}>
                    <Medal size={16} color="#000" />
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: '#C0C0C0', color: '#000000', border: '3px solid #000', padding: '3px 10px', borderRadius: '8px', fontWeight: 900, fontSize: '0.85rem' }}>
                2nd: {winnerSilver.name}
              </div>

              {/* Podium Pillar */}
              <div
                style={{
                  width: '100%',
                  height: '110px',
                  backgroundColor: '#9E9E9E',
                  border: '4px solid #000000',
                  boxShadow: '6px 6px 0px #000000',
                  borderRadius: '12px 12px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000',
                  fontWeight: 900
                }}
              >
                <span style={{ fontSize: '1.6rem' }}>2</span>
                <span style={{ fontSize: '1rem', color: '#000000' }}>{winnerSilver.score} pts</span>
                {isCustomRoom ? (
                  <span style={{ fontSize: '0.76rem', color: '#000000', backgroundColor: '#C0C0C0', padding: '2px 6px', borderRadius: '6px', marginTop: '3px', border: '1.5px solid #000' }}>🥈 SILVER</span>
                ) : !isAiGame ? (
                  <span style={{ fontSize: '0.76rem', color: '#1B5E20', backgroundColor: '#A5D6A7', padding: '2px 6px', borderRadius: '6px', marginTop: '3px', border: '1.5px solid #000' }}>+200 XP</span>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* 1st Place */}
          {winnerGold ? (
            <div
              style={{
                flex: 1.15,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  backgroundColor: '#FFF8E1',
                  border: '5px solid #D32231',
                  boxShadow: '6px 6px 0px #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <img src={winnerGold.avatar || '/avatars/lion.png'} alt={winnerGold.name} style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                {!isAiGame && (
                  <div style={{ position: 'absolute', top: '-12px', right: '-6px', backgroundColor: '#FFD700', border: '2.5px solid #000', borderRadius: '50%', padding: '4px' }}>
                    <Trophy size={18} color="#000" />
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: '#FFD700', color: '#000000', border: '3.5px solid #000', padding: '4px 14px', borderRadius: '10px', fontWeight: 900, fontSize: '1rem', boxShadow: '4px 4px 0px #000' }}>
                1st: {winnerGold.name}
              </div>

              {/* Podium Pillar */}
              <div
                style={{
                  width: '100%',
                  height: '145px',
                  backgroundColor: '#FFC107',
                  border: '4px solid #000000',
                  boxShadow: '6px 6px 0px #000000',
                  borderRadius: '12px 12px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000',
                  fontWeight: 900
                }}
              >
                <span style={{ fontSize: '2rem' }}>1</span>
                <span style={{ fontSize: '1.15rem', color: '#000000' }}>{winnerGold.score} pts</span>
                {isCustomRoom ? (
                  <span style={{ fontSize: '0.82rem', color: '#000000', backgroundColor: '#FFF59D', padding: '2px 8px', borderRadius: '6px', marginTop: '4px', border: '1.5px solid #000' }}>🏆 GOLD MEDAL</span>
                ) : !isAiGame ? (
                  <span style={{ fontSize: '0.82rem', color: '#1B5E20', backgroundColor: '#FFF59D', padding: '2px 8px', borderRadius: '6px', marginTop: '4px', border: '1.5px solid #000' }}>🏆 +300 XP</span>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: '#000000', backgroundColor: '#FFF59D', padding: '2px 8px', borderRadius: '6px', marginTop: '4px', border: '1.5px solid #000' }}>👑 WINNER</span>
                )}
              </div>
            </div>
          ) : null}

          {/* 3rd Place */}
          {winnerBronze ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: '#FFE0B2',
                  border: '4px solid #000000',
                  boxShadow: '4px 4px 0px #000000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <img src={winnerBronze.avatar || '/avatars/cat.svg'} alt={winnerBronze.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                {!isAiGame && (
                  <div style={{ position: 'absolute', top: '-10px', right: '-6px', backgroundColor: '#CD7F32', border: '2px solid #000', borderRadius: '50%', padding: '3px' }}>
                    <Award size={16} color="#fff" />
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: '#CD7F32', color: '#ffffff', border: '3px solid #000', padding: '3px 10px', borderRadius: '8px', fontWeight: 900, fontSize: '0.85rem' }}>
                3rd: {winnerBronze.name}
              </div>

              {/* Podium Pillar */}
              <div
                style={{
                  width: '100%',
                  height: '85px',
                  backgroundColor: '#A1887F',
                  border: '4px solid #000000',
                  boxShadow: '6px 6px 0px #000000',
                  borderRadius: '12px 12px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 900
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>3</span>
                <span style={{ fontSize: '0.95rem' }}>{winnerBronze.score} pts</span>
                {isCustomRoom ? (
                  <span style={{ fontSize: '0.72rem', color: '#000', backgroundColor: '#FFCC80', padding: '2px 5px', borderRadius: '5px', marginTop: '3px', border: '1.5px solid #000' }}>🥉 BRONZE</span>
                ) : !isAiGame ? (
                  <span style={{ fontSize: '0.72rem', color: '#000', backgroundColor: '#FFCC80', padding: '2px 5px', borderRadius: '5px', marginTop: '3px', border: '1.5px solid #000' }}>+100 XP</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Complete Leaderboard Table */}
        <div
          style={{
            width: '100%',
            maxWidth: '680px',
            backgroundColor: '#0b192c',
            border: '4px solid #000000',
            boxShadow: '6px 6px 0px #000000',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px'
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, textTransform: 'uppercase', color: '#4E9F83', margin: '0 0 10px 0', textAlign: 'center' }}>
            {isCustomRoom ? 'Contestant Standings' : isAiGame ? 'Final Positions' : 'Full Scoreboard & Rewards'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
            {standings.map((p) => {
              const isMe = p.socketId === mySocketId;
              return (
                <div
                  key={p.socketId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isMe ? '#16382C' : '#1E293B',
                    border: isMe ? '3px solid #4E9F83' : '2px solid #000',
                    borderRadius: '10px',
                    padding: '8px 14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 900, fontSize: '1rem', width: '24px', color: '#FFD700' }}>
                      #{p.rank}
                    </span>
                    <img src={p.avatar || '/avatars/lion.png'} alt={p.name} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #000' }} />
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{p.name} {isMe && '(You)'}</span>
                    {p.medal === 'gold' && <span>🥇</span>}
                    {p.medal === 'silver' && <span>🥈</span>}
                    {p.medal === 'bronze' && <span>🥉</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#ffffff' }}>{p.score} pts</span>
                    {isCustomRoom ? (
                      p.rank <= 3 ? (
                        <span style={{ backgroundColor: '#32715C', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', border: '1.5px solid #000' }}>
                          MEDAL
                        </span>
                      ) : (
                        <span style={{ color: '#888', fontWeight: 700, fontSize: '0.8rem' }}>0 XP</span>
                      )
                    ) : !isAiGame ? (
                      <span style={{ backgroundColor: '#D32231', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem', border: '1.5px solid #000' }}>
                        +{p.xpEarned} XP
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onReturnToLobby}
          style={{
            backgroundColor: '#D32231',
            color: '#ffffff',
            border: '4px solid #000000',
            boxShadow: '6px 6px 0px #000000',
            borderRadius: '14px',
            padding: '12px 28px',
            fontWeight: 900,
            fontSize: '1.1rem',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-2px, -2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translate(0px, 0px)')}
        >
          <Home size={20} />
          Back to Lobby
        </button>
      </div>
    );
  }

  // Render 3: ROUND END / ELIMINATION MODAL OVERLAY
  const renderRoundEndModal = () => {
    if (quizPhase !== 'round_end' || !roundEndData) return null;
    const { roundNumber, eliminatedPlayer, nextRoundNumber, isHumanEliminated } = roundEndData;

    if (isHumanEliminated) {
      return (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
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
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#0F172A',
              color: '#ffffff',
              border: '6px solid #D32231',
              boxShadow: '12px 12px 0px #000000',
              borderRadius: '24px',
              padding: '32px',
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
                backgroundColor: '#D32231',
                color: '#ffffff',
                border: '3px solid #000000',
                boxShadow: '4px 4px 0px #000000',
                borderRadius: '12px',
                padding: '6px 18px',
                fontWeight: 900,
                fontSize: '1rem',
                textTransform: 'uppercase'
              }}
            >
              ELIMINATED IN ROUND {roundNumber}
            </div>

            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#D32231', margin: 0 }}>
              YOU HAVE BEEN ELIMINATED!
            </h2>

            <p style={{ fontSize: '1.05rem', color: '#cbd5e1', margin: 0, fontWeight: 700 }}>
              You scored the lowest points in Round {roundNumber} ({eliminatedPlayer?.score || 0} pts).
            </p>

            <p style={{ fontSize: '0.92rem', color: '#FFD700', margin: 0, fontWeight: 800 }}>
              The game ends here for VS AI mode.
            </p>

            <button
              onClick={onReturnToLobby}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#D32231',
                color: '#ffffff',
                border: '4px solid #000000',
                boxShadow: '5px 5px 0px #000000',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '1.1rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginTop: '10px'
              }}
            >
              Back to Lobby
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
            maxWidth: '480px',
            backgroundColor: '#0F172A',
            color: '#ffffff',
            border: '6px solid #000000',
            boxShadow: '12px 12px 0px #000000',
            borderRadius: '24px',
            padding: '32px',
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
              backgroundColor: '#D32231',
              color: '#ffffff',
              border: '3px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              borderRadius: '12px',
              padding: '6px 18px',
              fontWeight: 900,
              fontSize: '1rem',
              textTransform: 'uppercase'
            }}
          >
            END OF ROUND {roundNumber}
          </div>

          {eliminatedPlayer ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#FAF6F0', border: '4px solid #D32231', overflow: 'hidden' }}>
                <img src={eliminatedPlayer.avatar || '/avatars/lion.png'} alt={eliminatedPlayer.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

              <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#D32231', margin: 0 }}>
                {eliminatedPlayer.name} ELIMINATED!
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#cbd5e1', margin: 0, fontWeight: 700 }}>
                Lowest score in Round {roundNumber} ({eliminatedPlayer.score} pts)
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4E9F83' }}>
              All players survived Round {roundNumber}!
            </p>
          )}

          <div style={{ marginTop: '12px', padding: '12px 20px', backgroundColor: '#1E293B', border: '3px solid #000', borderRadius: '12px', width: '100%' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFD700' }}>
              Get ready for Round {nextRoundNumber}! Loading questions...
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render 4: MAIN QUIZ PLAYGROUND (ACTIVE QUESTION & REVEAL PHASES)
  // Compute accurate live standings: active players first sorted by score descending, then eliminated players sorted by score
  const displayLeaderboard = (() => {
    let list = [];
    if (Array.isArray(leaderboard) && leaderboard.length > 0) {
      list = [...leaderboard];
    } else if (roomState?.quizState?.scores && roomState?.players) {
      const scores = roomState.quizState.scores || {};
      const eligiblePlayers = roomState.isCustomRoom
        ? roomState.players.filter(p => !p.isHostSpectator && !p.isHost)
        : roomState.players;

      list = eligiblePlayers.map(p => ({
        socketId: p.socketId,
        name: p.name || 'Player',
        avatar: p.avatar || '/avatars/lion.png',
        score: scores[p.socketId] || 0,
        isEliminated: eliminatedSockets.includes(p.socketId)
      }));
    }

    // Enrich with latest elimination status
    const enriched = list.map(p => {
      const isElim = Boolean(p.isEliminated || eliminatedSockets.includes(p.socketId));
      return {
        ...p,
        isEliminated: isElim
      };
    });

    // Sort: Active players first (by score descending), then eliminated players (by score descending)
    enriched.sort((a, b) => {
      if (a.isEliminated !== b.isEliminated) {
        return a.isEliminated ? 1 : -1;
      }
      if ((b.score || 0) !== (a.score || 0)) {
        return (b.score || 0) - (a.score || 0);
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    return enriched;
  })();

  const activeContestants = displayLeaderboard.filter(p => !p.isEliminated);
  const eliminatedContestants = displayLeaderboard.filter(p => p.isEliminated);

  return (
    <div
      className="quiz-playground-container"
      style={{
        width: 'calc(100% - 32px)',
        maxWidth: '1380px',
        margin: '8px auto',
        minHeight: '88vh',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 10,
        padding: '20px 24px',
        backgroundColor: 'rgba(8, 19, 34, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '6px solid #000000',
        borderRadius: '24px',
        boxShadow: '12px 12px 0px #000000',
        boxSizing: 'border-box',
        gap: '20px'
      }}
    >
      {/* Round End Modal Overlay */}
      {renderRoundEndModal()}

      {/* ----------------------------------------------------
         LEFT MAIN PLAYGROUND (HEADER, TIMER, QUESTION & OPTIONS)
         ---------------------------------------------------- */}
      <div
        style={{
          flex: '1 1 740px',
          minWidth: '320px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        {/* TOP BAR: ROUND BADGE, GENRE & 15s TIMER */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          {/* Round & Question Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                backgroundColor: '#D32231',
                color: '#ffffff',
                border: '3px solid #000000',
                boxShadow: '4px 4px 0px #000000',
                borderRadius: '12px',
                padding: '6px 14px',
                fontWeight: 900,
                fontSize: '0.92rem',
                textTransform: 'uppercase'
              }}
            >
              Round {currentRound}: {roundName}
            </div>

            <div
              style={{
                backgroundColor: '#32715C',
                color: '#ffffff',
                border: '3px solid #000000',
                boxShadow: '4px 4px 0px #000000',
                borderRadius: '12px',
                padding: '6px 14px',
                fontWeight: 900,
                fontSize: '0.92rem'
              }}
            >
              Q {questionNumber} / {totalQuestions}
            </div>
          </div>

          {/* Genre Badge */}
          <div
            style={{
              backgroundColor: '#0b192c',
              color: '#FFD700',
              border: '3px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              borderRadius: '12px',
              padding: '6px 16px',
              fontWeight: 900,
              fontSize: '0.95rem'
            }}
          >
            Genre: {genre}
          </div>

          {/* 15-Second Digital Timer Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: timeRemaining <= 5 ? '#D32231' : '#0b192c',
              color: '#ffffff',
              border: timeRemaining <= 5 ? '3px solid #ff4d4d' : '3px solid #000000',
              boxShadow: timeRemaining <= 5 ? '0 0 16px rgba(211,34,49,0.8), 4px 4px 0px #000' : '4px 4px 0px #000000',
              borderRadius: '12px',
              padding: '6px 16px',
              fontSize: '1.05rem',
              fontWeight: 900,
              transition: 'all 0.2s ease',
              animation: timeRemaining <= 5 ? 'pulseTimer 0.5s ease-in-out infinite alternate' : 'none'
            }}
          >
            <Clock size={18} color={timeRemaining <= 5 ? '#ffffff' : '#D32231'} />
            <span>00:{String(timeRemaining).padStart(2, '0')}</span>
          </div>
          <style>{`
            @keyframes pulseTimer {
              0% { transform: scale(1); }
              100% { transform: scale(1.06); }
            }
          `}</style>
        </div>

        {/* Spectator Warning Banner for Eliminated Players */}
        {isCurrentPlayerEliminated && (
          <div
            style={{
              width: '100%',
              backgroundColor: 'rgba(211, 34, 49, 0.95)',
              color: '#ffffff',
              border: '3px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              borderRadius: '12px',
              padding: '10px 18px',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>👁️</span>
              <span>You are spectating this match (Eliminated in a previous round)</span>
            </div>
            <button
              onClick={onReturnToLobby}
              style={{
                backgroundColor: '#FAF6F0',
                color: '#D32231',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000',
                borderRadius: '8px',
                padding: '4px 12px',
                fontWeight: 900,
                fontSize: '0.8rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                flexShrink: 0
              }}
            >
              Exit to Lobby
            </button>
          </div>
        )}

        {/* ----------------------------------------------------
           QUESTION TEXT CARD
           ---------------------------------------------------- */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#FAF6F0',
            color: '#000000',
            border: '5px solid #000000',
            boxShadow: '8px 8px 0px #000000',
            borderRadius: '20px',
            padding: '24px 28px',
            margin: '8px 0 20px 0',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 900, textTransform: 'uppercase', color: '#32715C', letterSpacing: '1px' }}>
            Question {questionNumber} of {totalQuestions}
          </span>

          <h2
            style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              margin: '8px 0 0 0',
              lineHeight: 1.3,
              color: '#081322'
            }}
          >
            {questionText || 'Loading question...'}
          </h2>
        </div>

        {/* ----------------------------------------------------
           OPTIONS GRID (2x2)
           ---------------------------------------------------- */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
            marginBottom: '16px'
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = selectedOptionIndex === idx;
            const isRevealPhase = quizPhase === 'reveal' && revealData;
            const isCorrectOption = isRevealPhase && Number(revealData.correctAnswerIndex) === idx;
            const isWrongSelected = isRevealPhase && isSelected && !isCorrectOption;

            let bgColor = '#0b192c';
            let textColor = '#ffffff';
            let borderColor = '#000000';
            let borderWidth = '4px';
            let boxShadowStyle = isSelected ? '2px 2px 0px #000000' : '6px 6px 0px #000000';

            if (isRevealPhase) {
              if (isCorrectOption) {
                // Correct option highlighted in vivid green with green border for everyone
                bgColor = '#1E824C';
                textColor = '#ffffff';
                borderColor = '#22C55E';
                borderWidth = '5px';
                boxShadowStyle = '0 0 20px rgba(34, 197, 94, 0.9), 6px 6px 0px #000000';
              } else if (isWrongSelected) {
                // Selected wrong option turns vivid red
                bgColor = '#D32231';
                textColor = '#ffffff';
                borderColor = '#000000';
              }
            } else if (isSelected) {
              bgColor = '#32715C'; // Selected State Teal
              textColor = '#ffffff';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(idx)}
                disabled={selectedOptionIndex !== null || quizPhase !== 'question' || isCurrentPlayerEliminated}
                style={{
                  width: '100%',
                  minHeight: '65px',
                  backgroundColor: bgColor,
                  color: textColor,
                  border: `${borderWidth} solid ${borderColor}`,
                  boxShadow: boxShadowStyle,
                  transform: isSelected ? 'translate(3px, 3px)' : 'translate(0px, 0px)',
                  borderRadius: '14px',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontWeight: 800,
                  fontSize: '1.02rem',
                  textAlign: 'left',
                  cursor: (selectedOptionIndex !== null || quizPhase !== 'question' || isCurrentPlayerEliminated) ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none'
                }}
                onMouseEnter={(e) => {
                  if (selectedOptionIndex === null && quizPhase === 'question' && !isCurrentPlayerEliminated) {
                    e.currentTarget.style.transform = 'translate(-2px, -2px)';
                    e.currentTarget.style.boxShadow = '8px 8px 0px #000000';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedOptionIndex === null && quizPhase === 'question' && !isCurrentPlayerEliminated) {
                    e.currentTarget.style.transform = 'translate(0px, 0px)';
                    e.currentTarget.style.boxShadow = '6px 6px 0px #000000';
                  }
                }}
              >
                {/* Option Letter Pill (A, B, C, D) */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isCorrectOption ? '#FAF6F0' : '#FAF6F0',
                    color: '#000000',
                    border: '2px solid #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    flexShrink: 0
                  }}
                >
                  {String.fromCharCode(65 + idx)}
                </div>

                <span style={{ flex: 1, wordBreak: 'break-word' }}>{opt}</span>

                {isCorrectOption && <CheckCircle2 size={22} color="#ffffff" />}
                {isWrongSelected && <XCircle size={22} color="#ffffff" />}
              </button>
            );
          })}
        </div>

        {/* EXPLANATION BOX ON REVEAL */}
        {quizPhase === 'reveal' && revealData && (
          <div
            style={{
              width: '100%',
              backgroundColor: '#0b192c',
              color: '#ffffff',
              border: '4px solid #000000',
              boxShadow: '6px 6px 0px #000000',
              borderRadius: '14px',
              padding: '14px 20px',
              marginTop: '4px',
              animation: 'fadeInUp 0.3s ease forwards'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4E9F83', fontWeight: 900, fontSize: '0.92rem', marginBottom: '4px' }}>
              <Sparkles size={18} />
              <span>EXPLANATION:</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4 }}>
              {revealData.explanation}
            </p>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
         RIGHT SIDEBAR: LIVE SCOREBOARD & PLAYERS STATUS
         ---------------------------------------------------- */}
      <div
        style={{
          width: '320px',
          minWidth: '280px',
          flex: '0 0 320px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(50, 113, 92, 0.35)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '4px solid #000000',
          borderRadius: '20px',
          boxShadow: '4px 4px 0px #000000',
          padding: '16px',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '10px',
            borderBottom: '3px solid #000000',
            color: '#ffffff',
            marginBottom: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={20} color="#FFD700" />
            <span style={{ fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live Standings
            </span>
          </div>

          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 900,
              backgroundColor: '#0b192c',
              color: '#4E9F83',
              border: '1.5px solid #000000',
              padding: '2px 8px',
              borderRadius: '8px'
            }}
          >
            {activeContestants.length} Active
          </span>
        </div>

        {/* Players Scoreboard List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, maxHeight: '470px' }}>
          {/* Active Contestants */}
          {activeContestants.map((p) => {
            const isMe = p.socketId === mySocketId;
            // Rank calculated based on number of active players with higher score
            const rank = activeContestants.filter(other => (other.score || 0) > (p.score || 0)).length + 1;

            return (
              <div
                key={p.socketId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: isMe ? '#16382C' : '#0B192C',
                  color: '#ffffff',
                  border: isMe ? '3px solid #4E9F83' : '2px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: '12px',
                  padding: '8px 10px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  {/* Position Badge */}
                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: '0.88rem',
                      width: '24px',
                      color: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#4E9F83',
                      flexShrink: 0,
                      textAlign: 'center'
                    }}
                  >
                    #{rank}
                  </span>

                  <img
                    src={p.avatar || '/avatars/lion.png'}
                    alt={p.name}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#FAF6F0',
                      border: '2px solid #000000',
                      flexShrink: 0
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: isMe ? '#4E9F83' : '#ffffff'
                        }}
                      >
                        {p.name}
                      </span>
                      {isMe && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#FFD700', flexShrink: 0 }}>
                          (You)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: '0.88rem',
                      color: '#FFD700',
                      textShadow: '1px 1px 0px #000'
                    }}
                  >
                    {p.score || 0} pts
                  </span>

                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: '0.72rem',
                      backgroundColor: '#1E824C',
                      color: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      border: '1.5px solid #000',
                      letterSpacing: '0.5px'
                    }}
                  >
                    ACTIVE
                  </span>
                </div>
              </div>
            );
          })}

          {/* Eliminated Players Section Divider */}
          {eliminatedContestants.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '8px 0 2px 0'
              }}
            >
              <div style={{ flex: 1, height: '1.5px', backgroundColor: 'rgba(211, 34, 49, 0.5)' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Eliminated
              </span>
              <div style={{ flex: 1, height: '1.5px', backgroundColor: 'rgba(211, 34, 49, 0.5)' }} />
            </div>
          )}

          {/* Eliminated Players */}
          {eliminatedContestants.map((p) => {
            const isMe = p.socketId === mySocketId;

            return (
              <div
                key={p.socketId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  color: '#94a3b8',
                  border: '2px solid rgba(211, 34, 49, 0.5)',
                  borderRadius: '12px',
                  padding: '7px 10px',
                  opacity: 0.7,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  {/* OUT Badge */}
                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: '0.72rem',
                      width: '24px',
                      color: '#ef4444',
                      flexShrink: 0,
                      textAlign: 'center'
                    }}
                  >
                    OUT
                  </span>

                  <img
                    src={p.avatar || '/avatars/lion.png'}
                    alt={p.name}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: '#FAF6F0',
                      border: '2px solid #475569',
                      filter: 'grayscale(80%)',
                      flexShrink: 0
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.84rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          textDecoration: 'line-through',
                          color: '#94a3b8'
                        }}
                      >
                        {p.name}
                      </span>
                      {isMe && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ef4444', flexShrink: 0 }}>
                          (You)
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.64rem', color: '#ef4444', fontWeight: 900, letterSpacing: '0.4px' }}>
                      ELIMINATED
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      color: '#cbd5e1'
                    }}
                  >
                    {p.score || 0} pts
                  </span>

                  <span
                    style={{
                      fontWeight: 900,
                      fontSize: '0.7rem',
                      backgroundColor: '#D32231',
                      color: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      border: '1.5px solid #000',
                      letterSpacing: '0.5px'
                    }}
                  >
                    OUT
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
