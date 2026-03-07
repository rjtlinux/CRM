import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

// ── Recording state machine ─────────────────────────────────────────
// idle → recording → processing → idle
// Can also type text directly (always available)

const VoiceInput = ({ onResult, fullWidth = false }) => {
  const [status, setStatus] = useState('idle'); // idle | recording | processing
  const [showPanel, setShowPanel] = useState(false);
  const [panelPos, setPanelPos] = useState({});
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState([]);   // display: {role, content, transcript?}
  const [apiMessages, setApiMessages] = useState([]); // for API history

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!showPanel) return;
    const handleOutside = (e) => {
      if (buttonRef.current?.contains(e.target)) return;
      if (document.getElementById('voice-panel')?.contains(e.target)) return;
      setShowPanel(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showPanel]);

  const calcPanelPos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const W = 360, vw = window.innerWidth, vh = window.innerHeight;
    let top = rect.bottom + 8;
    if (top + 560 > vh) top = Math.max(8, rect.top - 560);
    const pos = rect.left < vw / 2
      ? { top, left: Math.min(rect.right + 8, vw - W - 8) }
      : { top, right: Math.max(vw - rect.right, 8) };
    setPanelPos(pos);
  };

  const togglePanel = () => {
    calcPanelPos();
    setShowPanel(v => !v);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  // ── Audio recording via MediaRecorder (high quality) ──────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size > 1000) {  // ignore empty recordings
          sendAudio(blob, mimeType);
        } else {
          setStatus('idle');
        }
      };

      recorder.start(100); // collect data every 100ms
      mediaRecorderRef.current = recorder;
      setStatus('recording');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        addAiMsg('Microphone ki permission nahi mili. Browser settings mein mic allow karein.');
      } else {
        addAiMsg('Mic start nahi ho paya. Type karke bhi likh sakte ho neeche.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setStatus('processing');
    }
  };

  const sendAudio = async (blob, mimeType) => {
    setStatus('processing');
    const formData = new FormData();
    formData.append('audio', blob, `recording.${mimeType.includes('ogg') ? 'ogg' : 'webm'}`);
    formData.append('messages', JSON.stringify(apiMessages));
    await callApi(formData, true);
  };

  // ── Text send ──────────────────────────────────────────────────────
  const handleTextSend = async (e) => {
    e?.preventDefault();
    const t = textInput.trim();
    if (!t || status === 'processing') return;
    setTextInput('');
    addUserMsg(t);
    setStatus('processing');
    await callApi({ text: t, messages: JSON.stringify(apiMessages) }, false);
  };

  const sendExample = (ex) => {
    if (status === 'processing') return;
    addUserMsg(ex);
    setStatus('processing');
    callApi({ text: ex, messages: JSON.stringify(apiMessages) }, false);
  };

  // ── Core API call ──────────────────────────────────────────────────
  const callApi = async (payload, isFormData) => {
    try {
      const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
      const body = isFormData ? payload : payload;

      const res = await api.post('/ai/voice-command', body, config);
      const data = res.data;

      // Show what Whisper heard (transcript) if it came from audio
      if (data.transcript) {
        setMessages(prev => {
          // If last message is a temp "recording..." placeholder, replace it
          const last = prev[prev.length - 1];
          if (last?.role === 'user' && last?.isPlaceholder) {
            return [...prev.slice(0, -1), { role: 'user', content: data.transcript }];
          }
          return [...prev, { role: 'user', content: data.transcript }];
        });
      }

      const aiText = data.response || 'Ho gaya!';
      addAiMsg(aiText);

      if (data.messages) {
        setApiMessages(data.messages);
      } else {
        setApiMessages(prev => [
          ...prev,
          { role: 'user', content: data.transcript || (isFormData ? '[audio]' : payload.text) },
          { role: 'assistant', content: aiText },
        ].slice(-14));
      }

      if (data.success && onResult) onResult(data);

      // Speak response with Indian Hindi voice
      speak(aiText);
    } catch (err) {
      const msg = err.response?.data?.response || 'Network error. Internet check karo aur dobara try karo.';
      addAiMsg(msg);
    } finally {
      setStatus('idle');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────
  const addUserMsg = (content, isPlaceholder = false) => {
    setMessages(prev => [...prev, { role: 'user', content, isPlaceholder }]);
  };
  const addAiMsg = (content) => {
    setMessages(prev => [...prev, { role: 'assistant', content }]);
  };

  const speak = (text) => {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Try to find Hindi voice
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang === 'hi-IN') || voices.find(v => v.lang.startsWith('hi'));
    if (hindiVoice) u.voice = hindiVoice;
    u.lang = 'hi-IN';
    u.rate = 1.0;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  };

  const resetConversation = () => {
    setMessages([]);
    setApiMessages([]);
    window.speechSynthesis?.cancel();
  };

  const handleMicClick = () => {
    if (status === 'recording') {
      stopRecording();
    } else if (status === 'idle') {
      // Add a placeholder while recording
      addUserMsg('🎤 Recording...', true);
      startRecording();
    }
  };

  const examples = [
    'Ramesh ko ₹5000 ka cement diya',
    'Suresh ne ₹3000 rupay diye',
    'Ramesh ka balance kya hai?',
    'Aaj ki total sale kitni hui?',
    'Raj Hardware ko naya customer add karo',
  ];

  const isProcessing = status === 'processing';
  const isRecording = status === 'recording';

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={togglePanel}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${fullWidth ? 'w-full justify-center' : ''}
          bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700`}
        title="AI Voice Assistant"
      >
        <span>🎤</span>
        <span className={fullWidth ? '' : 'hidden sm:inline'}>AI Assistant</span>
      </button>

      {/* Panel */}
      {showPanel && (
        <div
          id="voice-panel"
          className="fixed z-[200] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ ...panelPos, width: 360, maxHeight: 560 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-lg">🤖</div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-indigo-700"></div>
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Buzeye AI</div>
                <div className="text-blue-200 text-xs">Hindi · English · Hinglish</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {messages.length > 0 && (
                <button
                  onClick={resetConversation}
                  className="text-blue-200 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white hover:bg-opacity-15 transition-all"
                >
                  Nayi Baat
                </button>
              )}
              <button onClick={() => setShowPanel(false)} className="text-blue-200 hover:text-white text-2xl leading-none w-8 text-center">×</button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-gray-50 min-h-0">
            {messages.length === 0 ? (
              <div className="p-4 space-y-2">
                <p className="text-xs text-gray-400 font-medium mb-3 text-center">Bolein ya tap karein kisi example ko:</p>
                {examples.map(ex => (
                  <button
                    key={ex}
                    onClick={() => sendExample(ex)}
                    disabled={isProcessing}
                    className="w-full text-left text-xs bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all disabled:opacity-40 shadow-sm"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5 shadow-sm">
                        AI
                      </div>
                    )}
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm
                      ${msg.role === 'user'
                        ? `bg-blue-600 text-white rounded-tr-sm ${msg.isPlaceholder ? 'opacity-60 italic' : ''}`
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm">AI</div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1.5 items-center">
                        {[0, 160, 320].map(d => (
                          <div key={d} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Recording animation bar */}
          {isRecording && (
            <div className="flex-shrink-0 bg-red-50 border-t border-red-100 px-4 py-2 flex items-center gap-3">
              <div className="flex gap-1 items-center">
                {[0, 80, 160, 240, 320].map(d => (
                  <div
                    key={d}
                    className="w-1 bg-red-400 rounded-full animate-pulse"
                    style={{ height: `${8 + Math.random() * 16}px`, animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
              <span className="text-sm text-red-600 font-medium flex-1">Bol rahe hain... (stop ke liye mic dobara dabayen)</span>
            </div>
          )}

          {/* Input Area */}
          <div className="flex-shrink-0 bg-white border-t border-gray-100 p-3">
            <div className="flex items-center gap-2">
              {/* Mic button */}
              <button
                onClick={handleMicClick}
                disabled={isProcessing}
                className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 shadow-sm
                  ${isRecording
                    ? 'bg-red-500 text-white scale-110 animate-pulse'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:scale-105'
                  }`}
                title={isRecording ? 'Stop karo' : 'Bolein (Whisper AI)'}
              >
                {isRecording ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>

              {/* Text input */}
              <form onSubmit={handleTextSend} className="flex flex-1 gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder={isRecording ? 'Recording...' : 'Ya type karein...'}
                  disabled={isProcessing || isRecording}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  disabled={isProcessing || isRecording || !textInput.trim()}
                  className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:scale-105 transition-all shadow-sm flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-2">
              {isRecording ? '🔴 Recording with Whisper AI — stop karenye ke liye mic button dabayen' : 'Mic = Whisper AI (best quality) · Type = text input'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
