import { useState, useCallback } from 'react';
import { FileText, Upload } from 'lucide-react';
import ChatPanel from './ChatPanel';
import TestCasesPanel from './TestCasesPanel';
import type { ChatMessage, UploadedFile, TestCase } from '../types';

interface Props {
  uploadedFile: UploadedFile;
  initialTestCases: TestCase[];
  onReset: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** Merge incoming test cases into the existing list. Replace by ID, append new. */
function mergeTestCases(prev: TestCase[], incoming: TestCase[]): TestCase[] {
  if (!incoming.length) return prev;
  const updated = [...prev];
  for (const tc of incoming) {
    const idx = updated.findIndex((e) => e.id === tc.id);
    if (idx >= 0) {
      updated[idx] = tc;
    } else {
      updated.push(tc);
    }
  }
  return updated;
}

export default function WorkspacePage({ uploadedFile, initialTestCases, onReset }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>(initialTestCases);

  const handleTestCasesUpdate = useCallback((incoming: TestCase[]) => {
    setTestCases((prev) => mergeTestCases(prev, incoming));
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Top Bar */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <FileText size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">AQSG</span>
          <span className="text-gray-700">·</span>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-4 h-4 rounded bg-gray-800 flex items-center justify-center">
              <FileText size={10} className="text-violet-400" />
            </div>
            <span className="font-medium text-gray-300">{uploadedFile.name}</span>
            <span className="text-gray-600">{formatBytes(uploadedFile.size)}</span>
          </div>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Upload size={13} />
          New document
        </button>
      </header>

      {/* Split Panel */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Chat */}
        <div className="w-[380px] shrink-0 border-r border-gray-800 flex flex-col min-h-0">
          <ChatPanel
            messages={messages}
            onNewMessages={setMessages}
            onTestCasesUpdate={handleTestCasesUpdate}
          />
        </div>

        {/* Right: Test Cases table */}
        <div className="flex-1 flex flex-col min-h-0">
          <TestCasesPanel testCases={testCases} />
        </div>
      </div>
    </div>
  );
}
