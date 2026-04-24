// (c) 2026 Briefy contributors — AGPL-3.0
import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import type { PageProps } from '@/types';

export function FlashMessage() {
  const { flash } = usePage<PageProps>().props;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (flash?.success || flash?.error) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [flash]);

  if (!visible || (!flash?.success && !flash?.error)) return null;

  const isSuccess = !!flash.success;
  return (
    <div className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-6 flex items-center gap-3 rounded-[12px] px-4 py-3 shadow-lg text-sm font-medium ${isSuccess ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
      {isSuccess ? <CheckCircle size={16} /> : <XCircle size={16} />}
      {flash.success ?? flash.error}
      <button onClick={() => setVisible(false)} className="ml-1 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}
