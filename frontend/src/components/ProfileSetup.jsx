import React, { useState } from 'react';
import { User, Sparkles, Check, Edit2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AVATARS = [
  { id: 'lion', name: 'Cool Lion', url: '/avatars/lion.png' },
  { id: 'panda', name: 'Cute Panda', url: '/avatars/panda.png' },
  { id: 'cat', name: 'Smart Cat', url: '/avatars/cat.svg' },
  { id: 'fox', name: 'Smart Fox', url: '/avatars/fox.svg' },
  { id: 'owl', name: 'Studious Owl', url: '/avatars/owl.svg' },
  { id: 'puppy', name: 'Cute Puppy', url: '/avatars/puppy.svg' },
];

export default function ProfileSetup({ user: propUser, onProfileUpdated: propOnProfileUpdated, onLogout: propOnLogout, onProceedToNextPage }) {
  const auth = useAuth();
  const user = propUser !== undefined ? propUser : auth.user;
  const onProfileUpdated = propOnProfileUpdated || auth.handleProfileUpdated;
  const onLogout = propOnLogout || auth.handleLogout;
  const [playerName, setPlayerName] = useState(user?.playerName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatarUrl || AVATARS[0].url);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(!user?.playerName);

  const username = user?.fullName || 'Player';
  const savedPlayerName = user?.playerName || playerName.trim();

  // Welcome heading: Shows AKA ONLY after saving profile (when isEditing is false)
  const welcomeHeading = (!isEditing && savedPlayerName)
    ? `Welcome ${username} AKA ${savedPlayerName}`
    : `Welcome ${username}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = playerName.trim();
    if (!trimmed) {
      setError('Please enter a player name.');
      return;
    }

    if (!selectedAvatar) {
      setError('Please select an avatar.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          playerName: trimmed,
          avatarUrl: selectedAvatar,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to save profile. Please try again.');
        setLoading(false);
        return;
      }

      setLoading(false);
      setIsEditing(false);
      if (onProfileUpdated && data.user) {
        onProfileUpdated(data.user);
      }
    } catch (err) {
      console.error('Profile Update Error:', err);
      setError('Connection error. Please check backend server.');
      setLoading(false);
    }
  };

  return (
    <div
      className="profile-setup-card"
      style={{
        width: '100%',
        maxWidth: '520px',
        margin: '0 auto',
        padding: '36px 32px',
        backgroundColor: 'rgba(15, 23, 42, 0.68)', // Translucent #0F172A (matching background)
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '18px', // Square shape with little border radius
        border: '6px solid #000000',
        boxShadow: '12px 12px 0px #000000',
        color: '#32715C', // Deep Teal text
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Welcome Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: '#32715C', // Deep Teal
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            textShadow: '1px 1px 0px #000000',
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}
        >
          {welcomeHeading}
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#32715C', marginTop: '6px', fontWeight: 700 }}>
          {isEditing ? 'Create your player identity & choose your avatar' : 'Your Profile is Ready!'}
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#ffebe9',
            color: '#c5221f',
            border: '2px solid #000',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '18px',
          }}
        >
          {error}
        </div>
      )}

      {isEditing ? (
        /* Form View */
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Player Name Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#32715C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Player Name
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={20}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#32715C',
                }}
              />
              <input
                type="text"
                required
                placeholder="e.g. ShadowNinja"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 44px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#32715C',
                  backgroundColor: '#ffffff',
                  border: '4px solid #000000',
                  borderRadius: '10px',
                  outline: 'none',
                  boxShadow: '4px 4px 0px #000000',
                }}
              />
            </div>
          </div>

          {/* Avatar Selection Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#32715C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Choose Your Avatar
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                padding: '14px',
                borderRadius: '12px',
                border: '3px solid #000000',
              }}
            >
              {AVATARS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.url;
                return (
                  <div
                    key={avatar.id}
                    onClick={() => setSelectedAvatar(avatar.url)}
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: isSelected ? '4px solid #32715C' : '3px solid #000000',
                      boxShadow: isSelected ? '4px 4px 0px #32715C' : '3px 3px 0px #000000',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.18s ease',
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
                          top: '4px',
                          right: '4px',
                          backgroundColor: '#32715C',
                          color: '#fff',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #000',
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

          {/* Submit Button */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                backgroundColor: '#32715C', // Deep Teal
                color: '#ffffff',
                border: '4px solid #000000',
                boxShadow: '5px 5px 0px #000000',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '1.1rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Sparkles size={20} />
              {loading ? 'Saving Profile...' : 'Save Profile'}
            </button>

            <button
              type="button"
              onClick={onLogout}
              style={{
                padding: '14px 18px',
                backgroundColor: '#D32231', // Tomato Red
                color: '#ffffff',
                border: '4px solid #000000',
                boxShadow: '4px 4px 0px #000000',
                borderRadius: '10px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <LogOut size={20} />
            </button>
          </div>
        </form>
      ) : (
        /* Saved Profile Display View */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Avatar Display */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '5px solid #000000',
              boxShadow: '6px 6px 0px #000000',
              backgroundColor: '#ffffff',
            }}
          >
            <img
              src={selectedAvatar}
              alt={playerName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#32715C' }}>
              {playerName}
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#32715C', marginTop: '2px', fontWeight: 700 }}>
              {user.email}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {/* Primary Action to Proceed to Next Page & Trigger Shapes Fallout */}
            <button
              onClick={onProceedToNextPage}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#32715C',
                color: '#ffffff',
                border: '4px solid #000000',
                boxShadow: '5px 5px 0px #000000',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '1.1rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Sparkles size={20} />
              Continue to Game ➔
            </button>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  border: '4px solid #000000',
                  boxShadow: '4px 4px 0px #000000',
                  borderRadius: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                <Edit2 size={18} />
                Edit Profile
              </button>

              <button
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  backgroundColor: '#D32231',
                  color: '#ffffff',
                  border: '4px solid #000000',
                  boxShadow: '4px 4px 0px #000000',
                  borderRadius: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
