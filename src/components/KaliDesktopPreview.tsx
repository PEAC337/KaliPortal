import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Lock,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react';
import { PortalConfig } from '../types/portal';
import { deriveMonogram, normalizeUrl, sanitizeSlug } from '../lib/kaliGenerator';

interface KaliDesktopPreviewProps {
  config: PortalConfig;
}

const WALLPAPER_SRC = '/src/assets/images/kali_desktop_wallpaper_1794888920653.jpg';

export const KaliDesktopPreview: React.FC<KaliDesktopPreviewProps> = ({ config }) => {
  const [windowOpen, setWindowOpen] = useState(true);
  const [windowMaximized, setWindowMaximized] = useState(config.startMaximized);
  const [menuOpen, setMenuOpen] = useState(false);
  const [vpnConnected, setVpnConnected] = useState(true);
  const [vpnDialogOpen, setVpnDialogOpen] = useState(false);
  const [wallpaperError, setWallpaperError] = useState(false);

  const portalName = config.name.trim() || 'Company Portal';
  const portalUrl = normalizeUrl(config.url);
  const slug = sanitizeSlug(config.slug || portalName);
  const monogram = (config.monogram || deriveMonogram(portalName)).slice(0, 3).toUpperCase();
  const accent = /^#[0-9a-fA-F]{6}$/.test(config.accentColor) ? config.accentColor : '#0284C7';

  let hostname = 'portal.company.com';
  try {
    hostname = new URL(portalUrl).hostname;
  } catch {
    hostname = portalUrl;
  }

  const handleLaunchAttempt = () => {
    setMenuOpen(false);
    if (config.vpnCheckEnabled && !vpnConnected) {
      setVpnDialogOpen(true);
      return;
    }
    setVpnDialogOpen(false);
    setWindowOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Interactive Simulation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-medium text-slate-900">Simulated Kali XFCE Workspace</span>
          <span aria-hidden="true">·</span>
          <span>Double-click desktop icon or use Applications menu</span>
        </div>

        <div className="flex items-center gap-2">
          {config.vpnCheckEnabled && (
            <button
              type="button"
              onClick={() => setVpnConnected((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-600 ${
                vpnConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              {vpnConnected ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>{config.vpnInterface || 'tun0'}: {vpnConnected ? 'Up' : 'Disconnected'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLaunchAttempt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-600"
          >
            <span>Test Launch</span>
          </button>
        </div>
      </div>

      {/* Kali Desktop Screen */}
      <div className="relative w-full h-[540px] rounded-lg overflow-hidden border border-slate-300 bg-slate-950 select-none">
        {/* Background Wallpaper with Fallback */}
        {!wallpaperError ? (
          <img
            src={WALLPAPER_SRC}
            alt="Kali Linux XFCE desktop wallpaper"
            referrerPolicy="no-referrer"
            onError={() => setWallpaperError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950" />
        )}

        {/* Top XFCE Panel */}
        <div className="relative z-30 flex items-center justify-between h-8 px-3 bg-slate-950/90 border-b border-slate-800 text-xs text-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                menuOpen ? 'bg-sky-600 text-white' : 'hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Applications</span>
            </button>

            {windowOpen && (
              <button
                type="button"
                onClick={() => setWindowOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/90 text-slate-100 border border-slate-700 text-xs truncate max-w-[200px]"
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: accent }}
                />
                <span className="truncate">{portalName}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-300 tabular-nums shrink-0">
            <span>{config.vpnCheckEnabled ? `${config.vpnInterface || 'tun0'}: ${vpnConnected ? 'UP' : 'DOWN'}` : 'eth0: Connected'}</span>
            <span aria-hidden="true">·</span>
            <span>20:15</span>
          </div>
        </div>

        {/* XFCE Applications Dropdown */}
        {menuOpen && (
          <div className="absolute top-9 left-3 z-40 w-64 bg-slate-900/95 border border-slate-700 rounded-md shadow-xl p-1.5 text-xs text-slate-200">
            <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-800 mb-1">
              ~/.local/share/applications
            </div>
            <button
              type="button"
              onClick={handleLaunchAttempt}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded hover:bg-sky-600/20 text-left transition-colors"
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0 border border-white/15"
                style={{ backgroundColor: '#0F172A', borderColor: accent }}
              >
                {monogram}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-slate-100 truncate">{portalName}</div>
                <div className="text-[11px] text-slate-400 truncate">{slug}.desktop</div>
              </div>
            </button>
          </div>
        )}

        {/* Desktop Canvas Area */}
        <div
          className="relative h-[calc(100%-2rem)] p-5"
          onClick={() => {
            if (menuOpen) setMenuOpen(false);
          }}
        >
          {/* Desktop Shortcut Icon */}
          {config.createDesktopShortcut && (
            <button
              type="button"
              onDoubleClick={handleLaunchAttempt}
              onClick={handleLaunchAttempt}
              title="Click or double-click to launch portal"
              className="group flex flex-col items-center gap-1.5 w-24 p-2 rounded-md hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-sky-400 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md border border-white/20"
                style={{
                  background: `linear-gradient(135deg, #0F172A 0%, #1E293B 100%)`,
                  boxShadow: `inset 0 3px 0 0 ${accent}`,
                }}
              >
                {monogram}
              </div>
              <span className="text-[11px] font-medium text-white text-center leading-tight drop-shadow line-clamp-2">
                {portalName}
              </span>
            </button>
          )}

          {/* Simulated Zenity VPN Warning Dialog */}
          {vpnDialogOpen && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/50 p-4">
              <div className="w-full max-w-sm bg-slate-100 text-slate-900 rounded-md border border-slate-300 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2 bg-slate-200 border-b border-slate-300 text-xs font-semibold text-slate-800">
                  <span className="truncate">{portalName} - Network Check</span>
                  <button
                    type="button"
                    onClick={() => setVpnDialogOpen(false)}
                    className="p-0.5 rounded hover:bg-slate-300 text-slate-600"
                    aria-label="Close network check dialog"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-4 flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-slate-700">
                    VPN interface <code className="font-mono bg-slate-200 px-1 rounded">{config.vpnInterface || 'tun0'}</code> is not active and {portalName} could not be reached. Do you want to launch the portal anyway?
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-slate-200/70 border-t border-slate-300">
                  <button
                    type="button"
                    onClick={() => setVpnDialogOpen(false)}
                    className="px-3 py-1 text-xs font-medium bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVpnDialogOpen(false);
                      setWindowOpen(true);
                    }}
                    className="px-3 py-1 text-xs font-medium bg-sky-700 text-white rounded hover:bg-sky-800"
                  >
                    Launch Anyway
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Simulated Native Portal Application Window */}
          {windowOpen && (
            <div
              className={`absolute z-20 flex flex-col bg-white border border-slate-700/80 shadow-2xl overflow-hidden transition-all duration-150 ${
                windowMaximized
                  ? 'inset-2 rounded-md'
                  : 'top-6 left-32 right-6 bottom-6 rounded-lg'
              }`}
            >
              {/* Window Titlebar / Runtime Chrome */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-slate-100 border-b border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  {config.runtime === 'webkitgtk' && (
                    <div className="flex items-center gap-1 mr-1 text-slate-400">
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <ArrowRight className="w-3.5 h-3.5" />
                      <RefreshCw className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: accent }}
                  >
                    {monogram.slice(0, 2)}
                  </span>
                  <span className="text-xs font-medium truncate">{portalName}</span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline truncate">
                    · {hostname}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setWindowMaximized((prev) => !prev)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                    aria-label={windowMaximized ? 'Restore window' : 'Maximize window'}
                  >
                    {windowMaximized ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWindowOpen(false)}
                    className="p-1 rounded hover:bg-red-600 text-slate-400 hover:text-white transition-colors"
                    aria-label="Close portal window"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Firefox Isolated Address Indicator (only for firefox-isolated) */}
              {config.runtime === 'firefox-isolated' && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-xs text-slate-600">
                  <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="font-mono truncate">{portalUrl}</span>
                  <span className="ml-auto text-[11px] text-slate-500 shrink-0">
                    Profile: portal-{slug}
                  </span>
                </div>
              )}

              {/* Simulated Company Portal Content */}
              <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {monogram}
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{portalName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Globe className="w-3.5 h-3.5" />
                    <span className="font-mono">{hostname}</span>
                  </div>
                </div>

                <div className="p-5 grid grid-cols-3 gap-3 flex-1 content-start">
                  <div className="col-span-2 bg-white border border-slate-200 rounded-md p-4">
                    <div className="text-xs font-semibold text-slate-900 mb-1">
                      Workspace Session Active
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Running in isolated {config.runtime === 'webkitgtk' ? 'WebKit2GTK' : config.runtime === 'firefox-isolated' ? 'Firefox ESR' : 'Chromium SSB'} container (<code className="font-mono text-slate-800">WMClass: kali-portal-{slug}</code>). Cookies and SSO tokens stay separated from your standard Kali browser sessions.
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-md p-4">
                    <div className="text-xs font-semibold text-slate-900 mb-1">Desktop Entry</div>
                    <div className="text-[11px] font-mono text-slate-600 break-all">
                      {slug}.desktop
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-md p-3.5">
                    <div className="text-xs font-medium text-slate-900">Single Sign-On</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {config.isolatedProfile ? 'Isolated profile storage' : 'Shared browser storage'}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-md p-3.5">
                    <div className="text-xs font-medium text-slate-900">VPN Guard</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {config.vpnCheckEnabled ? `Checks ${config.vpnInterface || 'tun0'}` : 'Disabled'}
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-md p-3.5">
                    <div className="text-xs font-medium text-slate-900">Autostart</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {config.autostart ? 'Enabled on login' : 'Manual launch'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
