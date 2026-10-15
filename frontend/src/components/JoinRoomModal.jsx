import React, { useState } from 'react';
import { LogIn, X, Hash } from 'lucide-react';

export default function JoinRoomModal({ isOpen, onClose, onJoin, errorMessage }) {
  const [roomCode, setRoomCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    onJoin(roomCode.trim().toUpperCase());
  };

  return (
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
          position: 'relative',
          animation: 'fadeInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}
      >
        <button
          onClick={onClose}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
                marginBottom: '12px'
              }}
            >
              <LogIn size={28} />
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', margin: 0, letterSpacing: '0.5px' }}>
              Join Quiz Room
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#4E9F83', marginTop: '6px', fontWeight: 700 }}>
              Enter the 6-character room code provided by the host:
            </p>
          </div>

          {errorMessage && (
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
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.5px' }}>
              Room Code
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Hash size={22} style={{ position: 'absolute', left: '14px', color: '#4E9F83' }} />
              <input
                type="text"
                maxLength={6}
                required
                placeholder="e.g. X7K9P2"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 46px',
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  letterSpacing: '3px',
                  color: '#D32231',
                  backgroundColor: '#0b192c',
                  border: '4px solid #000000',
                  borderRadius: '12px',
                  outline: 'none',
                  boxShadow: '4px 4px 0px #000000',
                  textTransform: 'uppercase'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
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
            <LogIn size={20} />
            Enter Lobby
          </button>
        </form>
      </div>
    </div>
  );
}
