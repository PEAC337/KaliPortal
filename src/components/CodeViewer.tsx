import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { GeneratedFile } from '../types/portal';

interface CodeViewerProps {
  files: GeneratedFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onDownloadFile: (file: GeneratedFile) => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onDownloadFile,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const activeFile = files.find((f) => f.id === activeFileId) ?? files[0];

  const handleCopy = async (file: GeneratedFile) => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedId(file.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === file.id ? null : prev));
      }, 1800);
    } catch {
      // Fallback textarea copy if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = file.content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(file.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === file.id ? null : prev));
      }, 1800);
    }
  };

  if (!activeFile) return null;

  const lines = activeFile.content.split('\n');
  const isCopied = copiedId === activeFile.id;

  return (
    <div className="flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* File Tab Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-slate-200 bg-slate-50/80 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-0">
          {files.map((file) => {
            const selected = file.id === activeFile.id;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => onSelectFile(file.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-600 ${
                  selected
                    ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent'
                }`}
              >
                <span className="font-mono">{file.filename}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleCopy(activeFile)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-600"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onDownloadFile(activeFile)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-600"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Save File</span>
          </button>
        </div>
      </div>

      {/* Target Path Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900 text-xs text-slate-400">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-500">Target path:</span>
          <code className="font-mono text-sky-300 truncate">{activeFile.installPath}</code>
        </div>
        <div className="flex items-center gap-2 shrink-0 tabular-nums">
          <span>{activeFile.description}</span>
          <span aria-hidden="true">·</span>
          <span>{lines.length} lines</span>
        </div>
      </div>

      {/* Monospace Line-Numbered Source View */}
      <div className="bg-slate-950 text-slate-100 overflow-x-auto max-h-[560px] overflow-y-auto">
        <table className="w-full border-collapse font-mono text-[12.5px] leading-6">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-900/70">
                <td className="select-none text-right pr-4 pl-4 text-slate-600 w-12 align-top tabular-nums border-r border-slate-800/80">
                  {idx + 1}
                </td>
                <td className="pl-4 pr-6 whitespace-pre text-slate-200">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
