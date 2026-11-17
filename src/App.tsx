import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Monitor, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { PORTAL_PRESETS } from './data/presets';
import {
  deriveMonogram,
  generateAllFiles,
  generatePortalSvg,
  normalizeUrl,
  sanitizeSlug,
} from './lib/kaliGenerator';
import {
  DesktopEnvironment,
  GeneratedFile,
  IntegrationRuntime,
  PortalConfig,
} from './types/portal';
import { CodeViewer } from './components/CodeViewer';
import { KaliDesktopPreview } from './components/KaliDesktopPreview';
import { KaliGuide } from './components/KaliGuide';

type WorkspaceTab = 'code' | 'preview' | 'guide';

const STORAGE_KEY = 'kaliportal_configs_v1';

const ACCENT_PALETTE = [
  '#0284C7',
  '#0F766E',
  '#4F46E5',
  '#1D4ED8',
  '#D97706',
  '#DC2626',
  '#334155',
];

function createInitialPortals(): PortalConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage read errors
  }
  return [
    {
      id: 'portal-1',
      ...PORTAL_PRESETS[0].config,
    },
  ];
}

function triggerFileDownload(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function App() {
  const [portals, setPortals] = useState<PortalConfig[]>(createInitialPortals);
  const [activePortalId, setActivePortalId] = useState<string>(() => portals[0]?.id ?? 'portal-1');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('code');
  const [activeFileId, setActiveFileId] = useState<string>('installer');
  const [slugLocked, setSlugLocked] = useState<boolean>(false);
  const [monogramLocked, setMonogramLocked] = useState<boolean>(false);

  const configuratorRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);

  const activePortal = useMemo(
    () => portals.find((p) => p.id === activePortalId) ?? portals[0],
    [portals, activePortalId]
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(portals));
    } catch {
      // ignore storage write errors
    }
  }, [portals]);

  const generatedFiles = useMemo(() => generateAllFiles(activePortal), [activePortal]);
  const svgPreview = useMemo(() => generatePortalSvg(activePortal), [activePortal]);

  // Keep activeFileId valid when runtime changes (e.g. webkitgtk adds python-app)
  useEffect(() => {
    if (!generatedFiles.some((f) => f.id === activeFileId)) {
      setActiveFileId(generatedFiles[0]?.id ?? 'installer');
    }
  }, [generatedFiles, activeFileId]);

  const updateActivePortal = (patch: Partial<PortalConfig>) => {
    setPortals((prev) =>
      prev.map((item) => (item.id === activePortal.id ? { ...item, ...patch } : item))
    );
  };

  const handleNameChange = (name: string) => {
    const patch: Partial<PortalConfig> = { name };
    if (!slugLocked) {
      patch.slug = sanitizeSlug(name);
    }
    if (!monogramLocked) {
      patch.monogram = deriveMonogram(name);
    }
    updateActivePortal(patch);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = PORTAL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSlugLocked(false);
    setMonogramLocked(false);
    updateActivePortal({ ...preset.config });
  };

  const handleAddPortal = () => {
    const idx = portals.length + 1;
    const newPortal: PortalConfig = {
      id: `portal-${Date.now()}`,
      ...PORTAL_PRESETS[0].config,
      name: `Company Portal ${idx}`,
      slug: `company-portal-${idx}`,
      monogram: `P${idx}`,
      url: `https://portal${idx}.company.com`,
    };
    setPortals((prev) => [...prev, newPortal]);
    setActivePortalId(newPortal.id);
    setSlugLocked(false);
    setMonogramLocked(false);
  };

  const handleDeletePortal = (id: string) => {
    if (portals.length <= 1) return;
    const remaining = portals.filter((p) => p.id !== id);
    setPortals(remaining);
    if (activePortalId === id) {
      setActivePortalId(remaining[0].id);
    }
  };

  const handleDownloadInstaller = () => {
    const installer = generatedFiles.find((f) => f.id === 'installer') ?? generatedFiles[0];
    if (installer) {
      triggerFileDownload(installer.filename, installer.content, 'text/x-shellscript;charset=utf-8');
    }
  };

  const handleDownloadFile = (file: GeneratedFile) => {
    const mime =
      file.language === 'xml'
        ? 'image/svg+xml;charset=utf-8'
        : file.language === 'python'
        ? 'text/x-python;charset=utf-8'
        : 'text/plain;charset=utf-8';
    triggerFileDownload(file.filename, file.content, mime);
  };

  const scrollToSection = (section: 'config' | WorkspaceTab) => {
    if (section === 'config') {
      configuratorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setActiveTab(section);
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const slug = sanitizeSlug(activePortal.slug || activePortal.name);
  const normalizedUrl = normalizeUrl(activePortal.url);
  let urlHost = normalizedUrl;
  try {
    urlHost = new URL(normalizedUrl).host;
  } catch {
    urlHost = normalizedUrl;
  }

  const runtimeLabel =
    activePortal.runtime === 'webkitgtk'
      ? 'WebKitGTK Native'
      : activePortal.runtime === 'firefox-isolated'
      ? 'Firefox Isolated'
      : 'Chromium App Mode';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-6 h-14 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            KaliPortal
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection('config')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-sky-600"
            >
              Configurator
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('code')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 focus-visible:outline-2 focus-visible:outline-sky-600 ${
                activeTab === 'code'
                  ? 'text-slate-900 border-sky-700'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Generated Code
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('preview')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 focus-visible:outline-2 focus-visible:outline-sky-600 ${
                activeTab === 'preview'
                  ? 'text-slate-900 border-sky-700'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Desktop Preview
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('guide')}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 focus-visible:outline-2 focus-visible:outline-sky-600 ${
                activeTab === 'guide'
                  ? 'text-slate-900 border-sky-700'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Kali Guide
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleDownloadInstaller}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-600"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Installer</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main 1440px Workbench */}
      <main id="top" className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Configuration Rail */}
          <aside
            ref={configuratorRef}
            className="w-full lg:w-[376px] shrink-0 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200"
          >
            {/* Portal List & Presets */}
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-sm font-semibold text-slate-900">Portal Profiles</h1>
                <button
                  type="button"
                  onClick={handleAddPortal}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-700 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Portal</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {portals.map((item) => {
                  const isActive = item.id === activePortal.id;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border transition-colors ${
                        isActive
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-white border-transparent hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActivePortalId(item.id)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                      >
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: item.accentColor || '#0284C7' }}
                        >
                          {(item.monogram || 'CP').slice(0, 2)}
                        </span>
                        <span className="text-xs font-medium truncate">
                          {item.name || 'Untitled Portal'}
                        </span>
                      </button>

                      {portals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePortal(item.id)}
                          aria-label={`Remove ${item.name}`}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <label
                  htmlFor="preset-select"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  Load Template Preset
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="preset-select"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleApplyPreset(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-sky-600"
                  >
                    <option value="" disabled>
                      Choose a Kali integration preset...
                    </option>
                    {PORTAL_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('intranet')}
                    title="Reset to default template"
                    className="h-9 px-2.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shrink-0"
                    aria-label="Reset configuration"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Identity & Target URL */}
            <div className="p-5 flex flex-col gap-3.5">
              <h2 className="text-sm font-semibold text-slate-900">Portal Identity</h2>

              <div>
                <label htmlFor="portal-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Application Name
                </label>
                <input
                  id="portal-name"
                  type="text"
                  value={activePortal.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme Company Portal"
                  className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label htmlFor="portal-url" className="block text-xs font-medium text-slate-700 mb-1">
                  Company Portal URL
                </label>
                <input
                  id="portal-url"
                  type="url"
                  value={activePortal.url}
                  onChange={(e) => updateActivePortal({ url: e.target.value })}
                  placeholder="https://portal.company.com"
                  className="w-full h-9 px-3 text-sm font-mono bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="portal-slug" className="block text-xs font-medium text-slate-700 mb-1">
                    Desktop Slug
                  </label>
                  <input
                    id="portal-slug"
                    type="text"
                    value={activePortal.slug}
                    onChange={(e) => {
                      setSlugLocked(true);
                      updateActivePortal({ slug: e.target.value });
                    }}
                    placeholder="company-portal"
                    className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label htmlFor="portal-monogram" className="block text-xs font-medium text-slate-700 mb-1">
                    Icon Monogram
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="portal-monogram"
                      type="text"
                      maxLength={3}
                      value={activePortal.monogram}
                      onChange={(e) => {
                        setMonogramLocked(true);
                        updateActivePortal({ monogram: e.target.value.toUpperCase() });
                      }}
                      className="w-full h-9 px-3 text-xs font-mono uppercase bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-sky-600"
                    />
                    <div
                      className="w-9 h-9 shrink-0 rounded-md border border-slate-200 overflow-hidden bg-slate-900"
                      dangerouslySetInnerHTML={{ __html: svgPreview }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">Icon Accent</span>
                <div className="flex items-center gap-2">
                  {ACCENT_PALETTE.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => updateActivePortal({ accentColor: hex })}
                      aria-label={`Select color ${hex}`}
                      className={`w-6 h-6 rounded-md transition-transform ${
                        activePortal.accentColor.toLowerCase() === hex.toLowerCase()
                          ? 'ring-2 ring-offset-2 ring-slate-900 scale-105'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="portal-comment" className="block text-xs font-medium text-slate-700 mb-1">
                  Launcher Tooltip Comment
                </label>
                <input
                  id="portal-comment"
                  type="text"
                  value={activePortal.comment}
                  onChange={(e) => updateActivePortal({ comment: e.target.value })}
                  placeholder="Internal company workspace and SSO apps"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>

            {/* Runtime & Desktop Target */}
            <div className="p-5 flex flex-col gap-3.5">
              <h2 className="text-sm font-semibold text-slate-900">Runtime & Environment</h2>

              <div>
                <span className="block text-xs font-medium text-slate-700 mb-1.5">
                  Integration Method
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    {
                      id: 'chromium-app' as IntegrationRuntime,
                      title: 'Chromium App Mode (SSB)',
                      desc: 'Frameless native window with isolated profile',
                    },
                    {
                      id: 'webkitgtk' as IntegrationRuntime,
                      title: 'Python WebKitGTK App',
                      desc: 'Standalone GTK3 desktop app (no Chrome required)',
                    },
                    {
                      id: 'firefox-isolated' as IntegrationRuntime,
                      title: 'Firefox ESR Isolated Profile',
                      desc: 'Uses Kali default Firefox with separate profile',
                    },
                  ].map((option) => {
                    const selected = activePortal.runtime === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updateActivePortal({ runtime: option.id })}
                        className={`text-left px-3 py-2 rounded-md border transition-colors ${
                          selected
                            ? 'bg-sky-50/70 border-sky-600 text-slate-900'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-semibold">{option.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{option.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="desktop-env" className="block text-xs font-medium text-slate-700 mb-1">
                    Desktop Target
                  </label>
                  <select
                    id="desktop-env"
                    value={activePortal.desktopEnv}
                    onChange={(e) =>
                      updateActivePortal({ desktopEnv: e.target.value as DesktopEnvironment })
                    }
                    className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-sky-600"
                  >
                    <option value="xfce">XFCE (Kali Default)</option>
                    <option value="gnome">GNOME</option>
                    <option value="kde">KDE Plasma</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="categories" className="block text-xs font-medium text-slate-700 mb-1">
                    Menu Categories
                  </label>
                  <input
                    id="categories"
                    type="text"
                    value={activePortal.categories}
                    onChange={(e) => updateActivePortal({ categories: e.target.value })}
                    className="w-full h-9 px-2.5 text-xs font-mono bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>
            </div>

            {/* Behavior & VPN Guard */}
            <div className="p-5 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Desktop Behavior</h2>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePortal.isolatedProfile}
                  onChange={(e) => updateActivePortal({ isolatedProfile: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span className="text-xs text-slate-700 leading-snug">
                  Isolate corporate cookies & SSO session from main browser
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePortal.createDesktopShortcut}
                  onChange={(e) => updateActivePortal({ createDesktopShortcut: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span className="text-xs text-slate-700 leading-snug">
                  Create shortcut in ~/Desktop and mark trusted via gio
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePortal.autostart}
                  onChange={(e) => updateActivePortal({ autostart: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span className="text-xs text-slate-700 leading-snug">
                  Launch automatically on login (~/.config/autostart)
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePortal.startMaximized}
                  onChange={(e) => updateActivePortal({ startMaximized: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                />
                <span className="text-xs text-slate-700 leading-snug">
                  Start portal window maximized
                </span>
              </label>

              <div className="pt-1 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activePortal.vpnCheckEnabled}
                    onChange={(e) => updateActivePortal({ vpnCheckEnabled: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
                  />
                  <span className="text-xs text-slate-700 leading-snug">
                    Check corporate VPN interface before launch
                  </span>
                </label>

                {activePortal.vpnCheckEnabled && (
                  <div className="mt-2.5 pl-6">
                    <label htmlFor="vpn-iface" className="block text-[11px] font-medium text-slate-600 mb-1">
                      Network Interface (e.g. tun0, wg0, cscotun0)
                    </label>
                    <input
                      id="vpn-iface"
                      type="text"
                      value={activePortal.vpnInterface}
                      onChange={(e) => updateActivePortal({ vpnInterface: e.target.value })}
                      placeholder="tun0"
                      className="w-full h-8 px-2.5 text-xs font-mono bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-sky-600"
                    />
                  </div>
                )}
              </div>

              {activePortal.runtime === 'chromium-app' && (
                <div className="pt-1 border-t border-slate-100">
                  <label htmlFor="extra-flags" className="block text-[11px] font-medium text-slate-600 mb-1">
                    Optional Chromium Flag (e.g. --ignore-certificate-errors)
                  </label>
                  <input
                    id="extra-flags"
                    type="text"
                    value={activePortal.customBrowserFlags}
                    onChange={(e) => updateActivePortal({ customBrowserFlags: e.target.value })}
                    placeholder="--ignore-certificate-errors"
                    className="w-full h-8 px-2.5 text-xs font-mono bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                </div>
              )}
            </div>
          </aside>

          {/* Right Main Output & Preview Viewport */}
          <section ref={workspaceRef} className="flex-1 min-w-0 flex flex-col gap-5">
            {/* Contextual Header & Workspace Mode Switcher */}
            <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-semibold text-slate-900 truncate">
                    {activePortal.name || 'Company Portal'}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="font-mono text-slate-700">{slug}.desktop</span>
                  <span aria-hidden="true">·</span>
                  <span>{runtimeLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono truncate max-w-[260px]">{urlHost}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{generatedFiles.length} generated files</span>
                </div>
              </div>

              {/* Segmented Workspace Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'code'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Code Output
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'preview'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('guide')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'guide'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Setup Guide
                </button>
              </div>
            </div>

            {/* Active Workspace View */}
            {activeTab === 'code' && (
              <CodeViewer
                files={generatedFiles}
                activeFileId={activeFileId}
                onSelectFile={setActiveFileId}
                onDownloadFile={handleDownloadFile}
              />
            )}

            {activeTab === 'preview' && <KaliDesktopPreview config={activePortal} />}

            {activeTab === 'guide' && (
              <KaliGuide config={activePortal} onDownloadInstaller={handleDownloadInstaller} />
            )}

            {/* Quick Terminal One-Liner Strip */}
            <div className="bg-white border border-slate-200 rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-medium text-slate-900">Quick run in Kali terminal:</span>
                <code className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-800">
                  chmod +x install-{slug}.sh && ./install-{slug}.sh
                </code>
              </div>
              <button
                type="button"
                onClick={handleDownloadInstaller}
                className="text-xs font-medium text-sky-700 hover:text-sky-800 whitespace-nowrap shrink-0"
              >
                Download install-{slug}.sh
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
