import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { PortalConfig } from '../types/portal';
import { sanitizeSlug } from '../lib/kaliGenerator';

interface KaliGuideProps {
  config: PortalConfig;
  onDownloadInstaller: () => void;
}

export const KaliGuide: React.FC<KaliGuideProps> = ({ config, onDownloadInstaller }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const slug = sanitizeSlug(config.slug || config.name);

  const copyCommand = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const installCmd = `chmod +x ~/Downloads/install-${slug}.sh && ~/Downloads/install-${slug}.sh`;
  const trustCmd = `chmod +x ~/Desktop/${slug}.desktop && gio set ~/Desktop/${slug}.desktop metadata::trusted true`;
  const uninstallCmd = `~/Downloads/install-${slug}.sh --uninstall`;
  const validateCmd = `desktop-file-validate ~/.local/share/applications/${slug}.desktop`;

  const steps = [
    {
      id: 'step-1',
      title: '01. Download and run the self-contained installer',
      detail:
        'The generated installer embeds the vector icon, launcher wrapper, desktop entry, and runtime checks into one executable bash script.',
      command: installCmd,
    },
    {
      id: 'step-2',
      title: '02. Verify XFCE desktop launcher trust (if copied manually)',
      detail:
        'Kali Linux XFCE blocks double-clicking desktop shortcuts until marked executable and trusted via gio metadata.',
      command: trustCmd,
    },
    {
      id: 'step-3',
      title: '03. Validate Freedesktop specification compliance',
      detail:
        'Use desktop-file-validate to verify categories, icon resolution, and Exec formatting in your Kali session.',
      command: validateCmd,
    },
    {
      id: 'step-4',
      title: '04. Clean removal or re-provisioning',
      detail:
        'Run the installer with --uninstall (or the standalone uninstall script) to remove menu entries, shortcuts, and isolated cache.',
      command: uninstallCmd,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-lg">
        <div className="max-w-xl">
          <h2 className="text-base font-semibold text-slate-900">
            Deploying {config.name || 'Company Portal'} on Kali Linux
          </h2>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Every file is scoped to your user home directory (<code className="font-mono text-xs text-slate-800">~/.local/</code>) so no system-wide config files are modified, except installing <code className="font-mono text-xs text-slate-800">{config.runtime === 'webkitgtk' ? 'python3-gi gir1.2-webkit2-4.1' : config.runtime === 'firefox-isolated' ? 'firefox-esr' : 'chromium'}</code> if missing.
          </p>
        </div>

        <button
          type="button"
          onClick={onDownloadInstaller}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-sky-700 rounded-md hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-600"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Download install-{slug}.sh</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        {steps.map((step) => (
          <div key={step.id} className="p-5 flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{step.detail}</p>
            </div>
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-950 text-slate-100 rounded-md border border-slate-800">
              <code className="font-mono text-xs text-sky-300 overflow-x-auto whitespace-nowrap">
                {step.command}
              </code>
              <button
                type="button"
                onClick={() => copyCommand(step.id, step.command)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-700 rounded transition-colors whitespace-nowrap shrink-0"
              >
                {copiedKey === step.id ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
