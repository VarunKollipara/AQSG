import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Loader2, User, Bot } from 'lucide-react';
import { sendChat, sendVoice } from '../api';
import type { ChatMessage, TestCase } from '../types';

interface Props {
  messages: ChatMessage[];
  onNewMessages: (msgs: ChatMessage[]) => void;
  onTestCasesUpdate: (testCases: TestCase[]) => void;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export default function ChatPanel({ messages, onNewMessages, onTestCasesUpdate, disabled }: Props) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordError, setRecordError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessages = useCallback(
    (...newMsgs: ChatMessage[]) => {
      onNewMessages([...messages, ...newMsgs]);
    },
    [messages, onNewMessages]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isSending) return;
      setIsSending(true);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };
      onNewMessages([...messages, userMsg]);
      setInput('');

      try {
        const data = await sendChat(text.trim());

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        onNewMessages([...messages, userMsg, assistantMsg]);

        if (data.test_cases?.length) {
          onTestCasesUpdate(data.test_cases);
        }
      } catch (e) {
        const errMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ ' + (e instanceof Error ? e.message : 'Failed to get a response.'),
          timestamp: new Date(),
        };
        onNewMessages([...messages, userMsg, errMsg]);
      } finally {
        setIsSending(false);
      }
    },
    [messages, isSending, onNewMessages, onTestCasesUpdate]
  );

  const startRecording = useCallback(async () => {
    setRecordError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecordingState('processing');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const data = await sendVoice(blob);

          const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: `🎙️ ${data.transcription}`,
            timestamp: new Date(),
          };
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.agent_response,
            timestamp: new Date(),
          };
          addMessages(userMsg, assistantMsg);

          if (data.test_cases?.length) {
            onTestCasesUpdate(data.test_cases);
          }
        } catch (e) {
          setRecordError('Voice processing failed: ' + (e instanceof Error ? e.message : 'unknown error'));
        } finally {
          setRecordingState('idle');
        }
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecordingState('recording');
    } catch {
      setRecordError('Microphone access denied.');
    }
  }, [addMessages, onTestCasesUpdate]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 shrink-0">
        <h2 className="text-sm font-semibold text-gray-200">Refinement Chat</h2>
        <p className="text-xs text-gray-500 mt-0.5">Refine with text or voice — new cases update the table</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
              <Bot size={22} className="text-violet-400" />
            </div>
            <p className="text-sm text-gray-400 max-w-xs">
              Ask me to add, refine, or expand test cases. New cases appear instantly in the table.
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>"Add a test case for API timeout handling"</p>
              <p>"Generate more HIPAA compliance test cases"</p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-violet-600' : 'bg-gray-800'}`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} className="text-violet-400" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-tr-sm'
                : 'bg-gray-800 text-gray-200 rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {(isSending || recordingState === 'processing') && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
              <Bot size={14} className="text-violet-400" />
            </div>
            <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {recordError && (
        <div className="mx-4 mb-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {recordError}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-4 border-t border-gray-800 shrink-0">
        {recordingState === 'recording' && (
          <div className="flex items-center gap-2 mb-3 text-xs text-red-400">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Recording… click the mic to stop
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add test cases, refine steps…"
            disabled={disabled || isSending || recordingState !== 'idle'}
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-violet-500 disabled:opacity-50 leading-relaxed"
            style={{ minHeight: '42px', maxHeight: '120px' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={recordingState === 'recording' ? stopRecording : startRecording}
            disabled={disabled || isSending || recordingState === 'processing'}
            title={recordingState === 'recording' ? 'Stop recording' : 'Start voice input'}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              recordingState === 'recording'
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
            } disabled:opacity-50`}
          >
            {recordingState === 'processing' ? (
              <Loader2 size={16} className="text-violet-400 animate-spin" />
            ) : recordingState === 'recording' ? (
              <MicOff size={16} className="text-white" />
            ) : (
              <Mic size={16} className="text-gray-400" />
            )}
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isSending || disabled || recordingState !== 'idle'}
            className="w-10 h-10 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          >
            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
