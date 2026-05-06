import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useTheme } from '../theme-provider';

/**
 * <ThemeToggle> — Light / Dark / System tri-state switcher.
 * Persists via the ThemeProvider (localStorage `theme` key). When set
 * to "system" follows the OS-level prefers-color-scheme. Used in the
 * header on lg+ and in the mobile menu drawer.
 *
 * Rendered as a small icon-button + dropdown so it stays compact in
 * the header without burning real estate. The icon reflects the
 * EFFECTIVE theme so a glance tells the user which mode is active
 * (sun = light, moon = dark, monitor = system).
 */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Theme: ${label}`}
        aria-expanded={open}
        className={`flex items-center gap-1.5 ${compact ? 'p-1.5' : 'px-2.5 py-1.5'} rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-base ease-marketplace`}
      >
        <Icon size={16} />
        {!compact && <span className="text-xs font-semibold">{label}</span>}
        {!compact && <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-medium overflow-hidden z-50"
          role="menu"
        >
          {([
            { id: 'light',  label: 'Light',  Icon: Sun },
            { id: 'dark',   label: 'Dark',   Icon: Moon },
            { id: 'system', label: 'System', Icon: Monitor },
          ] as const).map(opt => (
            <button
              key={opt.id}
              role="menuitemradio"
              aria-checked={theme === opt.id}
              onClick={() => { setTheme(opt.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                theme === opt.id
                  ? 'bg-brand-50 text-brand-600 font-bold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <opt.Icon size={14} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
