import React from 'react';
import { safeNumber } from './utils';

/** Stat card used across Overview / Revenue tabs. */
export function Card({
  title,
  value,
  isCurrency = true,
}: {
  title: string;
  value: number;
  isCurrency?: boolean;
}) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xl font-bold text-emerald-600">
        {isCurrency ? `${safeNumber(value).toFixed(0)} USD` : safeNumber(value)}
      </div>
    </div>
  );
}
