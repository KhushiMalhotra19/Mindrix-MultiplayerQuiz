import React, { useState, useEffect, useRef } from 'react';
import { Clock, Trophy, CheckCircle2, Award, AlertTriangle } from 'lucide-react';

const ALL_GENRE_CONFIGS = [
  { id: 'Sports', name: 'Sports', pos: { top: '32%', left: '26%' } },
  { id: 'Entertainment', name: 'Entertainment', pos: { top: '18%', left: '50%' } },
  { id: 'History', name: 'History', pos: { top: '32%', left: '74%' } },
  { id: 'Riddles', name: 'Riddles', pos: { top: '68%', left: '26%' } },
  { id: 'Science', name: 'Science', pos: { top: '50%', left: '50%' } },
  { id: 'Mathematics', name: 'Mathematics', pos: { top: '68%', left: '74%' } }
];

export default function GenrePoll({ socket, roomCode, pollState, isHost }) {
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedGenre, setVotedGenre] = useState(null);
  const [localTimer, setLocalTimer] = useState(pollState?.pollTimer ?? 15);
  const [votesData, setVotesData] = useState(pollState?.votes || {
    Sports: 0,
    History: 0,
    Entertainment: 0,
    Science: 0,
    Mathematics: 0,
    Riddles: 0
  });
  const [isEnded, setIsEnded] = useState(pollState?.ended || false);
  const [winningGenre, setWinningGenre] = useState(pollState?.winningGenre || null);
  const [currentRound, setCurrentRound] = useState(pollState?.round || 1);
  const [isTieBreaker, setIsTieBreaker] = useState(pollState?.isTieBreaker || false);
  const [availableGenresList, setAvailableGenresList] = useState(
    pollState?.availableGenres || ['Sports', 'History', 'Entertainment', 'Science', 'Mathematics', 'Riddles']
  );
  const [tieNotice, setTieNotice] = useState(pollState?.message || null);

  const audioRef = useRef(null);
  const tickTriggeredRef = useRef({});

  // Audio Setup for Clock Ticking
  useEffect(() => {
    const audio = new Audio('/sounds/dragon-studio-slow-cinematic-clock-ticking-357979.mp3');
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Ticking sound during genre voting: starts at the last 5 seconds only (5s down to 1s)
  useEffect(() => {
    if (!isEnded && localTimer > 0 && localTimer <= 5) {
      if (!tickTriggeredRef.current[localTimer] && audioRef.current) {
        tickTriggeredRef.current[localTimer] = true;
        try {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        } catch {}
      }
    } else {
      if (audioRef.current && !audioRef.current.paused && (isEnded || localTimer === 0)) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [localTimer, isEnded]);

  // Socket Event Listeners for Poll Updates
  useEffect(() => {
    if (!socket) return;

    const handleTick = ({ pollTimer }) => {
      setLocalTimer(pollTimer);
      if (pollTimer <= 0) {
        setIsEnded(true);
      }
    };

    const handleVoteUpdate = ({ votes }) => {
      setVotesData(votes);
    };

    const handlePollStarted = ({ pollState: newPollState }) => {
      if (newPollState) {
        setLocalTimer(newPollState.pollTimer ?? 15);
        setVotesData(newPollState.votes);
        setIsEnded(newPollState.ended || false);
        setWinningGenre(newPollState.winningGenre || null);
        setCurrentRound(newPollState.round || 1);
        setIsTieBreaker(newPollState.isTieBreaker || false);
        setAvailableGenresList(newPollState.availableGenres || []);
        setTieNotice(newPollState.message || null);
        
        // Reset player voting state for new round
        setSelectedGenre(null);
        setHasVoted(false);
        setVotedGenre(null);
        tickTriggeredRef.current = {};
      }
    };

    const handlePollEnded = ({ votes, winningGenre }) => {
      setVotesData(votes);
      setWinningGenre(winningGenre);
      setIsEnded(true);

      // Stop ticking clock audio when poll ends
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };

    socket.on('poll_timer_tick', handleTick);
    socket.on('poll_vote_update', handleVoteUpdate);
    socket.on('genre_poll_started', handlePollStarted);
    socket.on('genre_poll_ended', handlePollEnded);

    return () => {
      socket.off('poll_timer_tick', handleTick);
      socket.off('poll_vote_update', handleVoteUpdate);
      socket.off('genre_poll_started', handlePollStarted);
      socket.off('genre_poll_ended', handlePollEnded);
    };
  }, [socket]);

  // Sync state from pollState prop safely (without resetting timer mid-countdown)
  useEffect(() => {
    if (pollState) {
      if (pollState.votes) setVotesData(pollState.votes);
      if (pollState.ended) {
        setIsEnded(true);
        if (pollState.winningGenre) setWinningGenre(pollState.winningGenre);
      }
      if (pollState.isTieBreaker !== undefined) setIsTieBreaker(pollState.isTieBreaker);
      if (pollState.availableGenres) setAvailableGenresList(pollState.availableGenres);
      if (pollState.message) setTieNotice(pollState.message);
    }
  }, [pollState]);

  // Handle Genre Selection
  const handleSelectGenre = (genreId) => {
    if (isEnded || pollState?.ended) return;
    setSelectedGenre(genreId);
  };

  // Handle Submit Vote Action
  const handleSubmitVote = () => {
    if (!selectedGenre || isEnded || pollState?.ended || !socket) return;
    socket.emit('submit_genre_vote', {
      roomCode,
      genre: selectedGenre
    });
    setHasVoted(true);
    setVotedGenre(selectedGenre);
  };

  // Calculate position mapping for active available genres
  const getGenrePosition = (genreId, index, total) => {
    if (total === 2) {
      const pos2 = [
        { top: '38%', left: '32%' },
        { top: '38%', left: '68%' }
      ];
      return pos2[index] || { top: '38%', left: '50%' };
    }

    if (total === 3) {
      const pos3 = [
        { top: '36%', left: '24%' },
        { top: '22%', left: '50%' },
        { top: '36%', left: '76%' }
      ];
      return pos3[index] || { top: '36%', left: '50%' };
    }

    if (total === 4) {
      const pos4 = [
        { top: '28%', left: '28%' },
        { top: '28%', left: '72%' },
        { top: '60%', left: '33%' },
        { top: '60%', left: '67%' }
      ];
      return pos4[index] || { top: '40%', left: '50%' };
    }

    if (total === 5) {
      const pos5 = [
        { top: '24%', left: '24%' },
        { top: '18%', left: '50%' },
        { top: '24%', left: '76%' },
        { top: '58%', left: '33%' },
        { top: '58%', left: '67%' }
      ];
      return pos5[index] || { top: '40%', left: '50%' };
    }

    const match = ALL_GENRE_CONFIGS.find(g => g.id === genreId);
    if (match) return match.pos;

    const startAngle = (210 * Math.PI) / 180;
    const endAngle = (330 * Math.PI) / 180;
    const angle = total > 1 ? startAngle + (index / (total - 1)) * (endAngle - startAngle) : (270 * Math.PI) / 180;
    const rx = 35;
    const ry = 25;
    const topPercent = 40 + ry * Math.sin(angle);
    const leftPercent = 50 + rx * Math.cos(angle);
    return { top: `${topPercent}%`, left: `${leftPercent}%` };
  };

  // Calculate highest votes for graph scaling
  const maxVotes = Math.max(1, ...Object.values(votesData));
  const showGraphResults = isEnded || pollState?.ended;

  return (
    <div
      className="genre-poll-container"
      style={{
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        minHeight: '560px',
        backgroundColor: '#081322',
        border: '6px solid #000000',
        borderRadius: '24px',
        boxShadow: '12px 12px 0px #000000',
        padding: '24px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#ffffff',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* ----------------------------------------------------
         PHASE 1: VOTING STAGE (10 SECONDS COUNTDOWN & CIRCLES)
         ---------------------------------------------------- */}
      {!showGraphResults ? (
        <div style={{ width: '100%', height: '100%', minHeight: '500px', position: 'relative' }}>
          {/* Top Header Row: Title & 10s Reverse Clock Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: '8px'
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  margin: 0,
                  letterSpacing: '0.5px',
                  textShadow: '3px 3px 0px #000000'
                }}
              >
                {isTieBreaker ? '⚖️ Tie-Breaker Poll' : 'Vote for the Genre of your choice'}
              </h2>
              {isTieBreaker && (
                <div style={{ color: '#FFD700', fontWeight: 800, fontSize: '0.95rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} />
                  <span>Re-voting between tied contenders!</span>
                </div>
              )}
            </div>

            {/* 10 Seconds Reverse Timer Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: localTimer <= 3 ? '#D32231' : '#0b192c',
                color: '#ffffff',
                border: '4px solid #000000',
                boxShadow: localTimer <= 3 ? '0 0 16px rgba(211, 34, 49, 0.9), 4px 4px 0px #000000' : '4px 4px 0px #000000',
                borderRadius: '14px',
                padding: '8px 18px',
                fontSize: '1.15rem',
                fontWeight: 900,
                transition: 'all 0.3s ease'
              }}
            >
              <Clock size={20} color={localTimer <= 3 ? '#ffffff' : '#D32231'} />
              <span>Time: <span style={{ color: localTimer <= 3 ? '#ffffff' : '#D32231', fontSize: '1.3rem' }}>{localTimer} sec</span></span>
            </div>
          </div>

          {/* Tie Notice Banner if present */}
          {tieNotice && (
            <div
              style={{
                backgroundColor: '#D32231',
                color: '#ffffff',
                border: '3px solid #000000',
                boxShadow: '4px 4px 0px #000000',
                borderRadius: '12px',
                padding: '8px 16px',
                textAlign: 'center',
                fontWeight: 900,
                fontSize: '0.95rem',
                marginBottom: '10px',
                animation: 'fadeInUp 0.3s forwards'
              }}
            >
              {tieNotice}
            </div>
          )}

          {/* Subtitle helper */}
          <p style={{ textAlign: 'center', color: '#4E9F83', fontWeight: 700, margin: '0 0 16px 0', fontSize: '0.92rem' }}>
            Click on a genre node to select, then click the VOTE button at the bottom!
          </p>

          {/* Interactive Genre Circles Arc / Cluster Layout */}
          <div style={{ position: 'relative', width: '100%', height: '350px', marginTop: '10px' }}>
            {availableGenresList.map((genreId, idx) => {
              const pos = getGenrePosition(genreId, idx, availableGenresList.length);
              const isSelected = selectedGenre === genreId;
              const isConfirmed = hasVoted && votedGenre === genreId;

              return (
                <div
                  key={genreId}
                  onClick={() => handleSelectGenre(genreId)}
                  style={{
                    position: 'absolute',
                    top: pos.top,
                    left: pos.left,
                    transform: isSelected ? 'translate(-50%, -50%) scale(1.12)' : 'translate(-50%, -50%) scale(1)',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    backgroundColor: isSelected ? '#32715C' : '#1a3328',
                    color: '#ffffff',
                    border: isSelected ? '5px solid #FFD700' : '5px solid #000000',
                    boxShadow: isSelected ? '0 0 22px rgba(255, 215, 0, 0.8), 8px 8px 0px #000000' : '6px 6px 0px #000000',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    textAlign: 'center',
                    padding: '8px',
                    zIndex: isSelected ? 30 : 10
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.06)';
                      e.currentTarget.style.backgroundColor = '#275747';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                      e.currentTarget.style.backgroundColor = '#1a3328';
                    }
                  }}
                >
                  {isConfirmed && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        backgroundColor: '#FFD700',
                        color: '#000000',
                        borderRadius: '50%',
                        padding: '3px',
                        border: '2px solid #000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CheckCircle2 size={16} strokeWidth={3} />
                    </div>
                  )}

                  <span style={{ fontSize: '1rem', fontWeight: 900, letterSpacing: '0.3px', lineHeight: 1.2 }}>
                    {genreId}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom Center: VOTE Triangle Button */}
          <div
            style={{
              position: 'absolute',
              bottom: '-5px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'none'
            }}
          >
            <div
              onClick={handleSubmitVote}
              title={selectedGenre ? 'Click to submit vote' : 'Select a genre first'}
              style={{
                pointerEvents: 'auto',
                cursor: selectedGenre ? 'pointer' : 'not-allowed',
                opacity: selectedGenre ? 1 : 0.65,
                filter: selectedGenre ? 'drop-shadow(6px 6px 0px #000000)' : 'drop-shadow(3px 3px 0px #000000)',
                transition: 'transform 0.15s ease',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                if (selectedGenre) e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                if (selectedGenre) e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="115" height="95" viewBox="0 0 110 95">
                <polygon
                  points="55,6 105,90 5,90"
                  fill={hasVoted ? '#32715C' : '#D32231'}
                  stroke="#000000"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <text
                  x="55"
                  y="62"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="15"
                  fontWeight="900"
                  fontFamily="Space Grotesk, sans-serif"
                  letterSpacing="0.8px"
                >
                  {hasVoted ? 'VOTED' : 'VOTE'}
                </text>
              </svg>
            </div>
          </div>
        </div>
      ) : (
        /* ----------------------------------------------------
           PHASE 2: POLL RESULTS & BAR GRAPH STAGE
           ---------------------------------------------------- */
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            animation: 'fadeInUp 0.4s ease forwards'
          }}
        >
          {/* Top Banner: Winning Quiz Genre */}
          <div
            style={{
              backgroundColor: '#0b192c',
              border: '5px solid #000000',
              boxShadow: '8px 8px 0px #000000',
              borderRadius: '18px',
              padding: '14px 32px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            <Trophy size={32} color="#FFD700" />
            <h2 style={{ fontSize: '1.85rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#ffffff' }}>
              Quiz Genre selected: <span style={{ color: '#D32231', textShadow: '2px 2px 0px #000000' }}>{winningGenre || 'Science'}</span>
            </h2>
          </div>

          {/* Bar Chart Graph Container with Brutalist X & Y Axes */}
          <div
            style={{
              width: '100%',
              maxWidth: '850px',
              height: '340px',
              position: 'relative',
              marginTop: '10px',
              paddingLeft: '50px',
              paddingBottom: '45px',
              boxSizing: 'border-box'
            }}
          >
            {/* Y-Axis Line & Arrow */}
            <div
              style={{
                position: 'absolute',
                left: '45px',
                top: '10px',
                bottom: '40px',
                width: '4px',
                backgroundColor: '#ffffff',
                boxShadow: '2px 0px 0px #000000'
              }}
            >
              {/* Y-Axis Arrow head */}
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '-6px',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderBottom: '14px solid #ffffff'
                }}
              />
            </div>

            {/* X-Axis Line & Arrow */}
            <div
              style={{
                position: 'absolute',
                left: '45px',
                right: '10px',
                bottom: '40px',
                height: '4px',
                backgroundColor: '#ffffff',
                boxShadow: '0px 2px 0px #000000'
              }}
            >
              {/* X-Axis Arrow head */}
              <div
                style={{
                  position: 'absolute',
                  right: '-12px',
                  top: '-6px',
                  width: 0,
                  height: 0,
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderLeft: '14px solid #ffffff'
                }}
              />
            </div>

            {/* Vertical Bars Display Container */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-around',
                height: '100%',
                paddingLeft: '10px',
                paddingRight: '20px'
              }}
            >
              {ALL_GENRE_CONFIGS.map((g) => {
                const count = votesData[g.id] || 0;
                const isWinner = g.id === winningGenre;
                const barHeightPercent = Math.max(12, (count / maxVotes) * 100);

                return (
                  <div
                    key={g.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flex: 1,
                      maxWidth: '80px',
                      height: '100%',
                      justifyContent: 'flex-end',
                      position: 'relative'
                    }}
                  >
                    {/* Vote Count Label above bar */}
                    <div
                      style={{
                        marginBottom: '6px',
                        backgroundColor: '#0b192c',
                        color: '#ffffff',
                        border: '2px solid #000000',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontWeight: 900,
                        fontSize: '0.85rem'
                      }}
                    >
                      {count} {count === 1 ? 'vote' : 'votes'}
                    </div>

                    {/* The Bar */}
                    <div
                      style={{
                        width: '46px',
                        height: `${barHeightPercent}%`,
                        maxHeight: '220px',
                        backgroundColor: isWinner ? '#32715C' : '#D32231',
                        border: '3px solid #000000',
                        boxShadow: isWinner ? '0 0 16px rgba(50, 113, 92, 0.9), 4px 0px 0px #000000' : '4px 0px 0px #000000',
                        borderRadius: '8px 8px 0 0',
                        transition: 'height 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        position: 'relative'
                      }}
                    >
                      {isWinner && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-24px',
                            left: '50%',
                            transform: 'translateX(-50%)'
                          }}
                        >
                          <Award size={22} color="#FFD700" />
                        </div>
                      )}
                    </div>

                    {/* Genre Label below X-Axis */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-32px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: isWinner ? '#FFD700' : '#ffffff',
                        textTransform: 'lowercase',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {g.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
