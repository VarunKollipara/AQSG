import { useState } from 'react';
import UploadPage from './components/UploadPage';
import WorkspacePage from './components/WorkspacePage';
import type { AppView, UploadedFile, TestCase } from './types';

export default function App() {
  const [view, setView] = useState<AppView>('upload');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [initialTestCases, setInitialTestCases] = useState<TestCase[]>([]);

  const handleUploadSuccess = (file: UploadedFile, testCases: TestCase[]) => {
    setUploadedFile(file);
    setInitialTestCases(testCases);
    setView('workspace');
  };

  const handleReset = () => {
    setUploadedFile(null);
    setInitialTestCases([]);
    setView('upload');
  };

  if (view === 'workspace' && uploadedFile) {
    return (
      <WorkspacePage
        uploadedFile={uploadedFile}
        initialTestCases={initialTestCases}
        onReset={handleReset}
      />
    );
  }

  return <UploadPage onUploadSuccess={handleUploadSuccess} />;
}
