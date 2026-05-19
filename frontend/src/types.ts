export type AppView = 'upload' | 'workspace';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

export interface TestStep {
  step: number;
  action: string;
  expected: string;
}

export interface TestCase {
  id: string;
  title: string;
  state: string;
  complexity: string;
  testCaseType: string;
  lineOfBusiness: string;
  isDomainSuggestion?: boolean;
  steps: TestStep[];
}
