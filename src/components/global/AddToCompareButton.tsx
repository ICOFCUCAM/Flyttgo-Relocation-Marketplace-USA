import React from 'react';
import { Plus, Check, Lock } from 'lucide-react';
import {
  addToCompare,
  removeFromCompare,
  isInCompare,
  useCompareStore,
  COMPARE_MAX,
  type CompareItem,
} from '../../lib/compare-store';

/**
 * Small "Add to compare" toggle pill placed on every provider card.
 * Uses the compare-store to add / remove the provider's snapshot from
 * the shortlist. When the shortlist is full (3 items) and this card
 * isn't already in it, the button locks and explains.
 */
export default function AddToCompareButton({
  item,
  className = '',
}: {
  item: CompareItem;
  className?: string;
}) {
  const items = useCompareStore();
  const inList = isInCompare(item.id);
  const isFull = items.length >= COMPARE_MAX && !inList;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (inList) removeFromCompare(item.id);
    else addToCompare(item);
  }

  if (isFull) {
    return (
      <button
        type="button"
        disabled
        title={`Compare list is full (${COMPARE_MAX} max). Remove a provider first.`}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed ${className}`}
      >
        <Lock size={12} />
        Compare full
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={inList}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-base ease-marketplace ${
        inList
          ? 'bg-trust-50 text-trust-600 hover:bg-trust-50/80'
          : 'bg-brand-50 text-brand-600 hover:bg-brand-500 hover:text-ink-900'
      } ${className}`}
    >
      {inList ? <Check size={12} /> : <Plus size={12} />}
      {inList ? 'Comparing' : 'Compare'}
    </button>
  );
}
