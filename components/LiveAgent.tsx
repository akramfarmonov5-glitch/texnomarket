import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import { useMenu } from '../context/MenuContext';
import { api } from '../utils/api';

type RecognitionResultLike = ArrayLike<{ transcript?: string }>;
type RecognitionEventLike = { results: ArrayLike<RecognitionResultLike> };
type RecognitionErrorLike = { error?: string };
type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type WindowWithSpeech = Window & {
  SpeechRecognition?: new () => RecognitionLike;
  webkitSpeechRecognition?: new () => RecognitionLike;
};

const getRecognitionCtor = () => {
  const speechWindow = window as WindowWithSpeech;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
};

const collectTranscript = (event: RecognitionEventLike) => {
  const chunks: string[] = [];
  for (let i = 0; i < event.results.length; i += 1) {
    const item = event.results[i];
    if (!item || item.length === 0) continue;
    chunks.push(String(item[0]?.transcript || '').trim());
  }
  return chunks.join(' ').trim();
};

const LiveAgent: React.FC = () => {
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const { products } = useMenu();

  const productsRef = useRef(products);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const activeRef = useRef(active);
  const speakingRef = useRef(speaking);
  const processingRef = useRef(processing);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);
  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  const startListening = useCallback(() => {
    if (!activeRef.current || speakingRef.current || processingRef.current) return;
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.start();
    } catch {
      // Ignore repeated-start errors from browser speech engines.
    }
  }, []);

  const speakText = useCallback(async (text: string) => {
    const cleaned = String(text || '').trim();
    if (!cleaned || !('speechSynthesis' in window)) return;

    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'uz-UZ';
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        resolve();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        resolve();
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const stopAssistant = useCallback(() => {
    setActive(false);
    setListening(false);
    setProcessing(false);
    setSpeaking(false);
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.abort();
      } catch {
        // Ignore abort errors.
      }
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const handleTranscript = useCallback(
    async (transcript: string) => {
      const message = String(transcript || '').trim();
      if (!message) {
        if (activeRef.current) setTimeout(startListening, 200);
        return;
      }

      setProcessing(true);
      try {
        const answer = await api.askAssistant({
          message,
          menu: productsRef.current.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
          })),
        });
        await speakText(answer.answer);
      } catch {
        await speakText("Kechirasiz, hozir AI xizmatida xatolik bo'ldi. Birozdan keyin qayta urinib ko'ring.");
      } finally {
        setProcessing(false);
        if (activeRef.current) setTimeout(startListening, 200);
      }
    },
    [speakText, startListening]
  );

  const ensureRecognition = useCallback(() => {
    if (recognitionRef.current) return recognitionRef.current;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'uz-UZ';
    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      if (activeRef.current && !speakingRef.current && !processingRef.current) {
        setTimeout(startListening, 250);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        alert('Mikrofondan foydalanish uchun brauzerda ruxsat bering.');
        stopAssistant();
      }
    };
    recognition.onresult = (event) => {
      const transcript = collectTranscript(event);
      void handleTranscript(transcript);
    };
    recognitionRef.current = recognition;
    return recognition;
  }, [handleTranscript, startListening, stopAssistant]);

  const startAssistant = useCallback(() => {
    const recognition = ensureRecognition();
    if (!recognition) {
      alert("Bu brauzer ovozli kiritishni qo'llab-quvvatlamaydi.");
      return;
    }
    setActive(true);
    setSpeaking(false);
    setProcessing(false);
    startListening();
  }, [ensureRecognition, startListening]);

  useEffect(() => {
    return () => {
      stopAssistant();
    };
  }, [stopAssistant]);

  const tooltipText = processing
    ? "AI o'ylayapti..."
    : speaking
      ? 'AI javob bermoqda...'
      : listening
        ? 'AI eshityapti...'
        : 'AI tayyor';

  return (
    <div className="fixed bottom-24 lg:bottom-10 right-4 lg:right-10 z-50">
      <button
        onClick={active ? stopAssistant : startAssistant}
        className={`w-16 h-16 md:w-20 md:h-20 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95 ${
          active
            ? 'bg-white text-red-600 border-4 border-red-600 animate-pulse'
            : 'bg-gradient-to-br from-red-600 to-red-700 text-white hover:shadow-red-300 hover:scale-110'
        }`}
      >
        {processing ? (
          <Loader2 className="animate-spin w-8 h-8" />
        ) : active ? (
          speaking ? <Volume2 className="animate-bounce w-8 h-8" /> : <Mic className="w-8 h-8" />
        ) : (
          <MicOff className="w-8 h-8" />
        )}
      </button>

      {active && (
        <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-3 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
          {tooltipText}
        </div>
      )}
    </div>
  );
};

export default LiveAgent;
