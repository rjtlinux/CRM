import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

const VoiceInput = ({ onResult, fullWidth = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [panelPos, setPanelPos] = useState({});
  const [textInput, setTextInput] = useState('');

  // messages: { role: 'user'|'assistant', content: string }[]
  // This is also what gets sent to the API as conversation history
  const [messages, setMessages] = useState([]);
  const [apiMessages, setApiMessages] = useState([]); // full history for API

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
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let top = rect.bottom + 8;
      if (top + 540 > vh) top = Math.max(8, rect.top - 540);
      const pos = rect.left < vw / 2
        ? { top, left: Math.min(rect.right + 8, vw - panelWidth - 8) }
        : { top, right: Math.max(vw - rect.right, 8) };
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
    recognition.maxAlternatives = 3; // try multiple alternatives for better accuracy

    recognition.onresult = (event) => {
      // Pick highest confidence result
      let best = event.results[0][0].transcript;
      let bestConf = event.results[0][0].confidence;
      for (let i = 1; i < event.results[0].length; i++) {
        if (event.results[0][i].confidence > bestConf) {
          bestConf = event.results[0][i].confidence;
          best = event.results[0][i].transcript;
        }
      }
      setIsListening(false);
      handleSend(best);
    };
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed') {
        addMsg('assistant', 'Mic ki permission nahi mili. Browser mein mic allow karein please.');
      } else if (e.error !== 'no-speech') {
        addMsg('assistant', 'Awaaz nahi sun paya. Phir se try karein ya neeche type karein.');
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

  const addMsg = (role, content) => {
    setMessages(prev => [...prev, { role, content }]);
  };

  const handleSend = async (text) => {
    const trimmed = (text || textInput).trim();
    if (!trimmed || processing) return;
    setTextInput('');
    addMsg('user', trimmed);
    setProcessing(true);

    try {
      const res = await api.post('/ai/voice-command', {
        text: trimmed,
        messages: apiMessages, // send full history
      });

      const data = res.data;
      const aiText = data.response || 'Kuch hua. Dobara try karein.';

      addMsg('assistant', aiText);

      // Update API message history from server response
      if (data.messages) {
        setApiMessages(data.messages);
      } else {
        // Fallback: manually update
        setApiMessages(prev => [
          ...prev,
          { role: 'user', content: trimmed },
          { role: 'assistant', content: aiText },
        ].slice(-12));
      }

      if (data.success && onResult) onResult(data);

      // Speak response
      if (aiText && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(aiText);
        u.lang = 'hi-IN';
        u.rate = 0.95;
        u.pitch = 1.0;
        window.speechSynthesis.speak(u);
      }
    } catch {
      addMsg('assistant', 'Network error aaya. Internet check karein aur dobara try karein.');
    } finally {
      setProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setApiMessages([]);
    window.speechSynthesis?.cancel();
  };

  const examples = [
    'Ramesh ko 5000 ka cement diya',
    'Suresh ne 3000 rupay diye',
    'Ramesh ka balance kya hai?',
    'Aaj kitni sale hui?',
    'Naya customer add karo — Raj Hardware',
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={openPanel}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${fullWidth ? 'w-full justify-center' : ''}
          ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        title="AI Voice Assistant"
      >
        <span>🎤</span>
        <span className={fullWidth ? '' : 'hidden sm:inline'}>AI Assistant</span>
      </button>

      {showPanel && (
        <div
          id="voice-input-panel"
          className="fixed z-[200] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ ...panelPos, width: 340, maxHeight: 520 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm">🤖</div>
              <div>
                <div className="font-semibold text-sm">AI Voice Assistant</div>
                <div className="text-xs opacity-70">Hindi · English · Hinglish</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleReset}
                  title="Nayi baat shuru karein"
                  className="text-xs text-white opacity-60 hover:opacity-100 px-2 py-1 rounded hover:bg-white hover:bg-opacity-20 transition-all"
                >
                  Nayi Baat
                </button>
              )}
              <button onClick={() => setShowPanel(false)} className="text-white opacity-60 hover:opacity-100 text-xl leading-none w-7 text-center">×</button>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-gray-50 min-h-0">
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium mb-3">Bolein ya try karein:</p>
                {examples.map(ex => (
                  <button
                    key={ex}
                    onClick={() => handleSend(ex)}
                    disabled={processing}
                    className="w-full text-left text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all disabled:opacity-40"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5">
                        AI
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed
                      ${msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {processing && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">AI</div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center">
                        {[0, 140, 280].map(d => (
                          <div key={d} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 bg-white border-t border-gray-100 flex-shrink-0 space-y-2">
            <div className="flex gap-2 items-center">
              {browserSupportsVoice && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={processing}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all text-base
                    ${isListening ? 'bg-red-500 text-white shadow-lg scale-110' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}
                    disabled:opacity-40`}
                  title={isListening ? 'Rokein' : 'Bolo'}
                >
                  {isListening ? '⏹' : '🎤'}
                </button>
              )}
              <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex flex-1 gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Ya type karein..."
                  disabled={processing}
                  className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
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
              <p className="text-center text-xs text-red-500 animate-pulse">● Listening... Hindi/English/Hinglish</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
