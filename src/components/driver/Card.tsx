import { safeNumber } from './utils';

export function Card({ title, value }: { title: string; value: number | null | undefined }) {
  return (
    <div className="bg-white p-4 rounded-xl border">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <h2 className="text-2xl font-bold">{safeNumber(value).toFixed(0)} USD</h2>
    </div>
  );
}
