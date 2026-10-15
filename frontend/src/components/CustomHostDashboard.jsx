import React, { useState, useEffect, useRef } from 'react';
import { Award, Trophy, Medal, Clock, CheckCircle2, XCircle, Users, Copy, Check, Sparkles, HelpCircle, AlertCircle, Home, FastForward, Power } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CustomHostDashboard({ socket, roomState, onReturnToLobby }) {
  const [copied, setCopied] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(roomState?.timerSecondsPerQuestion || 20);
  const [quizPhase, setQuizPhase] = useState('question'); // 'loading' | 'question' | 'reveal' | 'game_over'
  const [gameOverData, setGameOverData] = useState(null);
  const [confirmEndModal, setConfirmEndModal] = useState(false);

  // Audio ticking reference for last 5s
  const tickAudioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio('/sounds/dragon-studio-slow-cinematic-clock-ticking-357979.mp3');
    audio.preload = 'auto';
    tickAudioRef.current = audio;

    return () => {
      if (tickAudioRef.current) {
        try {
          tickAudioRef.current.pause();
          tickAudioRef.current.currentTime = 0;
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (quizPhase === 'question' && timeRemaining > 0 && timeRemaining <= 5) {
      if (tickAudioRef.current) {
        try {
          tickAudioRef.current.currentTime = 0;
          tickAudioRef.current.play().catch(() => {});
        } catch {}
      }
    } else {
      if (tickAudioRef.current) {
        try {
          tickAudioRef.current.pause();
        } catch {}
      }
    }
  }, [timeRemaining, quizPhase]);

  useEffect(() => {
    if (!socket) return;

    const handleHostLiveUpdate = (data) => {
      setDashboardData(data);
      if (data.phase) setQuizPhase(data.phase);
      if (data.timeRemaining !== undefined) setTimeRemaining(data.timeRemaining);
    };

    const handleTimerTick = ({ questionTimer }) => {
      setTimeRemaining(questionTimer);
    };

    const handleQuestionStart = (data) => {
      setQuizPhase('question');
      setTimeRemaining(data.timeLimit || 20);
      setDashboardData(prev => ({
        ...prev,
        questionNumber: data.questionNumber,
        totalQuestions: data.totalQuestions,
        questionText: data.questionText,
        options: data.options,
        correctAnswerIndex: data.correctAnswerIndex,
        genre: data.genre
      }));
    };

    const handleQuestionReveal = (data) => {
      setQuizPhase('reveal');
      setDashboardData(prev => ({
        ...prev,
        correctAnswerIndex: data.correctAnswerIndex,
        explanation: data.explanation
      }));
    };

    const handleGameOver = (data) => {
      setQuizPhase('game_over');
      setGameOverData(data);
      setTimeout(() => {
        try {
          confetti({
            particleCount: 140,
            spread: 90,
            origin: { y: 0.55 }
          });
        } catch (e) {}
      }, 300);
    };

    socket.on('host_live_ranking_update', handleHostLiveUpdate);
    socket.on('quiz_timer_tick', handleTimerTick);
    socket.on('quiz_question_start', handleQuestionStart);
    socket.on('quiz_question_reveal', handleQuestionReveal);
    socket.on('quiz_game_over', handleGameOver);

    return () => {
      socket.off('host_live_ranking_update', handleHostLiveUpdate);
      socket.off('quiz_timer_tick', handleTimerTick);
      socket.off('quiz_question_start', handleQuestionStart);
      socket.off('quiz_question_reveal', handleQuestionReveal);
      socket.off('quiz_game_over', handleGameOver);
    };
  }, [socket]);

  const handleCopyCode = () => {
    if (roomState?.code) {
      navigator.clipboard.writeText(roomState.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleForceNext = () => {
    if (socket && roomState?.code) {
      socket.emit('host_force_next', { roomCode: roomState.code });
    }
  };

  const handleEndQuiz = () => {
    setConfirmEndModal(false);
    if (socket && roomState?.code) {
      socket.emit('host_end_quiz', { roomCode: roomState.code });
    }
  };

  const currentQIndex = dashboardData?.questionIndex ?? 0;
  const questionNumber = dashboardData?.questionNumber ?? (currentQIndex + 1);
  const totalQuestions = dashboardData?.totalQuestions ?? (roomState?.customQuestions?.length || 1);
  const questionText = dashboardData?.questionText || roomState?.customQuestions?.[currentQIndex]?.question || 'Loading question...';
  const options = dashboardData?.options || roomState?.customQuestions?.[currentQIndex]?.options || [];
  const correctAnswerIndex = dashboardData?.correctAnswerIndex ?? (roomState?.customQuestions?.[currentQIndex]?.correctAnswerIndex ?? 0);
  const explanation = dashboardData?.explanation || roomState?.customQuestions?.[currentQIndex]?.explanation || '';

  const liveRankings = dashboardData?.liveRankings || (
    roomState?.players?.filter(p => !p.isHostSpectator).map(p => ({
      socketId: p.socketId,
      name: p.name,
      avatar: p.avatar,
      score: 0,
      hasAnswered: false,
      isCorrect: null,
      pointsEarned: 0,
      timeTakenSec: null
    })) || []
  );

  const answeredCount = dashboardData?.answeredCount ?? liveRankings.filter(p => p.hasAnswered).length;
  const totalContestants = dashboardData?.totalContestants ?? liveRankings.length;
  const correctCount = liveRankings.filter(p => p.hasAnswered && p.isCorrect).length;
  const wrongCount = liveRankings.filter(p => p.hasAnswered && p.isCorrect === false).length;
  const pendingCount = Math.max(0, totalContestants - answeredCount);

  // If Game Over, render final podium & leaderboard for host
  if (quizPhase === 'game_over' && gameOverData) {
    const standings = gameOverData.standings || [];
    const firstPlace = standings[0];
    const secondPlace = standings[1];
    const thirdPlace = standings[2];

    return (
      <div
        style={{
          width: 'calc(100% - 32px)',
          maxWidth: '1280px',
          margin: '0 auto 32px auto',
          minHeight: 'auto',
          maxHeight: 'none',
          overflow: 'visible',
          backgroundColor: 'rgba(8, 19, 34, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '6px solid #000000',
          borderRadius: '24px',
          boxShadow: '12px 12px 0px #000000',
          padding: '28px 24px 40px 24px',
          boxSizing: 'border-box',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          animation: 'fadeInUp 0.4s ease-out forwards'
        }}
      >
        <div
          style={{
            backgroundColor: '#32715C',
            color: '#ffffff',
            border: '4px solid #000000',
            boxShadow: '6px 6px 0px #000000',
            borderRadius: '16px',
            padding: '12px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 900,
            fontSize: '1.4rem',
            textTransform: 'uppercase'
          }}
        >
          <Trophy size={32} color="#FFD700" />
          <span>Custom Quiz Finished! - Host Summary</span>
        </div>

        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, margin: '4px 0', textShadow: '4px 4px 0px #000' }}>
          TOP 3 MEDAL WINNERS
        </h1>

        <p style={{ margin: 0, fontSize: '0.95rem', color: '#4E9F83', fontWeight: 800 }}>
          * Top 3 contestants received medals! (0 XP awarded for custom games)
        </p>

        {/* Podium for Top 3 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '24px',
            width: '100%',
            maxWidth: '720px',
            marginTop: '20px',
            marginBottom: '16px'
          }}
        >
          {/* 2nd Place Silver */}
          {secondPlace && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#ffffff', border: '3.5px solid #000', overflow: 'hidden', boxShadow: '4px 4px 0px #000', marginBottom: '8px' }}>
                <img src={secondPlace.avatar || '/avatars/fox.svg'} alt={secondPlace.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ fontWeight: 900, fontSize: '1rem', color: '#C0C0C0', textShadow: '2px 2px 0px #000', marginBottom: '4px' }}>
                {secondPlace.name}
              </span>
              <div style={{ width: '100%', height: '105px', backgroundColor: '#A8A8A8', border: '4px solid #000', borderRadius: '14px 14px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '6px 6px 0px #000' }}>
                <Medal size={30} color="#ffffff" />
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#000000' }}>2ND</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#000000' }}>{secondPlace.score} pts</span>
              </div>
            </div>
          )}

          {/* 1st Place Gold */}
          {firstPlace && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.15 }}>
              <div style={{ width: '76px', height: '76px', borderRadius: '50%', backgroundColor: '#ffffff', border: '4px solid #000', overflow: 'hidden', boxShadow: '6px 6px 0px #000', marginBottom: '8px' }}>
                <img src={firstPlace.avatar || '/avatars/lion.png'} alt={firstPlace.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#FFD700', textShadow: '2px 2px 0px #000', marginBottom: '4px' }}>
                {firstPlace.name}
              </span>
              <div style={{ width: '100%', height: '140px', backgroundColor: '#FFD700', border: '4px solid #000', borderRadius: '16px 16px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '8px 8px 0px #000' }}>
                <Trophy size={38} color="#000000" />
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#000000' }}>1ST</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#000000' }}>{firstPlace.score} pts</span>
              </div>
            </div>
          )}

          {/* 3rd Place Bronze */}
          {thirdPlace && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ffffff', border: '3.5px solid #000', overflow: 'hidden', boxShadow: '4px 4px 0px #000', marginBottom: '8px' }}>
                <img src={thirdPlace.avatar || '/avatars/owl.svg'} alt={thirdPlace.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#CD7F32', textShadow: '2px 2px 0px #000', marginBottom: '4px' }}>
                {thirdPlace.name}
              </span>
              <div style={{ width: '100%', height: '80px', backgroundColor: '#CD7F32', border: '4px solid #000', borderRadius: '14px 14px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '6px 6px 0px #000' }}>
                <Award size={28} color="#ffffff" />
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#000000' }}>3RD</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#000000' }}>{thirdPlace.score} pts</span>
              </div>
            </div>
          )}
        </div>

        {/* Full Rankings List */}
        <div
          style={{
            width: '100%',
            maxWidth: '720px',
            backgroundColor: '#0b192c',
            border: '4px solid #000000',
            boxShadow: '6px 6px 0px #000000',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '220px',
            overflowY: 'auto'
          }}
        >
          <span style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFD700' }}>
            Final Contestant Standings
          </span>
          {standings.map((p, idx) => (
            <div
              key={p.socketId || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                backgroundColor: idx === 0 ? 'rgba(255, 215, 0, 0.15)' : '#081322',
                border: '2.5px solid #000000',
                borderRadius: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#ffffff', width: '28px' }}>
                  #{idx + 1}
                </span>
                <img src={p.avatar || '/avatars/lion.png'} alt={p.name} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #000', backgroundColor: '#fff' }} />
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>{p.name}</span>
              </div>
              <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#22C55E' }}>
                {p.score} pts
              </span>
            </div>
          ))}
        </div>

        {/* Back to Lobby Button */}
        <button
          type="button"
          onClick={onReturnToLobby}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 28px',
            backgroundColor: '#32715C',
            color: '#ffffff',
            border: '4px solid #000000',
            boxShadow: '6px 6px 0px #000000',
            borderRadius: '14px',
            fontWeight: 900,
            fontSize: '1.1rem',
            textTransform: 'uppercase',
            cursor: 'pointer',
            marginTop: '8px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-2px, -2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translate(0px, 0px)')}
        >
          <Home size={22} />
          Return to Lobby
        </button>
      </div>
    );
  }

  return (
    <div
      className="custom-host-dashboard-container"
      style={{
        width: 'calc(100% - 32px)',
        maxWidth: '1360px',
        margin: '0 auto 32px auto',
        minHeight: 'auto',
        maxHeight: 'none',
        overflow: 'visible',
        backgroundColor: 'rgba(8, 19, 34, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '6px solid #000000',
        borderRadius: '24px',
        boxShadow: '12px 12px 0px #000000',
        padding: '24px 28px 40px 28px',
        boxSizing: 'border-box',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative'
      }}
    >
      {/* ----------------------------------------------------
         TOP BANNER / HEADER BAR
         ---------------------------------------------------- */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          borderBottom: '4px solid #000000',
          paddingBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Host Spectator Badge */}
          <div
            style={{
              backgroundColor: '#D32231',
              color: '#ffffff',
              border: '3.5px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              borderRadius: '12px',
              padding: '6px 16px',
              fontWeight: 900,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textTransform: 'uppercase'
            }}
          >
            <Sparkles size={18} />
            HOST LIVE DASHBOARD (SPECTATOR)
          </div>

          {/* Topic Badge */}
          <div
            style={{
              backgroundColor: '#32715C',
              color: '#ffffff',
              border: '3.5px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              borderRadius: '12px',
              padding: '6px 16px',
              fontWeight: 900,
              fontSize: '0.95rem',
              textTransform: 'uppercase'
            }}
          >
            Topic: {roomState?.topic || 'Custom Quiz'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Room Code Badge */}
          <div
            onClick={handleCopyCode}
            title="Click to copy Room Code"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#FAF6F0',
              color: '#081322',
              border: '3.5px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              borderRadius: '12px',
              padding: '6px 14px',
              fontWeight: 900,
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            <span>ROOM: <span style={{ color: '#D32231', letterSpacing: '1px' }}>{roomState?.code}</span></span>
            {copied ? <Check size={18} color="#1E824C" /> : <Copy size={18} />}
          </div>

          {/* Question Number Badge */}
          <div
            style={{
              backgroundColor: '#0b192c',
              color: '#FFD700',
              border: '3.5px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              borderRadius: '12px',
              padding: '6px 16px',
              fontWeight: 900,
              fontSize: '1rem'
            }}
          >
            Q {questionNumber} / {totalQuestions}
          </div>

          {/* Live Timer Countdown Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: timeRemaining <= 5 ? '#D32231' : '#0b192c',
              color: '#ffffff',
              border: timeRemaining <= 5 ? '3.5px solid #ff4d4d' : '3.5px solid #000000',
              boxShadow: timeRemaining <= 5 ? '0 0 16px rgba(211,34,49,0.8), 4px 4px 0px #000' : '4px 4px 0px #000000',
              borderRadius: '12px',
              padding: '6px 18px',
              fontSize: '1.15rem',
              fontWeight: 900,
              animation: timeRemaining <= 5 ? 'pulseTimer 0.5s ease-in-out infinite alternate' : 'none'
            }}
          >
            <Clock size={20} color={timeRemaining <= 5 ? '#ffffff' : '#D32231'} />
            <span>00:{String(timeRemaining).padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulseTimer {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }
        @keyframes thinkingPulse {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
      `}</style>

      {/* ----------------------------------------------------
         TOP QUESTION CARD & OPTIONS OVERVIEW (FOR HOST)
         ---------------------------------------------------- */}
      <div
        style={{
          backgroundColor: '#FAF6F0',
          color: '#081322',
          border: '5px solid #000000',
          boxShadow: '8px 8px 0px #000000',
          borderRadius: '20px',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#32715C', letterSpacing: '1px' }}>
            Currently Being Answered By Contestants
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#D32231' }}>
            * You are hosting this match as a spectator
          </span>
        </div>

        {/* Question Statement */}
        <h2
          style={{
            fontSize: '1.65rem',
            fontWeight: 900,
            margin: 0,
            lineHeight: 1.3,
            color: '#081322'
          }}
        >
          {questionText}
        </h2>

        {/* 4 Options Grid (Correct Option Highlighted) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px'
          }}
        >
          {options.map((opt, idx) => {
            const isCorrect = idx === Number(correctAnswerIndex);
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: isCorrect ? '#1E824C' : '#0b192c',
                  color: '#ffffff',
                  border: isCorrect ? '3.5px solid #22C55E' : '3px solid #000000',
                  boxShadow: isCorrect ? '0 0 16px rgba(34, 197, 94, 0.4), 4px 4px 0px #000000' : '4px 4px 0px #000000',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontWeight: 800,
                  fontSize: '0.95rem'
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: isCorrect ? '#FAF6F0' : '#FAF6F0',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    flexShrink: 0
                  }}
                >
                  {String.fromCharCode(65 + idx)}
                </div>

                <span style={{ flex: 1, wordBreak: 'break-word' }}>{opt}</span>

                {isCorrect && (
                  <span
                    style={{
                      backgroundColor: '#22C55E',
                      color: '#000000',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      flexShrink: 0
                    }}
                  >
                    CORRECT
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {explanation && quizPhase === 'reveal' && (
          <div
            style={{
              backgroundColor: '#eaf4f0',
              border: '2px solid #32715C',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#32715C'
            }}
          >
            💡 <strong>Explanation:</strong> {explanation}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
         LIVE PLAYERS RANKING & REAL-TIME ANSWER STATUS
         ---------------------------------------------------- */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Statistics Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0b192c',
            border: '4px solid #000000',
            boxShadow: '6px 6px 0px #000000',
            borderRadius: '16px',
            padding: '12px 20px',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, fontSize: '1.1rem' }}>
            <Users size={22} color="#4E9F83" />
            <span>LIVE CONTESTANTS RANKING:</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.92rem' }}>
              <span>Total:</span>
              <span style={{ color: '#FFD700', fontWeight: 900 }}>{totalContestants}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.92rem' }}>
              <span>Answered:</span>
              <span style={{ color: '#22C55E', fontWeight: 900 }}>{answeredCount} / {totalContestants}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.92rem' }}>
              <span>Correct:</span>
              <span style={{ color: '#22C55E', fontWeight: 900 }}>{correctCount}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.92rem' }}>
              <span>Incorrect:</span>
              <span style={{ color: '#D32231', fontWeight: 900 }}>{wrongCount}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.92rem' }}>
              <span>Pending:</span>
              <span style={{ color: '#FFD700', fontWeight: 900 }}>{pendingCount}</span>
            </div>
          </div>
        </div>

        {/* Live Contestants Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
            maxHeight: '280px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}
        >
          {liveRankings.map((player, idx) => {
            const hasAnswered = Boolean(player.hasAnswered);
            const isCorrect = player.isCorrect;

            let cardBorder = '3px solid #000000';
            let cardBg = '#0b192c';
            let badgeBg = '#333333';
            let badgeText = 'Yet to answer...';
            let badgeColor = '#ffffff';

            if (hasAnswered) {
              if (isCorrect) {
                cardBorder = '3.5px solid #22C55E';
                cardBg = 'rgba(30, 130, 76, 0.25)';
                badgeBg = '#1E824C';
                badgeText = `Answered Correct! (+${player.pointsEarned || 0} pts, ${(player.timeTakenSec || 0).toFixed(1)}s)`;
                badgeColor = '#ffffff';
              } else {
                cardBorder = '3.5px solid #D32231';
                cardBg = 'rgba(211, 34, 49, 0.25)';
                badgeBg = '#D32231';
                badgeText = `Answered Incorrect (${(player.timeTakenSec || 0).toFixed(1)}s)`;
                badgeColor = '#ffffff';
              }
            } else {
              badgeBg = 'rgba(255, 215, 0, 0.2)';
              badgeColor = '#FFD700';
              badgeText = 'Thinking... (Yet to answer)';
            }

            return (
              <div
                key={player.socketId || idx}
                style={{
                  backgroundColor: cardBg,
                  border: cardBorder,
                  boxShadow: '5px 5px 0px #000000',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header: Rank, Avatar & Name, Score */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#081322',
                        color: idx <= 2 ? '#000000' : '#ffffff',
                        border: '2px solid #000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '0.95rem'
                      }}
                    >
                      #{idx + 1}
                    </div>

                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#fff', border: '2px solid #000', overflow: 'hidden' }}>
                      <img src={player.avatar || '/avatars/lion.png'} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#ffffff' }}>
                      {player.name}
                    </span>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#FAF6F0',
                      color: '#081322',
                      border: '2px solid #000000',
                      boxShadow: '2px 2px 0px #000000',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontWeight: 900,
                      fontSize: '1rem'
                    }}
                  >
                    {player.score || 0} pts
                  </div>
                </div>

                {/* Real-Time Status Pill */}
                <div
                  style={{
                    backgroundColor: badgeBg,
                    color: badgeColor,
                    border: '2px solid #000000',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    animation: !hasAnswered ? 'thinkingPulse 1.5s infinite ease-in-out' : 'none'
                  }}
                >
                  {hasAnswered ? (
                    isCorrect ? <CheckCircle2 size={16} color="#ffffff" /> : <XCircle size={16} color="#ffffff" />
                  ) : (
                    <Clock size={16} color="#FFD700" />
                  )}
                  <span>{badgeText}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------
         SIGNATURE HOST CONTROLS (GREEN TEAL CIRCLE & RED DIAMOND)
         ---------------------------------------------------- */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '4px solid #000000'
        }}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', color: '#4E9F83', letterSpacing: '1px' }}>
          Host Controls
        </span>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '80px',
            flexWrap: 'wrap'
          }}
        >
          {/* Green Teal Circle: Force Next / Reveal Answer */}
          <button
            type="button"
            onClick={handleForceNext}
            className="btn-circle-register"
            title="Immediately reveal answer or skip to next question without waiting for timer"
            style={{
              width: '115px',
              height: '115px',
              backgroundColor: '#32715C',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <FastForward size={24} color="#000000" strokeWidth={2.5} />
            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#000000', textAlign: 'center', lineHeight: 1.1 }}>
              {quizPhase === 'reveal' ? 'NEXT\nQUESTION' : 'REVEAL\nANSWER'}
            </span>
          </button>

          {/* Red Diamond: End Quiz / Terminate Room */}
          <div
            className="btn-diamond-wrapper"
            onClick={() => setConfirmEndModal(true)}
            title="Terminate custom quiz match"
            style={{
              width: '110px',
              height: '110px',
              backgroundColor: '#D32231',
              cursor: 'pointer'
            }}
          >
            <div className="btn-diamond-content">
              <Power size={22} color="#000000" strokeWidth={2.5} />
              <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#000000', textAlign: 'center', lineHeight: 1.1 }}>
                END<br />QUIZ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal to End Quiz */}
      {confirmEndModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(8, 19, 34, 0.8)',
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
              backgroundColor: '#081322',
              color: '#ffffff',
              border: '6px solid #000000',
              boxShadow: '12px 12px 0px #000000',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '440px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}
          >
            <AlertCircle size={48} color="#D32231" style={{ margin: '0 auto' }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>
              End Custom Quiz Now?
            </h3>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#ccc', fontWeight: 700 }}>
              Are you sure you want to conclude the quiz immediately? Final standings and medals will be calculated from the current scores.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setConfirmEndModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0b192c',
                  color: '#ffffff',
                  border: '3px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: '10px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndQuiz}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#D32231',
                  color: '#ffffff',
                  border: '3px solid #000000',
                  boxShadow: '3px 3px 0px #000000',
                  borderRadius: '10px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                Yes, End Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
