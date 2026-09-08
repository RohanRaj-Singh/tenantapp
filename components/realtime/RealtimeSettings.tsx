'use client';

import { useEffect, useState } from 'react';
import { Settings, Volume2, Monitor } from 'lucide-react';
import { useRealtime } from './RealtimeProvider';
import { getBrowserNotifyPermission, type BrowserNotifyPermission } from '@/lib/realtime/browserNotify';

export function RealtimeSettings() {
  const { soundEnabled, setSoundEnabled, browserNotifyEnabled, setBrowserNotifyEnabled } = useRealtime();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<BrowserNotifyPermission>('default');

  useEffect(() => {
    setPermission(getBrowserNotifyPermission());
  }, [browserNotifyEnabled]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notification settings"
        className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Notifications</p>

          <label className="flex cursor-pointer items-center justify-between rounded-md px-2 py-2 hover:bg-slate-50">
            <span className="flex items-center gap-2 text-sm text-slate-700">
              <Volume2 className="h-4 w-4" />
              Sound
            </span>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="h-4 w-4"
            />
          </label>

          <label
            className={`flex items-center justify-between rounded-md px-2 py-2 hover:bg-slate-50 ${
              permission === 'unsupported' || permission === 'denied' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
          >
            <span className="flex items-center gap-2 text-sm text-slate-700">
              <Monitor className="h-4 w-4" />
              Desktop alerts
              {permission === 'denied' && <span className="text-[10px] text-red-600">(blocked)</span>}
              {permission === 'unsupported' && <span className="text-[10px] text-slate-500">(not supported)</span>}
            </span>
            <input
              type="checkbox"
              disabled={permission === 'unsupported' || permission === 'denied'}
              checked={browserNotifyEnabled && permission === 'granted'}
              onChange={(e) => void setBrowserNotifyEnabled(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
        </div>
      )}
    </div>
  );
}
