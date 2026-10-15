import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Clock, HelpCircle, Sparkles, BookOpen, ArrowLeft, AlertCircle } from 'lucide-react';

export default function CustomQuizCreator({ user, onCreateRoom, onCancel }) {
  const [topic, setTopic] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(20);
  const [questions, setQuestions] = useState([
    {
      question: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      explanation: ''
    }
  ]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [errorNotice, setErrorNotice] = useState('');

  const currentQ = questions[activeQuestionIndex] || {
    question: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
    explanation: ''
  };

  const handleUpdateCurrentQuestionText = (text) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[activeQuestionIndex] = { ...copy[activeQuestionIndex], question: text };
      return copy;
    });
  };

  const handleUpdateOption = (optIndex, value) => {
    setQuestions(prev => {
      const copy = [...prev];
      const opts = [...copy[activeQuestionIndex].options];
      opts[optIndex] = value;
      copy[activeQuestionIndex] = { ...copy[activeQuestionIndex], options: opts };
      return copy;
    });
  };

  const handleSelectCorrectOption = (optIndex) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[activeQuestionIndex] = { ...copy[activeQuestionIndex], correctAnswerIndex: optIndex };
      return copy;
    });
  };

  const handleUpdateExplanation = (text) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[activeQuestionIndex] = { ...copy[activeQuestionIndex], explanation: text };
      return copy;
    });
  };

  const handleAddNewQuestion = () => {
    const newQ = {
      question: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      explanation: ''
    };
    setQuestions(prev => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleDeleteQuestion = (indexToDelete) => {
    if (questions.length <= 1) {
      setErrorNotice('Quiz must have at least 1 question!');
      setTimeout(() => setErrorNotice(''), 3500);
      return;
    }
    const updated = questions.filter((_, idx) => idx !== indexToDelete);
    setQuestions(updated);
    if (activeQuestionIndex >= updated.length) {
      setActiveQuestionIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorNotice('');

    if (!topic.trim()) {
      setErrorNotice('Please provide a Topic / Title for your quiz!');
      return;
    }

    if (questions.length === 0) {
      setErrorNotice('Please add at least 1 question!');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorNotice(`Question #${i + 1} has an empty question statement!`);
        setActiveQuestionIndex(i);
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j] || !q.options[j].trim()) {
          setErrorNotice(`Question #${i + 1} Option ${String.fromCharCode(65 + j)} cannot be blank!`);
          setActiveQuestionIndex(i);
          return;
        }
      }
      if (q.correctAnswerIndex === null || q.correctAnswerIndex === undefined || q.correctAnswerIndex < 0 || q.correctAnswerIndex > 3) {
        setErrorNotice(`Please mark the correct option for Question #${i + 1}!`);
        setActiveQuestionIndex(i);
        return;
      }
    }

    onCreateRoom({
      user,
      topic: topic.trim(),
      timerSeconds: Number(timerSeconds) || 20,
      questions
    });
  };

  const TIMER_PRESETS = [10, 15, 20, 30, 45, 60];

  return (
    <div
      className="custom-quiz-creator-container"
      style={{
        width: '100%',
        maxWidth: '1040px',
        margin: '0 auto 40px auto',
        backgroundColor: 'rgba(8, 19, 34, 0.92)',
        backdropFilter: 'blur(12px)',
        border: '6px solid #000000',
        borderRadius: '24px',
        boxShadow: '12px 12px 0px #000000',
        padding: '20px 24px 32px 24px',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        boxSizing: 'border-box',
        animation: 'fadeInUp 0.3s ease-out forwards'
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '4px solid #000000',
          paddingBottom: '16px',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: '#32715C',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '4px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              flexShrink: 0
            }}
          >
            <BookOpen size={28} />
          </div>
          <div>
            <h2
              style={{
                fontSize: '1.85rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                margin: 0,
                color: '#ffffff'
              }}
            >
              Custom Quiz Room Creator
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.92rem', color: '#4E9F83', fontWeight: 700 }}>
              Craft your own questions, set timers & host a live spectator match!
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#081322',
              color: '#ffffff',
              border: '3px solid #000000',
              boxShadow: '4px 4px 0px #000000',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-2px, -2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translate(0px, 0px)')}
          >
            <ArrowLeft size={16} />
            Back to Lobby
          </button>
        )}
      </div>

      {errorNotice && (
        <div
          style={{
            backgroundColor: '#D32231',
            color: '#ffffff',
            border: '4px solid #000000',
            boxShadow: '6px 6px 0px #000000',
            borderRadius: '12px',
            padding: '12px 18px',
            fontWeight: 800,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <AlertCircle size={24} />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Row 1: Quiz Topic & Timer Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* Topic Input */}
        <div
          style={{
            backgroundColor: '#0b192c',
            border: '4px solid #000000',
            boxShadow: '6px 6px 0px #000000',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <label style={{ fontSize: '0.92rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFD700', letterSpacing: '0.5px' }}>
            1. Quiz Topic / Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g. World History Masters, Science & Tech, Marvel Universe..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#ffffff',
              backgroundColor: '#081322',
              border: '3px solid #000000',
              borderRadius: '10px',
              outline: 'none',
              boxShadow: '3px 3px 0px #000000'
            }}
          />
        </div>

        {/* Timer Per Question */}
        <div
          style={{
            backgroundColor: '#0b192c',
            border: '4px solid #000000',
            boxShadow: '6px 6px 0px #000000',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '0.92rem', fontWeight: 900, textTransform: 'uppercase', color: '#FFD700', letterSpacing: '0.5px' }}>
              2. Timer Per Question
            </label>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#32715C', backgroundColor: '#FAF6F0', padding: '2px 10px', borderRadius: '8px', border: '2px solid #000' }}>
              {timerSeconds}s
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {TIMER_PRESETS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setTimerSeconds(sec)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: timerSeconds === sec ? '3px solid #000000' : '2px solid #000000',
                  backgroundColor: timerSeconds === sec ? '#32715C' : '#081322',
                  color: timerSeconds === sec ? '#ffffff' : '#ffffff',
                  boxShadow: timerSeconds === sec ? '3px 3px 0px #000000' : '2px 2px 0px #000000',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transform: timerSeconds === sec ? 'translate(-1px, -1px)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {sec}s
              </button>
            ))}
            <input
              type="number"
              min="5"
              max="120"
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(Math.max(5, Math.min(120, Number(e.target.value) || 20)))}
              style={{
                width: '70px',
                padding: '6px 8px',
                backgroundColor: '#081322',
                color: '#ffffff',
                border: '2px solid #000000',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.9rem',
                textAlign: 'center',
                boxShadow: '2px 2px 0px #000000'
              }}
              title="Custom seconds"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Questions Deck Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '8px',
          borderBottom: '3px dashed #32715C'
        }}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', color: '#4E9F83', flexShrink: 0 }}>
          Questions ({questions.length}):
        </span>

        {questions.map((_, qIdx) => {
          const isActive = qIdx === activeQuestionIndex;
          return (
            <button
              key={qIdx}
              type="button"
              onClick={() => setActiveQuestionIndex(qIdx)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: isActive ? '3.5px solid #000000' : '2.5px solid #000000',
                backgroundColor: isActive ? '#D32231' : '#0b192c',
                color: '#ffffff',
                boxShadow: isActive ? '4px 4px 0px #000000' : '2px 2px 0px #000000',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer',
                flexShrink: 0,
                transform: isActive ? 'translate(-2px, -2px)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Q{qIdx + 1}
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleAddNewQuestion}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: '2.5px solid #000000',
            backgroundColor: '#32715C',
            color: '#ffffff',
            boxShadow: '3px 3px 0px #000000',
            fontWeight: 900,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-2px, -2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translate(0px, 0px)')}
        >
          <Plus size={16} strokeWidth={3} />
          Add Q{questions.length + 1}
        </button>
      </div>

      {/* Row 3: Current Question Editor Card */}
      <div
        style={{
          backgroundColor: '#FAF6F0',
          color: '#081322',
          border: '5px solid #000000',
          boxShadow: '8px 8px 0px #000000',
          borderRadius: '20px',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #000000', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                backgroundColor: '#D32231',
                color: '#ffffff',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px #000000',
                borderRadius: '8px',
                padding: '4px 12px',
                fontWeight: 900,
                fontSize: '1rem',
                textTransform: 'uppercase'
              }}
            >
              Editing Question #{activeQuestionIndex + 1} of {questions.length}
            </span>
          </div>

          {questions.length > 1 && (
            <button
              type="button"
              onClick={() => handleDeleteQuestion(activeQuestionIndex)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#D32231',
                color: '#ffffff',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                borderRadius: '8px',
                padding: '6px 12px',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={16} />
              Delete Question
            </button>
          )}
        </div>

        {/* Question Statement Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', color: '#081322' }}>
            Question Statement:
          </label>
          <textarea
            rows={3}
            required
            placeholder="Type your quiz question here... (e.g. Which planet in our solar system has the most moons?)"
            value={currentQ.question}
            onChange={(e) => handleUpdateCurrentQuestionText(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#081322',
              backgroundColor: '#ffffff',
              border: '3.5px solid #000000',
              borderRadius: '12px',
              outline: 'none',
              boxShadow: '4px 4px 0px #000000',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        {/* 4 Options Grid with Correct Answer Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', color: '#081322' }}>
              Options & Correct Answer:
            </label>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#32715C' }}>
              Click the radio/circle on the left to set that option as the CORRECT answer!
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '12px'
            }}
          >
            {[0, 1, 2, 3].map((optIdx) => {
              const letter = String.fromCharCode(65 + optIdx);
              const isCorrect = currentQ.correctAnswerIndex === optIdx;

              return (
                <div
                  key={optIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: isCorrect ? '#eaf4f0' : '#ffffff',
                    border: isCorrect ? '4px solid #1E824C' : '3px solid #000000',
                    boxShadow: isCorrect ? '0 0 12px rgba(30,130,76,0.3), 4px 4px 0px #000000' : '4px 4px 0px #000000',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Select as Correct Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectCorrectOption(optIdx)}
                    title={`Click to mark Option ${letter} as CORRECT`}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: isCorrect ? '#1E824C' : '#FAF6F0',
                      color: isCorrect ? '#ffffff' : '#000000',
                      border: '3px solid #000000',
                      boxShadow: '2px 2px 0px #000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    {isCorrect ? <CheckCircle2 size={20} strokeWidth={3} /> : letter}
                  </button>

                  <input
                    type="text"
                    required
                    placeholder={`Option ${letter}`}
                    value={currentQ.options[optIdx] || ''}
                    onChange={(e) => handleUpdateOption(optIdx, e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#081322',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none'
                    }}
                  />

                  {isCorrect && (
                    <span
                      style={{
                        backgroundColor: '#1E824C',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: '2px solid #000000',
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
        </div>

        {/* Explanation Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', color: '#444' }}>
            Explanation (Optional - shown after question reveal):
          </label>
          <input
            type="text"
            placeholder="e.g. Saturn has 146 confirmed moons, the most in the solar system."
            value={currentQ.explanation}
            onChange={(e) => handleUpdateExplanation(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#081322',
              backgroundColor: '#ffffff',
              border: '2.5px solid #000000',
              borderRadius: '10px',
              outline: 'none',
              boxShadow: '3px 3px 0px #000000'
            }}
          />
        </div>
      </div>

      {/* Row 4: Signature Design Action Buttons (Circle Green Teal & Diamond Red Tomato) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          marginTop: '10px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '50px',
            flexWrap: 'wrap'
          }}
        >
          {/* Green Teal Circle Create Room Button */}
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-circle-register"
            style={{
              width: '110px',
              height: '110px',
              backgroundColor: '#32715C',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={22} color="#000000" strokeWidth={2.5} />
            <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#000000', textAlign: 'center', lineHeight: 1.1 }}>
              CREATE<br />ROOM
            </span>
          </button>

          {/* Red Diamond Cancel / Back Button */}
          {onCancel && (
            <div
              className="btn-diamond-wrapper"
              onClick={onCancel}
              style={{
                width: '105px',
                height: '105px',
                backgroundColor: '#D32231',
                cursor: 'pointer'
              }}
            >
              <div className="btn-diamond-content">
                <ArrowLeft size={20} color="#000000" strokeWidth={2.5} />
                <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#000000' }}>
                  CANCEL
                </span>
              </div>
            </div>
          )}
        </div>

        <p style={{ margin: 0, fontSize: '0.85rem', color: '#4E9F83', fontWeight: 700, textAlign: 'center' }}>
          * When you click "CREATE ROOM", your lobby will open! As host, you act as spectator while at least 2 players join to compete.
        </p>
      </div>
    </div>
  );
}
