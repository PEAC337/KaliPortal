export type IntegrationRuntime = 'chromium-app' | 'webkitgtk' | 'firefox-isolated';

export type DesktopEnvironment = 'xfce' | 'gnome' | 'kde';

export interface PortalConfig {
  id: string;
  name: string;
  url: string;
  comment: string;
  slug: string;
  monogram: string;
  accentColor: string;
  runtime: IntegrationRuntime;
  desktopEnv: DesktopEnvironment;
  categories: string;
  isolatedProfile: boolean;
  createDesktopShortcut: boolean;
  autostart: boolean;
  vpnCheckEnabled: boolean;
  vpnInterface: string;
  startMaximized: boolean;
  customBrowserFlags: string;
}

export interface GeneratedFile {
  id: string;
  filename: string;
  installPath: string;
  language: 'bash' | 'ini' | 'python' | 'xml';
  description: string;
  content: string;
}

export interface PortalPreset {
  id: string;
  label: string;
  config: Omit<PortalConfig, 'id'>;
}
