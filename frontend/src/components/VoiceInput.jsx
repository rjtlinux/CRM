import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

const VoiceInput = ({ onResult }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 56, right: 16 });
  const recognitionRef = useRef(null);
  const buttonRef = useRef(null);

  const browserSupportsVoice = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  useEffect(() => {
    if (!showPanel) return;
    const handleClickOutside = (e) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target)) {
        const panel = document.getElementById('voice-input-panel');
        if (panel && !panel.contains(e.target)) setShowPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanel]);

  const openPanel = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 320;
      const viewportWidth = window.innerWidth;
      // Position panel below button, right-aligned but never off-screen
      let right = viewportWidth - rect.right;
      if (right < 8) right = 8;
      setPanelPos({ top: rect.bottom + 8, right });
    }
    setShowPanel(prev => !prev);
  };

  const startListening = () => {
    setError('');
    setResponse(null);
    setTranscript('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'hi-IN';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      if (event.results[0].isFinal) {
        setIsListening(false);
        handleCommand(text);
      }
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow mic access.');
      } else if (e.error === 'no-speech') {
        setError('Koi awaaz nahi aayi. Phir se try karein.');
      } else {
        setError('Voice recognition error. Text box use karein.');
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

  const handleCommand = async (text) => {
    if (!text.trim()) return;
    setProcessing(true);
    setError('');
    setResponse(null);
    try {
      const res = await api.post('/ai/voice-command', { text, language: 'hi' });
      setResponse(res.data);
      onResult?.(res.data);
      // Auto-speak response if browser supports it
      if (res.data.response && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(res.data.response);
        utterance.lang = 'hi-IN';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      setError(e.response?.data?.response || 'Kuch gadbad ho gayi. Dobara try karein.');
    } finally {
      setProcessing(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setTranscript(textInput);
    handleCommand(textInput);
    setTextInput('');
  };

  const getResultDisplay = () => {
    if (!response?.result) return null;
    const r = response.result;
    if (r.type === 'balance') return `${r.customer}: ₹${parseFloat(r.outstanding).toLocaleString('en-IN')} outstanding`;
    if (r.type === 'udhar') return `Udhar recorded ✓ | Total: ₹${parseFloat(r.total_outstanding).toLocaleString('en-IN')}`;
    if (r.type === 'sale') return `Sale recorded ✓ | ₹${parseFloat(r.amount).toLocaleString('en-IN')}`;
    if (r.type === 'payment') return `Payment recorded ✓ | Remaining: ₹${parseFloat(r.remaining_balance).toLocaleString('en-IN')}`;
    if (r.type === 'sales_summary') return `Today: ₹${parseFloat(r.today?.total || 0).toLocaleString('en-IN')} | Month: ₹${parseFloat(r.month?.total || 0).toLocaleString('en-IN')}`;
    return null;
  };

  return (
    <div className="relative">
      {/* Mic Button */}
      <button
        ref={buttonRef}
        onClick={openPanel}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title="AI Voice Assistant"
      >
        <span className="text-base">{isListening ? '⏹' : '🎤'}</span>
        <span className="hidden sm:inline">{isListening ? 'Listening...' : 'AI Assistant'}</span>
      </button>

      {/* Panel - fixed so it escapes any parent overflow */}
      {showPanel && (
        <div
          id="voice-input-panel"
          className="fixed z-[200] w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          style={{ top: panelPos.top, right: panelPos.right }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 flex justify-between items-center">
            <div>
              <div className="font-semibold text-sm">🤖 AI Voice Assistant</div>
              <div className="text-xs opacity-80">Hindi / English / Hinglish</div>
            </div>
            <button onClick={() => setShowPanel(false)} className="text-white hover:text-gray-200 text-lg">×</button>
          </div>

          <div className="p-4 space-y-3">
            {/* Examples */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
              <div className="font-medium text-gray-700 mb-1">Try saying:</div>
              {[
                '"Ramesh ko 5000 ka maal diya"',
                '"Suresh ne 3000 rupay diye"',
                '"Ramesh ka balance kya hai"',
                '"Aaj kitni sale hui"',
              ].map((ex) => (
                <div
                  key={ex}
                  onClick={() => { setTextInput(ex.replace(/"/g, '')); }}
                  className="cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {ex}
                </div>
              ))}
            </div>

            {/* Voice Button */}
            {browserSupportsVoice && (
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={processing}
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isListening ? '⏹ Stop Listening' : '🎤 Bolein (Click to Speak)'}
              </button>
            )}

            {/* Transcript display */}
            {transcript && (
              <div className="bg-blue-50 rounded-lg p-2 text-sm text-blue-800">
                <span className="font-medium">Aap: </span>{transcript}
              </div>
            )}

            {/* Text input fallback */}
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ya type karein..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={processing}
              />
              <button
                type="submit"
                disabled={processing || !textInput.trim()}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {processing ? '⏳' : '→'}
              </button>
            </form>

            {/* Processing */}
            {processing && (
              <div className="text-center text-sm text-gray-500 py-2">
                <div className="inline-block animate-spin mr-2">⏳</div>
                AI process kar raha hai...
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Response */}
            {response && !error && (
              <div className={`rounded-lg p-3 text-sm ${response.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="font-semibold mb-1 text-gray-800">
                  {response.success ? '✅' : '⚠️'} AI:
                </div>
                <div className="text-gray-700">{response.response}</div>
                {getResultDisplay() && (
                  <div className="mt-2 text-xs font-medium text-green-700 bg-green-100 rounded px-2 py-1">
                    {getResultDisplay()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
