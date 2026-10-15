import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  X, 
  ArrowRight, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AuthModal({ isOpen, onClose, initialMode = 'register', onSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'register' or 'login'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setIsSubmitted(false);
      setError('');
      setLoading(false);
      // Reset inputs
      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleToggleMode = () => {
    setIsSubmitted(false);
    setError('');
    setMode(prev => prev === 'register' ? 'login' : 'register');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const isRegister = mode === 'register';
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister 
      ? { fullName, email, password, confirmPassword }
      : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Includes session cookie
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Authentication failed. Please check your details.');
        setLoading(false);
        return;
      }

      // Success! Close modal immediately without showing the 'LOGGED IN!' message modal
      setLoading(false);

      if (onSuccess && data.user) {
        onSuccess(data.user);
      }

      onClose();

      // Confetti Burst animation
      const burstColors = isRegister 
        ? ['#32715C', '#000000', '#ffffff'] 
        : ['#D32231', '#000000', '#ffffff'];

      try {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 },
          colors: burstColors
        });
      } catch (err) {
        // Fallback
      }

    } catch (err) {
      console.error('Auth Request Error:', err);
      setError('Unable to connect to server. Please ensure the backend is running.');
      setLoading(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <div className={`modal-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div 
        className="popup-wrapper" 
        onClick={e => e.stopPropagation()}
      >
        <div className={`auth-card ${isRegister ? 'shape-circle theme-register' : 'shape-diamond theme-login'}`}>
          {/* Close Button */}
          <button 
            className="close-btn" 
            onClick={onClose}
            aria-label="Close"
          >
            <X size={24} strokeWidth={3} />
          </button>

          <div className="card-content">
            {!isSubmitted ? (
              <>
                {/* Header */}
                <div className="auth-header">
                  <h2 className="auth-title">
                    {isRegister ? 'Register' : 'Login'}
                  </h2>
                  <p className="auth-subtitle">
                    {isRegister ? 'Create your account' : 'Welcome back'}
                  </p>
                </div>

                {/* Error Banner */}
                {error && (
                  <div style={{
                    backgroundColor: '#ffebe9',
                    color: '#c5221f',
                    border: '1px solid #f97d7d',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 500
                  }}>
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Form */}
                <form className="auth-form" onSubmit={handleSubmit}>
                  {/* Full Name field (Register only) */}
                  {isRegister && (
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <div className="input-wrapper">
                        <User size={18} className="input-icon" strokeWidth={2.5} />
                        <input 
                          type="text" 
                          required 
                          className="custom-input" 
                          placeholder="Your Name"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Email field */}
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <div className="input-wrapper">
                      <Mail size={18} className="input-icon" strokeWidth={2.5} />
                      <input 
                        type="email" 
                        required 
                        className="custom-input" 
                        placeholder="email@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" strokeWidth={2.5} />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        required 
                        className="custom-input" 
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password field (Register only) */}
                  {isRegister && (
                    <div className="form-group">
                      <label className="form-label">Confirm Password</label>
                      <div className="input-wrapper">
                        <ShieldCheck size={18} className="input-icon" strokeWidth={2.5} />
                        <input 
                          type={showConfirmPassword ? 'text' : 'password'} 
                          required 
                          className="custom-input" 
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                        />
                        <button 
                          type="button" 
                          className="password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button type="submit" className="submit-btn" disabled={loading}>
                    <span>{loading ? 'Processing...' : (isRegister ? 'Submit Register' : 'Submit Login')}</span>
                    {!loading && <ArrowRight size={20} strokeWidth={3} />}
                  </button>
                </form>

                {/* Mode Switcher */}
                <div className="toggle-mode-container">
                  <button 
                    type="button" 
                    className="toggle-mode-btn"
                    onClick={handleToggleMode}
                  >
                    {isRegister 
                      ? 'Already registered? Switch to Login ◆' 
                      : 'Need an account? Switch to Register ●'}
                  </button>
                </div>
              </>
            ) : (
              /* Success State */
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={48} strokeWidth={3} color={isRegister ? '#32715C' : '#D32231'} />
                <h2 className="auth-title">
                  {isRegister ? 'Registered & Logged In!' : 'Logged In!'}
                </h2>
                <p style={{ fontSize: '13px', color: '#666' }}>Your 7-day session is active.</p>
                <button 
                  className="submit-btn" 
                  style={{ marginTop: '10px' }}
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
