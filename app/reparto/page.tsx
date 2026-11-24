"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildFullRouteUrl,
  buildSingleStopUrl,
} from "@/lib/maps-links";
import { clearJourney, getJourney, getOrigin, setJourney } from "@/lib/storage";
import type { Journey, OriginPoint } from "@/lib/types";

function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h ${rest} min`;
}

export default function DeliveryModePage() {
  const router = useRouter();
  const [journey, setJourneyState] = useState<Journey | null>(null);
  const [origin, setOriginState] = useState<OriginPoint | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // localStorage is only available client-side, so hydration has to happen
    // in an effect (after the SSR-safe null initial render).
    /* eslint-disable react-hooks/set-state-in-effect */
    const savedJourney = getJourney();
    const savedOrigin = getOrigin();
    setOriginState(savedOrigin);
    if (!savedJourney || !savedJourney.calculated || !savedOrigin) {
      router.replace("/");
      return;
    }
    setJourneyState(savedJourney);
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router]);

  function toggleDelivered(id: string) {
    setJourneyState((prev) => {
      if (!prev) return prev;
      const updated: Journey = {
        ...prev,
        stops: prev.stops.map((s) =>
          s.id === id ? { ...s, delivered: !s.delivered } : s
        ),
      };
      setJourney(updated);
      return updated;
    });
  }

  function handleClearJourney() {
    clearJourney();
    router.push("/");
  }

  if (!loaded || !journey || !origin) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <p className="text-sm text-slate-500">Cargando jornada...</p>
      </main>
    );
  }

  const allDelivered = journey.stops.every((s) => s.delivered);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6">
      <h1 className="text-2xl font-bold text-slate-900">Modo reparto</h1>
      <p className="mt-1 text-sm text-slate-500">
        {journey.vehicle === "motorcycle" ? "Moto" : "Auto"}
        {journey.totalDistanceMeters !== undefined &&
          journey.totalDurationSeconds !== undefined &&
          ` · ${formatDistance(journey.totalDistanceMeters)} · ${formatDuration(
            journey.totalDurationSeconds
          )}`}
      </p>

      <a
        href={buildFullRouteUrl(origin, journey.stops, journey.returnToOrigin)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block w-full rounded-xl bg-blue-600 px-4 py-4 text-center text-base font-bold text-white shadow-sm"
      >
        Abrir ruta completa en Google Maps
      </a>

      <section className="mt-4 space-y-3">
        {journey.stops.map((stop, index) => (
          <div
            key={stop.id}
            className={`rounded-lg border p-3 shadow-sm ${
              stop.delivered
                ? "border-slate-200 bg-slate-100"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {index + 1}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    stop.delivered
                      ? "text-slate-400 line-through"
                      : "text-slate-800"
                  }`}
                >
                  {stop.address}
                  {stop.priority && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                      Prioridad
                    </span>
                  )}
                </p>
                {stop.notes && (
                  <p
                    className={`mt-1 text-sm ${
                      stop.delivered
                        ? "text-slate-400 line-through"
                        : "text-slate-600"
                    }`}
                  >
                    {stop.notes}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <a
                    href={buildSingleStopUrl(stop)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Ir a esta parada
                  </a>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    Entregado
                    <input
                      type="checkbox"
                      checked={stop.delivered}
                      onChange={() => toggleDelivered(stop.id)}
                      className="h-5 w-5 accent-blue-600"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {allDelivered && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          Jornada completa. Buen trabajo.
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md bg-gradient-to-t from-slate-50 px-4 pb-4 pt-6">
        <button
          type="button"
          onClick={handleClearJourney}
          className="w-full rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-600"
        >
          Limpiar jornada
        </button>
      </div>
    </main>
  );
}
