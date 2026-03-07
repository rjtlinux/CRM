import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

const VoiceInput = ({ onResult, fullWidth = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [panelPos, setPanelPos] = useState({});
  const [textInput, setTextInput] = useState('');

  // Conversation state
  const [messages, setMessages] = useState([]); // { role: 'user'|'ai', text: string, status: 'ok'|'question'|'error' }
  const [conversationHistory, setConversationHistory] = useState([]);
  const [pendingAction, setPendingAction] = useState(null); // waiting for yes/no

  const recognitionRef = useRef(null);
  const buttonRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const browserSupportsVoice = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!showPanel) return;
    const handleClickOutside = (e) => {
      if (buttonRef.current?.contains(e.target)) return;
      const panel = document.getElementById('voice-input-panel');
      if (panel && !panel.contains(e.target)) setShowPanel(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanel]);

  const openPanel = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 340;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let top = rect.bottom + 8;
      if (top + 540 > viewportHeight) top = Math.max(8, rect.top - 540);
      let pos;
      if (rect.left < viewportWidth / 2) {
        const left = Math.min(rect.right + 8, viewportWidth - panelWidth - 8);
        pos = { top, left };
      } else {
        const right = Math.max(viewportWidth - rect.right, 8);
        pos = { top, right };
      }
      setPanelPos(pos);
    }
    setShowPanel(prev => !prev);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setIsListening(false);
      handleSend(text);
    };
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed') {
        addMessage('ai', 'Mic permission nahi mili. Please allow microphone access.', 'error');
      } else if (e.error !== 'no-speech') {
        addMessage('ai', 'Awaaz nahi sun paya. Phir se try karein ya type karein.', 'error');
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const addMessage = (role, text, status = 'ok') => {
    setMessages(prev => [...prev, { role, text, status }]);
  };

  const handleSend = async (text) => {
    const trimmed = (text || textInput).trim();
    if (!trimmed) return;
    setTextInput('');
    addMessage('user', trimmed);
    setProcessing(true);

    try {
      const res = await api.post('/ai/voice-command', {
        text: trimmed,
        conversationHistory,
        pendingAction,
      });

      const data = res.data;

      // Update conversation history for multi-turn
      if (data.conversationHistory) {
        setConversationHistory(data.conversationHistory);
      }

      // Store pending action if AI is asking a follow-up question
      if (data.pendingAction) {
        setPendingAction(data.pendingAction);
      } else if (data.clearHistory) {
        setConversationHistory([]);
        setPendingAction(null);
      }

      const status = data.type === 'question' ? 'question' : data.success ? 'ok' : 'error';
      addMessage('ai', data.response, status);

      // Notify parent on successful action
      if (data.success && onResult) onResult(data);

      // Auto-speak response
      if (data.response && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.lang = 'hi-IN';
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      addMessage('ai', 'Network error aaya. Dobara try karein.', 'error');
    } finally {
      setProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setConversationHistory([]);
    setPendingAction(null);
    window.speechSynthesis?.cancel();
  };

  const examples = [
    'Ramesh ko 5000 ka maal diya',
    'Suresh ne 3000 rupay diye',
    'Ramesh ka balance kya hai',
    'Aaj kitni sale hui',
  ];

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={openPanel}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          fullWidth ? 'w-full justify-center' : ''
        } ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        title="AI Voice Assistant"
      >
        <span className="text-base">🎤</span>
        <span className={fullWidth ? '' : 'hidden sm:inline'}>AI Assistant</span>
      </button>

      {/* Floating Panel */}
      {showPanel && (
        <div
          id="voice-input-panel"
          className="fixed z-[200] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ ...panelPos, width: 340, maxHeight: 520 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-base">🤖</div>
              <div>
                <div className="font-semibold text-sm">AI Voice Assistant</div>
                <div className="text-xs opacity-75">Hindi · English · Hinglish</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleReset}
                  className="text-white opacity-70 hover:opacity-100 text-xs px-2 py-1 rounded hover:bg-white hover:bg-opacity-20 transition-all"
                  title="New conversation"
                >
                  New
                </button>
              )}
              <button onClick={() => setShowPanel(false)} className="text-white opacity-70 hover:opacity-100 text-xl leading-none px-1">×</button>
            </div>
          </div>

          {/* Messages / Initial State */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 min-h-0">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-medium">Bolein ya type karein:</p>
                {examples.map(ex => (
                  <button
                    key={ex}
                    onClick={() => handleSend(ex)}
                    disabled={processing}
                    className="w-full text-left text-xs bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all disabled:opacity-50"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-[10px] mr-2 mt-1 flex-shrink-0">
                      AI
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : msg.status === 'question'
                        ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-bl-sm'
                        : msg.status === 'error'
                        ? 'bg-red-50 border border-red-200 text-red-800 rounded-bl-sm'
                        : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.status === 'question' && <span className="text-amber-600 mr-1">❓</span>}
                    {msg.status === 'ok' && msg.role === 'ai' && <span className="text-green-600 mr-1">✅</span>}
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {processing && (
              <div className="flex justify-start">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-[10px] mr-2 flex-shrink-0">AI</div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick yes/no when pending action */}
          {pendingAction && !processing && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleSend('haan')}
                className="flex-1 bg-green-600 text-white text-sm py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                ✓ Haan, Add Karo
              </button>
              <button
                onClick={() => handleSend('nahi')}
                className="flex-1 bg-gray-200 text-gray-700 text-sm py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                ✗ Nahi
              </button>
            </div>
          )}

          {/* Input Row */}
          <div className="px-3 py-3 bg-white border-t border-gray-100 flex-shrink-0">
            <div className="flex gap-2 items-center">
              {browserSupportsVoice && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={processing}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  } disabled:opacity-50`}
                  title={isListening ? 'Rokein' : 'Bolein'}
                >
                  {isListening ? '⏹' : '🎤'}
                </button>
              )}
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex-1 flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder={pendingAction ? 'Haan ya nahi...' : 'Ya type karein...'}
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={processing}
                />
                <button
                  type="submit"
                  disabled={processing || !textInput.trim()}
                  className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
            {isListening && (
              <div className="text-center text-xs text-red-500 mt-2 animate-pulse">
                ● Listening... (Hindi/English/Hinglish)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
