import React from 'react';
import { EyeOff, Menu } from 'lucide-react';

/**
 * MobileTopBar - Compact header for mobile devices (< md screens)
 * Features safe-area top padding, vintage license plate badge, typography,
 * clean-view toggle and hamburger navigation trigger.
 */
export function MobileTopBar({
  onOpenDrawer,
  hudHidden,
  onHideHud,
  isLight,
  glassClass,
}) {
  return (
    <header
      className={`block md:hidden pointer-events-none absolute top-0 left-0 right-0 z-20 pt-[max(0.75rem,env(safe-area-inset-top))] px-4 transition-all duration-500 ${
        hudHidden ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="flex items-center justify-between gap-2.5">
        {/* Left Side: Heritage Badge, Vintage Plate Chip, and Title */}
        <div
          className={`pointer-events-auto flex items-center gap-2 rounded-2xl px-3.5 py-2.5 shadow-lg transition-all duration-300 min-w-0 ${glassClass}`}
        >
          <span
            className="inline-block w-2 h-2 rounded-full bg-[#9E1B24] shadow-[0_0_8px_#C8102E] shrink-0"
            aria-hidden="true"
          />
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#0c0d0f] border border-zinc-500/60 font-mono text-[9px] font-bold tracking-[0.16em] text-zinc-100 shadow-inner shrink-0"
            title="Targa Nera Storica Originale di Padova"
          >
            463880 PD
          </span>
          <div className="truncate min-w-0">
            <h1 className="font-serif text-xs sm:text-sm font-semibold tracking-tight text-current truncate block leading-tight">
              Alfa Romeo Alfetta GTV{' '}
              <span className="italic font-normal text-alfa-gold">(1976)</span>
            </h1>
          </div>
        </div>

        {/* Right Side: Clean View Toggle and Hamburger Menu (touch targets >= 44x44px) */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onHideHud}
            aria-label="Nascondi controlli per vista pulita"
            title="Nascondi controlli per vista pulita"
            className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl transition-all duration-200 shadow-lg active:scale-95 ${glassClass} ${
              isLight
                ? 'hover:bg-white/90 text-zinc-700 active:bg-zinc-200'
                : 'hover:bg-white/10 text-zinc-300 active:bg-white/20'
            }`}
          >
            <EyeOff className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="Apri menu navigazione"
            title="Apri menu navigazione"
            className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl transition-all duration-200 shadow-lg active:scale-95 ${glassClass} ${
              isLight
                ? 'hover:bg-white/90 text-zinc-900 active:bg-zinc-200'
                : 'hover:bg-white/10 text-zinc-100 active:bg-white/20'
            }`}
          >
            <Menu className="w-5 h-5 text-alfa-gold" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default MobileTopBar;
