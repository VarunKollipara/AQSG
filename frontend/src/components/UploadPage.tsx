import { useState, useCallback, useRef } from 'react';
import { UploadCloud, FileText, Loader2, AlertCircle } from 'lucide-react';
import { uploadDocument } from '../api';
import type { UploadedFile, TestCase } from '../types';

const ACCEPTED_TYPES = ['.pdf', '.docx', '.md', '.csv'];
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/csv',
  'text/plain',
];

interface Props {
  onUploadSuccess: (file: UploadedFile, testCases: TestCase[]) => void;
}

export default function UploadPage({ onUploadSuccess }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
      setError(`Unsupported file type. Please upload a ${ACCEPTED_TYPES.join(', ')} file.`);
      return;
    }
    setIsUploading(true);
    try {
      const data = await uploadDocument(file);
      onUploadSuccess({ name: file.name, size: file.size, type: file.type }, data.test_cases ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-8 py-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <FileText size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight">AQSG</h1>
          <p className="text-xs text-gray-500">Agentic QA Scenario Generator</p>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-12">
        <div className="text-center max-w-xl">
          <h2 className="text-4xl font-bold tracking-tight mb-3">
            Turn requirements into<br />
            <span className="text-violet-400">test cases instantly</span>
          </h2>
          <p className="text-gray-400 text-base leading-relaxed">
            Upload your requirement document and let the AI agent generate comprehensive
            test scenarios, edge cases, and domain-specific compliance checks.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onClick={() => !isUploading && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={[
            'w-full max-w-lg border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200',
            isDragging
              ? 'border-violet-500 bg-violet-500/10 scale-[1.02]'
              : 'border-gray-700 hover:border-violet-600 hover:bg-gray-900',
            isUploading ? 'pointer-events-none opacity-70' : '',
          ].join(' ')}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={onInputChange}
          />
          {isUploading ? (
            <Loader2 size={40} className="text-violet-400 animate-spin" />
          ) : (
            <UploadCloud size={40} className={isDragging ? 'text-violet-400' : 'text-gray-500'} />
          )}
          <div className="text-center">
            {isUploading ? (
              <p className="text-sm text-violet-300 font-medium">Uploading & processing document…</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-200">
                  Drop your document here, or <span className="text-violet-400">browse</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports {ACCEPTED_TYPES.join(', ')} · up to 50+ pages
                </p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 max-w-lg w-full">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 text-xs text-gray-500">
          {[
            '🧠 Domain-aware edge cases',
            '🔒 HIPAA / FinTech / E-commerce aware',
            '🎙️ Voice & text refinement',
            '📤 Export to JSON / CSV',
          ].map((f) => (
            <span key={f} className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-full">
              {f}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
