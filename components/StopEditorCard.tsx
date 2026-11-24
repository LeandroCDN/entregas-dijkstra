"use client";

import type { Stop } from "@/lib/types";

interface Props {
  stop: Stop;
  onDelete: (id: string) => void;
  onTogglePriority: (id: string) => void;
  onNotesChange: (id: string, notes: string) => void;
}

export default function StopEditorCard({
  stop,
  onDelete,
  onTogglePriority,
  onNotesChange,
}: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1 text-sm font-medium text-slate-800">
          {stop.address}
        </p>
        <button
          type="button"
          onClick={() => onTogglePriority(stop.id)}
          aria-label="Marcar como prioridad (ir primero)"
          className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${
            stop.priority
              ? "border-amber-400 bg-amber-100 text-amber-700"
              : "border-slate-200 text-slate-400 hover:bg-slate-50"
          }`}
        >
          ★ Prioridad
        </button>
      </div>
      <input
        type="text"
        value={stop.notes}
        onChange={(e) => onNotesChange(stop.id, e.target.value)}
        placeholder="Que entregar / notas (producto, monto, timbre...)"
        className="mt-2 w-full rounded-md border border-slate-200 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        type="button"
        onClick={() => onDelete(stop.id)}
        className="mt-2 text-xs font-medium text-red-600 hover:underline"
      >
        Eliminar parada
      </button>
    </div>
  );
}
