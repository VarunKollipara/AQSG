import { useState } from 'react';
import { Download, Sparkles, Tag } from 'lucide-react';
import type { TestCase } from '../types';

interface Props {
  testCases: TestCase[];
}

// ── CSV export in the exact Medica template format ──────────────────────────

const CSV_HEADER =
  'ID,Work Item Type,Title,Test Step,Step Action,Step Expected,' +
  'Custom.LineofBusiness,Area Path,Iteration,Assigned To,State,' +
  'Custom.BusinessCapabilityL1,Custom.BusinessCapabilityL2A,' +
  'Custom.Complexity,Custom.TestCaseType,Custom.Program';

function csvCell(val: string | number | undefined): string {
  const s = String(val ?? '');
  // Quote if contains comma, newline, or double-quote
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSV(testCases: TestCase[]): string {
  const rows: string[] = [CSV_HEADER];

  for (const tc of testCases) {
    // Test Case header row
    rows.push(
      [
        '',                         // ID
        'Test Case',               // Work Item Type
        csvCell(tc.title),         // Title
        '',                        // Test Step
        '',                        // Step Action
        '',                        // Step Expected
        csvCell(tc.lineOfBusiness || 'OTHER'), // Custom.LineofBusiness
        '',                        // Area Path
        '',                        // Iteration
        '',                        // Assigned To
        csvCell(tc.state || 'Design'), // State
        '',                        // Custom.BusinessCapabilityL1
        '',                        // Custom.BusinessCapabilityL2A
        csvCell(tc.complexity || 'Simple'), // Custom.Complexity
        csvCell(tc.testCaseType || 'End2End'), // Custom.TestCaseType
        '',                        // Custom.Program
      ].join(',')
    );

    // Step rows
    for (const s of tc.steps) {
      rows.push(
        [
          '', '', '',              // ID, WorkItemType, Title
          csvCell(s.step),         // Test Step
          csvCell(s.action),       // Step Action
          csvCell(s.expected),     // Step Expected
          '', '', '', '', '', '', '', '', '', '', // remaining empty
        ].join(',')
      );
    }

    // Blank separator row
    rows.push(',,,,,,,,,,,,,,,');
  }

  return rows.join('\n');
}

function downloadCSV(testCases: TestCase[]) {
  const csv = buildCSV(testCases);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = 'test-suite.csv';
  a.click();
}

// ── Column definitions for the preview table ────────────────────────────────

const PREVIEW_COLS = [
  { key: 'type',     label: 'Type',            width: 'w-24'  },
  { key: 'id',       label: 'ID',              width: 'w-24'  },
  { key: 'title',    label: 'Title',           width: 'w-52'  },
  { key: 'step',     label: 'Step',            width: 'w-14'  },
  { key: 'action',   label: 'Step Action',     width: 'w-72'  },
  { key: 'expected', label: 'Expected Result', width: 'w-72'  },
  { key: 'state',    label: 'State',           width: 'w-20'  },
  { key: 'complex',  label: 'Complexity',      width: 'w-24'  },
  { key: 'tctype',   label: 'Type',            width: 'w-24'  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function TestCasesPanel({ testCases }: Props) {
  const [activeTab, setActiveTab] = useState<'explicit' | 'domain'>('explicit');

  const explicit = testCases.filter((tc) => !tc.isDomainSuggestion);
  const domain   = testCases.filter((tc) => tc.isDomainSuggestion);
  const visible  = activeTab === 'explicit' ? explicit : domain;

  const isEmpty = testCases.length === 0;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Generated Test Suite</h2>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Sparkles size={11} className="text-violet-400" />
              {testCases.length} test case{testCases.length !== 1 ? 's' : ''}
              {domain.length > 0 && ` · ${domain.length} domain suggestions`}
            </p>
          </div>

          {/* Tabs */}
          {domain.length > 0 && (
            <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setActiveTab('explicit')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'explicit'
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Explicit ({explicit.length})
              </button>
              <button
                onClick={() => setActiveTab('domain')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === 'domain'
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Domain ({domain.length})
              </button>
            </div>
          )}
        </div>

        {/* Export */}
        <button
          onClick={() => downloadCSV(testCases)}
          disabled={isEmpty}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={13} />
          Download CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
              <Sparkles size={22} className="text-violet-400" />
            </div>
            <p className="text-sm text-gray-400 max-w-xs">
              Upload a document and test cases will appear here as a structured table.
            </p>
            <p className="text-xs text-gray-600">
              You can also ask in the chat panel to generate or refine test cases.
            </p>
          </div>
        ) : (
          <table className="w-max min-w-full border-collapse text-xs">
            {/* Sticky column header */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 border-b border-gray-700">
                {PREVIEW_COLS.map((col) => (
                  <th
                    key={col.key}
                    className={`${col.width} px-3 py-2 text-left font-semibold text-gray-300 whitespace-nowrap border-r border-gray-700 last:border-r-0`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((tc) => (
                <TestCaseRows key={tc.id} tc={tc} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Per test-case rows (header + steps) ──────────────────────────────────────

function TestCaseRows({ tc }: { tc: TestCase }) {
  const [collapsed, setCollapsed] = useState(false);

  const headerBg = tc.isDomainSuggestion
    ? 'bg-amber-950/40 hover:bg-amber-950/60'
    : 'bg-violet-950/40 hover:bg-violet-950/60';

  return (
    <>
      {/* Test Case header row */}
      <tr
        className={`${headerBg} border-b border-gray-800 cursor-pointer select-none`}
        onClick={() => setCollapsed((c) => !c)}
      >
        <td className="px-3 py-2 border-r border-gray-800 whitespace-nowrap">
          <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${
            tc.isDomainSuggestion
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-violet-500/20 text-violet-300'
          }`}>
            <Tag size={9} />
            {tc.isDomainSuggestion ? 'Domain' : 'Test Case'}
          </span>
        </td>
        <td className="px-3 py-2 border-r border-gray-800 font-mono text-gray-400 whitespace-nowrap">
          {tc.id}
        </td>
        <td className="px-3 py-2 border-r border-gray-800 font-medium text-gray-100 max-w-[208px]">
          <span className="line-clamp-2">{tc.title}</span>
        </td>
        <td className="px-3 py-2 border-r border-gray-800 text-gray-500 text-center">
          {collapsed ? `+${tc.steps.length}` : ''}
        </td>
        <td className="px-3 py-2 border-r border-gray-800 text-gray-500 italic">
          {collapsed ? 'click to expand' : ''}
        </td>
        <td className="px-3 py-2 border-r border-gray-800" />
        <td className="px-3 py-2 border-r border-gray-800 text-gray-400 whitespace-nowrap">
          {tc.state}
        </td>
        <td className="px-3 py-2 border-r border-gray-800 whitespace-nowrap">
          <ComplexityBadge value={tc.complexity} />
        </td>
        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
          {tc.testCaseType}
        </td>
      </tr>

      {/* Step rows */}
      {!collapsed && tc.steps.map((s) => (
        <tr key={s.step} className="border-b border-gray-800/50 hover:bg-gray-800/30">
          <td className="px-3 py-2 border-r border-gray-800" />
          <td className="px-3 py-2 border-r border-gray-800" />
          <td className="px-3 py-2 border-r border-gray-800" />
          <td className="px-3 py-2 border-r border-gray-800 text-center text-gray-500 font-mono">
            {s.step}
          </td>
          <td className="px-3 py-2 border-r border-gray-800 text-gray-300 max-w-[288px]">
            <span className="whitespace-pre-wrap leading-relaxed">{s.action}</span>
          </td>
          <td className="px-3 py-2 border-r border-gray-800 text-gray-400 max-w-[288px]">
            <span className="whitespace-pre-wrap leading-relaxed">{s.expected}</span>
          </td>
          <td className="px-3 py-2 border-r border-gray-800" />
          <td className="px-3 py-2 border-r border-gray-800" />
          <td className="px-3 py-2" />
        </tr>
      ))}
    </>
  );
}

function ComplexityBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    Simple:  'bg-green-500/15 text-green-400',
    Medium:  'bg-yellow-500/15 text-yellow-400',
    Complex: 'bg-red-500/15 text-red-400',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[value] ?? 'bg-gray-700 text-gray-400'}`}>
      {value}
    </span>
  );
}
