import React from 'react';
import AuthModal from './components/AuthModal';
import BackgroundCanvas from './components/BackgroundCanvas';
import ProfileSetup from './components/ProfileSetup';
import QuizLobby from './components/QuizLobby';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const {
    user,
    loadingSession,
    isNextPage,
    setIsNextPage,
    modalOpen,
    closeModal,
    authMode,
    openRegister,
    openLogin,
    handleAuthSuccess,
  } = useAuth();

  return (
    <div className="main-screen">
      <BackgroundCanvas 
        isLoggedIn={Boolean(user)} 
        isNextPage={isNextPage} 
      />
      {loadingSession ? null : user ? (
        isNextPage ? (
          /* Next Page: Multiplayer Quiz Lobby View */
          <QuizLobby />
        ) : (
          /* Profile Setup & Welcome View */
          <ProfileSetup 
            onProceedToNextPage={() => setIsNextPage(true)}
          />
        )
      ) : (
        /* Logged Out View / Landing Page */
        <>
          {/* Top Left Logo Icon */}
          <div
            style={{
              position: 'fixed',
              top: '24px',
              left: '28px',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <img
              src="/logo.png"
              alt="Mindrix Logo Icon"
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'contain',
                filter: 'drop-shadow(4px 4px 0px #000000)',
                transition: 'transform 0.25s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1) rotate(6deg)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1) rotate(0deg)')}
            />
          </div>

          {/* Centered Landing Page Stack (Welcome Heading + Subheading directly ABOVE Register & Login Buttons) */}
          <div
            className="landing-hero-stack"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              gap: '36px',
              textAlign: 'center',
              padding: '20px',
              margin: 'auto 0',
              animation: 'fadeInUp 0.4s ease-out forwards'
            }}
          >
            {/* Welcome Header Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              {/* Welcome Heading */}
              <h1
                className="landing-title"
                style={{
                  fontSize: '3.4rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  textShadow: '4px 4px 0px #000000',
                  margin: 0,
                  lineHeight: 1.1,
                  letterSpacing: '0.5px'
                }}
              >
                <span style={{ color: '#32715C' }}>Welcome to </span>
                <span style={{ color: '#D32231' }}>Mindrix</span>
              </h1>

              {/* Subheading: "Think, Compete, Conquer" (Appears word by word slowly, followed by green teal underline) */}
              <div
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginTop: '6px'
                }}
              >
                <h2
                  className="landing-subtitle"
                  style={{
                    fontSize: '1.55rem',
                    fontWeight: 800,
                    color: '#D32231', // Tomato Jam Red
                    textShadow: '2px 2px 0px #000000',
                    margin: 0,
                    letterSpacing: '0.5px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '0.6rem',
                  }}
                >
                  {['Think,', 'Compete,', 'Conquer'].map((word, wordIdx) => (
                    <span
                      key={wordIdx}
                      style={{
                        display: 'inline-block',
                        opacity: 0,
                        animation: `fadeInUp 0.65s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${0.4 + wordIdx * 0.75}s forwards`,
                      }}
                    >
                      {word}
                    </span>
                  ))}
                </h2>

                {/* Animated Green Teal Underline */}
                <div
                  style={{
                    height: '4px',
                    backgroundColor: '#32715C', // Green Teal
                    borderRadius: '2px',
                    marginTop: '6px',
                    width: '0%',
                    opacity: 0,
                    animation: 'expandUnderline 0.65s cubic-bezier(0.25, 1, 0.5, 1) 2.65s forwards',
                    boxShadow: '1px 1px 0px #000000',
                  }}
                />
              </div>
            </div>

            {/* Action Trigger Buttons (Circle Register & Diamond Login) */}
            <div
              className="landing-buttons-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '70px'
              }}
            >
              {/* Circle Register Button (Deep Teal #32715C) */}
              <button className="btn-circle-register" onClick={openRegister}>
                <span>Register</span>
              </button>

              {/* Diamond Login Button (Tomato Red #D32231) */}
              <div className="btn-diamond-wrapper" onClick={openLogin}>
                <div className="btn-diamond-content">
                  <span>Login</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pop-up Auth Modal Portal */}
      <AuthModal 
        isOpen={modalOpen} 
        onClose={closeModal} 
        initialMode={authMode} 
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
