import { GeneratedFile, PortalConfig } from '../types/portal';

export function sanitizeSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'company-portal';
}

export function deriveMonogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'CP';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return 'https://portal.company.com';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function escapeShellSingle(val: string): string {
  return val.replace(/'/g, "'\\''");
}

function escapeXml(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapePythonString(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function escapeDesktopValue(val: string): string {
  return val.replace(/\r?\n/g, ' ').trim();
}

export function generatePortalSvg(config: PortalConfig): string {
  const monogram = escapeXml((config.monogram || deriveMonogram(config.name)).slice(0, 3).toUpperCase());
  const accent = /^#[0-9a-fA-F]{6}$/.test(config.accentColor) ? config.accentColor : '#0284C7';
  const title = escapeXml(config.name || 'Company Portal');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="portal-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>
    <linearGradient id="portal-accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.78"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="112" height="112" rx="24" fill="url(#portal-bg)" stroke="${accent}" stroke-opacity="0.35" stroke-width="2"/>
  <rect x="20" y="20" width="88" height="10" rx="5" fill="url(#portal-accent)" fill-opacity="0.9"/>
  <text x="64" y="83" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-weight="700" font-size="${monogram.length > 2 ? '34' : '42'}" letter-spacing="1" fill="#F8FAFC">${monogram}</text>
</svg>
`;
}

export function generateDesktopEntry(config: PortalConfig): string {
  const slug = sanitizeSlug(config.slug || config.name);
  const name = escapeDesktopValue(config.name || 'Company Portal');
  const comment = escapeDesktopValue(config.comment || `Launch ${name} desktop portal`);
  const categories = escapeDesktopValue(config.categories || 'Network;Office;WebBrowser;');
  const normalizedCategories = categories.endsWith(';') ? categories : `${categories};`;
  const wmClass = `kali-portal-${slug}`;

  return `[Desktop Entry]
Version=1.0
Type=Application
Name=${name}
GenericName=Company Portal
Comment=${comment}
Exec=$HOME/.local/bin/launch-${slug}.sh
Icon=$HOME/.local/share/icons/hicolor/scalable/apps/${slug}.svg
Terminal=false
Categories=${normalizedCategories}
StartupNotify=true
StartupWMClass=${wmClass}
X-Desktop-File-Install-Version=0.26
`;
}

export function generateLauncherScript(config: PortalConfig): string {
  const slug = sanitizeSlug(config.slug || config.name);
  const url = normalizeUrl(config.url);
  const portalName = config.name.trim() || 'Company Portal';
  const wmClass = `kali-portal-${slug}`;
  const profileDir = `$HOME/.local/share/${slug}/profile`;
  const vpnIface = (config.vpnInterface || 'tun0').trim().replace(/[^a-zA-Z0-9._-]/g, '') || 'tun0';

  const vpnBlock = config.vpnCheckEnabled
    ? `
# Verify corporate VPN tunnel (${vpnIface}) or portal host reachability
check_portal_connectivity() {
  local iface='${escapeShellSingle(vpnIface)}'
  local url='${escapeShellSingle(url)}'

  if ip link show "$iface" >/dev/null 2>&1; then
    if ip link show "$iface" | grep -qE "state UP|LOWER_UP"; then
      return 0
    fi
  fi

  if curl -sk --head --max-time 3 "$url" >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

if ! check_portal_connectivity; then
  MSG="VPN interface '${vpnIface}' is not active and ${portalName} could not be reached."
  if command -v zenity >/dev/null 2>&1; then
    if ! zenity --question \\
      --title="${escapeShellSingle(portalName)} - Network Check" \\
      --text="$MSG\\n\\nDo you want to launch the portal anyway?" \\
      --ok-label="Launch Anyway" \\
      --cancel-label="Cancel" \\
      --width=400; then
      exit 0
    fi
  elif command -v notify-send >/dev/null 2>&1; then
    notify-send -u normal "${escapeShellSingle(portalName)}" "$MSG"
  fi
fi
`
    : '';

  if (config.runtime === 'webkitgtk') {
    return `#!/usr/bin/env bash
set -euo pipefail

PORTAL_APP="$HOME/.local/share/${slug}/${slug}-app.py"
${vpnBlock}
exec python3 "$PORTAL_APP"
`;
  }

  if (config.runtime === 'firefox-isolated') {
    const profileName = `portal-${slug}`;
    return `#!/usr/bin/env bash
set -euo pipefail

PORTAL_URL='${escapeShellSingle(url)}'
PROFILE_NAME='${escapeShellSingle(profileName)}'
PROFILE_DIR="${profileDir}"
WM_CLASS='${escapeShellSingle(wmClass)}'
${vpnBlock}
mkdir -p "$PROFILE_DIR"

if ! command -v firefox >/dev/null 2>&1 && ! command -v firefox-esr >/dev/null 2>&1; then
  echo "Error: Firefox is not installed on this system." >&2
  command -v zenity >/dev/null 2>&1 && zenity --error --text="Firefox is not installed. Run: sudo apt install -y firefox-esr"
  exit 1
fi

FIREFOX_BIN="$(command -v firefox || command -v firefox-esr)"

if [ ! -f "$PROFILE_DIR/prefs.js" ]; then
  "$FIREFOX_BIN" -CreateProfile "$PROFILE_NAME $PROFILE_DIR" >/dev/null 2>&1 || true
fi

# Enable minimal site-specific window styling in the isolated profile
mkdir -p "$PROFILE_DIR/chrome"
cat > "$PROFILE_DIR/user.js" << 'USERJS'
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("browser.tabs.inTitlebar", 1);
user_pref("browser.startup.homepage_override.mstone", "ignore");
USERJS

cat > "$PROFILE_DIR/chrome/userChrome.css" << 'USERCSS'
#TabsToolbar { visibility: collapse !important; }
#nav-bar { min-height: 32px !important; }
USERCSS

exec "$FIREFOX_BIN" \\
  --no-remote \\
  --class="$WM_CLASS" \\
  --profile "$PROFILE_DIR" \\
  --new-window "$PORTAL_URL"
`;
  }

  // Default: Chromium / Chrome / Brave App Mode (SSB)
  const extraFlags = config.customBrowserFlags.trim();
  const maximizedFlag = config.startMaximized ? '  "--start-maximized"\n' : '';
  const profileFlag = config.isolatedProfile
    ? `  "--user-data-dir=${profileDir}"\n`
    : '';

  return `#!/usr/bin/env bash
set -euo pipefail

PORTAL_URL='${escapeShellSingle(url)}'
WM_CLASS='${escapeShellSingle(wmClass)}'
${vpnBlock}
find_browser() {
  for bin in chromium chromium-browser google-chrome brave-browser microsoft-edge; do
    if command -v "$bin" >/dev/null 2>&1; then
      command -v "$bin"
      return 0
    fi
  done
  return 1
}

BROWSER_BIN="$(find_browser || true)"

if [ -z "$BROWSER_BIN" ]; then
  MSG="No Chromium-based browser found (chromium, google-chrome, or brave-browser). Install via: sudo apt install -y chromium"
  echo "Error: $MSG" >&2
  command -v zenity >/dev/null 2>&1 && zenity --error --title="${escapeShellSingle(portalName)}" --text="$MSG" --width=420
  exit 1
fi

${config.isolatedProfile ? `mkdir -p "${profileDir}"\n` : ''}ARGS=(
  "--app=$PORTAL_URL"
  "--class=$WM_CLASS"
  "--no-first-run"
  "--no-default-browser-check"
${profileFlag}${maximizedFlag}${extraFlags ? `  "${escapeShellSingle(extraFlags)}"\n` : ''})

exec "$BROWSER_BIN" "\${ARGS[@]}"
`;
}

export function generateWebKitPythonApp(config: PortalConfig): string {
  const slug = sanitizeSlug(config.slug || config.name);
  const url = normalizeUrl(config.url);
  const name = escapePythonString(config.name.trim() || 'Company Portal');
  const wmClass = escapePythonString(`kali-portal-${slug}`);
  const startMaximized = config.startMaximized ? 'True' : 'False';
  const isolated = config.isolatedProfile ? 'True' : 'False';

  return `#!/usr/bin/env python3
"""
${name} - Kali Linux WebKitGTK Desktop Wrapper
Integrates the company portal as a standalone native GTK3 window.
"""
import os
import sys
import webbrowser
import gi

gi.require_version("Gtk", "3.0")
try:
    gi.require_version("WebKit2", "4.1")
except ValueError:
    gi.require_version("WebKit2", "4.0")

from gi.repository import Gtk, Gdk, WebKit2, GLib  # noqa: E402

PORTAL_NAME = "${name}"
PORTAL_URL = "${escapePythonString(url)}"
WM_CLASS = "${wmClass}"
SLUG = "${escapePythonString(slug)}"
ISOLATED_PROFILE = ${isolated}
START_MAXIMIZED = ${startMaximized}


class PortalWindow(Gtk.ApplicationWindow):
    def __init__(self, app):
        super().__init__(application=app, title=PORTAL_NAME)
        self.set_default_size(1280, 820)
        self.set_wmclass(WM_CLASS, PORTAL_NAME)
        self.is_fullscreen = False

        icon_path = os.path.expanduser(
            f"~/.local/share/icons/hicolor/scalable/apps/{SLUG}.svg"
        )
        if os.path.exists(icon_path):
            try:
                self.set_icon_from_file(icon_path)
            except GLib.Error:
                pass

        # Persistent isolated profile directory for SSO / MFA sessions
        data_dir = os.path.expanduser(f"~/.local/share/{SLUG}/webkit-data")
        cache_dir = os.path.expanduser(f"~/.cache/{SLUG}/webkit-cache")
        os.makedirs(data_dir, exist_ok=True)
        os.makedirs(cache_dir, exist_ok=True)

        if ISOLATED_PROFILE:
            data_manager = WebKit2.WebsiteDataManager(
                base_data_directory=data_dir,
                base_cache_directory=cache_dir,
            )
            context = WebKit2.WebContext.new_with_website_data_manager(data_manager)
            cookie_manager = data_manager.get_cookie_manager()
        else:
            context = WebKit2.WebContext.get_default()
            cookie_manager = context.get_cookie_manager()

        cookie_manager.set_persistent_storage(
            os.path.join(data_dir, "cookies.sqlite"),
            WebKit2.CookiePersistentStorage.SQLITE,
        )
        cookie_manager.set_accept_policy(WebKit2.CookieAcceptPolicy.ALWAYS)

        settings = WebKit2.Settings()
        settings.set_enable_javascript(True)
        settings.set_enable_webgl(True)
        settings.set_enable_developer_extras(False)
        settings.set_javascript_can_open_windows_automatically(True)

        self.webview = WebKit2.WebView.new_with_context(context)
        self.webview.set_settings(settings)
        self.webview.connect("notify::title", self.on_title_changed)
        self.webview.connect("create", self.on_create_window)

        # Native GTK HeaderBar with subtle navigation controls
        header = Gtk.HeaderBar()
        header.set_show_close_button(True)
        header.props.title = PORTAL_NAME
        self.set_titlebar(header)

        nav_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        Gtk.StyleContext.add_class(nav_box.get_style_context(), "linked")

        back_btn = Gtk.Button.new_from_icon_name("go-previous-symbolic", Gtk.IconSize.BUTTON)
        back_btn.set_tooltip_text("Back (Alt+Left)")
        back_btn.connect("clicked", lambda _: self.webview.go_back())

        fwd_btn = Gtk.Button.new_from_icon_name("go-next-symbolic", Gtk.IconSize.BUTTON)
        fwd_btn.set_tooltip_text("Forward (Alt+Right)")
        fwd_btn.connect("clicked", lambda _: self.webview.go_forward())

        reload_btn = Gtk.Button.new_from_icon_name("view-refresh-symbolic", Gtk.IconSize.BUTTON)
        reload_btn.set_tooltip_text("Reload (Ctrl+R)")
        reload_btn.connect("clicked", lambda _: self.webview.reload())

        home_btn = Gtk.Button.new_from_icon_name("go-home-symbolic", Gtk.IconSize.BUTTON)
        home_btn.set_tooltip_text("Portal Home")
        home_btn.connect("clicked", lambda _: self.webview.load_uri(PORTAL_URL))

        nav_box.add(back_btn)
        nav_box.add(fwd_btn)
        nav_box.add(reload_btn)
        nav_box.add(home_btn)
        header.pack_start(nav_box)

        self.add(self.webview)
        self.connect("key-press-event", self.on_key_press)
        self.webview.load_uri(PORTAL_URL)

        if START_MAXIMIZED:
            self.maximize()

    def on_title_changed(self, webview, _param):
        page_title = webview.get_title()
        header = self.get_titlebar()
        if header:
            header.props.subtitle = page_title if page_title and page_title != PORTAL_NAME else None

    def on_create_window(self, _webview, navigation_action):
        uri = navigation_action.get_request().get_uri()
        if uri:
            webbrowser.open(uri)
        return None

    def on_key_press(self, _widget, event):
        ctrl = event.state & Gdk.ModifierType.CONTROL_MASK
        alt = event.state & Gdk.ModifierType.MOD1_MASK
        if ctrl and event.keyval in (Gdk.KEY_r, Gdk.KEY_R):
            self.webview.reload()
            return True
        if ctrl and event.keyval in (Gdk.KEY_plus, Gdk.KEY_equal):
            self.webview.set_zoom_level(min(2.5, self.webview.get_zoom_level() + 0.1))
            return True
        if ctrl and event.keyval == Gdk.KEY_minus:
            self.webview.set_zoom_level(max(0.5, self.webview.get_zoom_level() - 0.1))
            return True
        if ctrl and event.keyval == Gdk.KEY_0:
            self.webview.set_zoom_level(1.0)
            return True
        if alt and event.keyval == Gdk.KEY_Left:
            self.webview.go_back()
            return True
        if alt and event.keyval == Gdk.KEY_Right:
            self.webview.go_forward()
            return True
        if event.keyval == Gdk.KEY_F11:
            if self.is_fullscreen:
                self.unfullscreen()
            else:
                self.fullscreen()
            self.is_fullscreen = not self.is_fullscreen
            return True
        return False


class PortalApplication(Gtk.Application):
    def __init__(self):
        super().__init__(application_id=f"net.kaliportal.{SLUG.replace('-', '_')}")

    def do_activate(self):
        win = self.props.active_window
        if not win:
            win = PortalWindow(self)
        win.show_all()
        win.present()


if __name__ == "__main__":
    app = PortalApplication()
    sys.exit(app.run(sys.argv))
`;
}

export function generateUninstallScript(config: PortalConfig): string {
  const slug = sanitizeSlug(config.slug || config.name);
  const name = config.name.trim() || 'Company Portal';

  return `#!/usr/bin/env bash
set -euo pipefail

SLUG='${escapeShellSingle(slug)}'
PORTAL_NAME='${escapeShellSingle(name)}'

echo "Removing $PORTAL_NAME desktop integration..."

rm -f "$HOME/.local/share/applications/\${SLUG}.desktop"
rm -f "$HOME/Desktop/\${SLUG}.desktop"
rm -f "$HOME/.config/autostart/\${SLUG}.desktop"
rm -f "$HOME/.local/bin/launch-\${SLUG}.sh"
rm -f "$HOME/.local/share/icons/hicolor/scalable/apps/\${SLUG}.svg"
rm -rf "$HOME/.local/share/\${SLUG}"
rm -rf "$HOME/.cache/\${SLUG}"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" >/dev/null 2>&1 || true
fi

echo "Removed $PORTAL_NAME cleanly."
`;
}

export function generateInstallerScript(config: PortalConfig): string {
  const slug = sanitizeSlug(config.slug || config.name);
  const name = config.name.trim() || 'Company Portal';
  const svgContent = generatePortalSvg(config);
  const launcherContent = generateLauncherScript(config);
  const desktopContent = generateDesktopEntry(config)
    .replace(/\$HOME/g, '${HOME}');
  const pythonContent = config.runtime === 'webkitgtk' ? generateWebKitPythonApp(config) : '';

  const depInstallBlock =
    config.runtime === 'webkitgtk'
      ? `
echo "[1/5] Checking WebKitGTK and PyGObject dependencies..."
if ! python3 -c "import gi; gi.require_version('Gtk', '3.0'); gi.require_version('WebKit2', '4.1')" 2>/dev/null \\
   && ! python3 -c "import gi; gi.require_version('Gtk', '3.0'); gi.require_version('WebKit2', '4.0')" 2>/dev/null; then
  echo "Installing python3-gi and gir1.2-webkit2-4.1 via apt..."
  sudo apt-get update -qq
  sudo apt-get install -y python3-gi gir1.2-webkit2-4.1 || sudo apt-get install -y python3-gi gir1.2-webkit2-4.0
fi
`
      : config.runtime === 'firefox-isolated'
      ? `
echo "[1/5] Checking Firefox runtime..."
if ! command -v firefox >/dev/null 2>&1 && ! command -v firefox-esr >/dev/null 2>&1; then
  echo "Installing firefox-esr via apt..."
  sudo apt-get update -qq
  sudo apt-get install -y firefox-esr
fi
`
      : `
echo "[1/5] Checking Chromium / Chrome runtime..."
if ! command -v chromium >/dev/null 2>&1 && ! command -v chromium-browser >/dev/null 2>&1 && ! command -v google-chrome >/dev/null 2>&1 && ! command -v brave-browser >/dev/null 2>&1; then
  echo "Installing chromium via apt..."
  sudo apt-get update -qq
  sudo apt-get install -y chromium
fi
`;

  const pythonWriteBlock =
    config.runtime === 'webkitgtk'
      ? `
mkdir -p "$HOME/.local/share/$SLUG"
cat > "$HOME/.local/share/$SLUG/\${SLUG}-app.py" << 'EOF_PYTHON'
${pythonContent.trimEnd()}
EOF_PYTHON
chmod +x "$HOME/.local/share/$SLUG/\${SLUG}-app.py"
`
      : '';

  const desktopShortcutBlock = config.createDesktopShortcut
    ? `
if [ -d "$HOME/Desktop" ]; then
  cp "$APP_DESKTOP" "$HOME/Desktop/\${SLUG}.desktop"
  chmod +x "$HOME/Desktop/\${SLUG}.desktop"
  # Mark launcher trusted on Kali XFCE / GNOME so double-click runs without warning
  if command -v gio >/dev/null 2>&1; then
    gio set "$HOME/Desktop/\${SLUG}.desktop" metadata::trusted true 2>/dev/null || true
  fi
  if command -v xfdesktop >/dev/null 2>&1; then
    xfdesktop --reload 2>/dev/null || true
  fi
fi
`
    : '';

  const autostartBlock = config.autostart
    ? `
mkdir -p "$HOME/.config/autostart"
cp "$APP_DESKTOP" "$HOME/.config/autostart/\${SLUG}.desktop"
`
    : '';

  return `#!/usr/bin/env bash
set -euo pipefail

# Self-contained Kali Linux Desktop Portal Installer
# Portal: ${name}
# Runtime: ${config.runtime}

SLUG='${escapeShellSingle(slug)}'
PORTAL_NAME='${escapeShellSingle(name)}'

if [ "\${1:-}" = "--uninstall" ]; then
  rm -f "$HOME/.local/share/applications/\${SLUG}.desktop"
  rm -f "$HOME/Desktop/\${SLUG}.desktop"
  rm -f "$HOME/.config/autostart/\${SLUG}.desktop"
  rm -f "$HOME/.local/bin/launch-\${SLUG}.sh"
  rm -f "$HOME/.local/share/icons/hicolor/scalable/apps/\${SLUG}.svg"
  rm -rf "$HOME/.local/share/\${SLUG}" "$HOME/.cache/\${SLUG}"
  command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
  echo "Uninstalled $PORTAL_NAME."
  exit 0
fi
${depInstallBlock}
echo "[2/5] Installing vector application icon..."
ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
mkdir -p "$ICON_DIR"
cat > "$ICON_DIR/\${SLUG}.svg" << 'EOF_SVG'
${svgContent.trimEnd()}
EOF_SVG

echo "[3/5] Installing portal launcher..."
mkdir -p "$HOME/.local/bin"
cat > "$HOME/.local/bin/launch-\${SLUG}.sh" << 'EOF_LAUNCHER'
${launcherContent.trimEnd()}
EOF_LAUNCHER
chmod +x "$HOME/.local/bin/launch-\${SLUG}.sh"
${pythonWriteBlock}
echo "[4/5] Registering desktop entry..."
APP_DIR="$HOME/.local/share/applications"
mkdir -p "$APP_DIR"
APP_DESKTOP="$APP_DIR/\${SLUG}.desktop"
cat > "$APP_DESKTOP" << EOF_DESKTOP
${desktopContent.trimEnd()}
EOF_DESKTOP
chmod +x "$APP_DESKTOP"
${desktopShortcutBlock}${autostartBlock}
echo "[5/5] Refreshing Kali desktop and icon caches..."
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APP_DIR" >/dev/null 2>&1 || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" >/dev/null 2>&1 || true
fi

echo ""
echo "Installation complete for '$PORTAL_NAME'."
echo "  Menu entry : $APP_DESKTOP"
${config.createDesktopShortcut ? `echo "  Desktop    : $HOME/Desktop/\${SLUG}.desktop"` : ''}
${config.autostart ? `echo "  Autostart  : $HOME/.config/autostart/\${SLUG}.desktop"` : ''}
echo "  Uninstall  : bash \$0 --uninstall"
`;
}

export function generateAllFiles(config: PortalConfig): GeneratedFile[] {
  const slug = sanitizeSlug(config.slug || config.name);
  const files: GeneratedFile[] = [
    {
      id: 'installer',
      filename: `install-${slug}.sh`,
      installPath: `./install-${slug}.sh`,
      language: 'bash',
      description: 'Self-contained one-command installer script (supports --uninstall)',
      content: generateInstallerScript(config),
    },
    {
      id: 'desktop',
      filename: `${slug}.desktop`,
      installPath: `~/.local/share/applications/${slug}.desktop`,
      language: 'ini',
      description: 'XDG Desktop Entry for Kali Applications Menu & Desktop shortcut',
      content: generateDesktopEntry(config),
    },
    {
      id: 'launcher',
      filename: `launch-${slug}.sh`,
      installPath: `~/.local/bin/launch-${slug}.sh`,
      language: 'bash',
      description: 'Executable wrapper handling runtime detection and optional VPN checks',
      content: generateLauncherScript(config),
    },
  ];

  if (config.runtime === 'webkitgtk') {
    files.push({
      id: 'python-app',
      filename: `${slug}-app.py`,
      installPath: `~/.local/share/${slug}/${slug}-app.py`,
      language: 'python',
      description: 'Native GTK3 + WebKit2GTK Python desktop application',
      content: generateWebKitPythonApp(config),
    });
  }

  files.push(
    {
      id: 'icon',
      filename: `${slug}.svg`,
      installPath: `~/.local/share/icons/hicolor/scalable/apps/${slug}.svg`,
      language: 'xml',
      description: 'Scalable SVG desktop icon with company monogram',
      content: generatePortalSvg(config),
    },
    {
      id: 'uninstaller',
      filename: `uninstall-${slug}.sh`,
      installPath: `./uninstall-${slug}.sh`,
      language: 'bash',
      description: 'Standalone cleanup script removing launchers, icons, and profiles',
      content: generateUninstallScript(config),
    }
  );

  return files;
}
