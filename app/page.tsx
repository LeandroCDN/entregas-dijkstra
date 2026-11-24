"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AddressAutocompleteInput, {
  type SelectedPlace,
} from "@/components/AddressAutocompleteInput";
import StopEditorCard from "@/components/StopEditorCard";
import {
  getJourney,
  getOrigin,
  getRegionCode,
  setJourney,
  setOrigin,
  setRegionCode,
} from "@/lib/storage";
import type { OptimizeRouteResponseBody, OriginPoint, Stop, VehicleType } from "@/lib/types";

const MAX_STOPS = 8;

export default function SetupPage() {
  const router = useRouter();
  const hydrated = useRef(false);

  const [origin, setOriginState] = useState<OriginPoint | null>(null);
  const [editingOrigin, setEditingOrigin] = useState(false);
  const [originDraft, setOriginDraft] = useState("");
  const [originPendingPlace, setOriginPendingPlace] =
    useState<SelectedPlace | null>(null);
  const [regionCode, setRegionCodeState] = useState("AR");

  const [stops, setStops] = useState<Stop[]>([]);
  const [newStopAddress, setNewStopAddress] = useState("");
  const [newStopPlace, setNewStopPlace] = useState<SelectedPlace | null>(null);
  const [newStopNotes, setNewStopNotes] = useState("");

  const [vehicle, setVehicle] = useState<VehicleType>("motorcycle");
  const [returnToOrigin, setReturnToOrigin] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // localStorage is only available client-side, so hydration has to happen
    // in an effect (after the SSR-safe null/default initial render).
    /* eslint-disable react-hooks/set-state-in-effect */
    const savedOrigin = getOrigin();
    const savedRegion = getRegionCode();
    const journey = getJourney();
    setOriginState(savedOrigin);
    setRegionCodeState(savedRegion);
    if (!savedOrigin) setEditingOrigin(true);
    if (journey) {
      setStops(journey.stops);
      setVehicle(journey.vehicle);
      setReturnToOrigin(journey.returnToOrigin);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    setJourney({ vehicle, returnToOrigin, stops, calculated: false });
  }, [stops, vehicle, returnToOrigin]);

  function handleSaveOrigin() {
    if (!originPendingPlace) return;
    const newOrigin: OriginPoint = {
      address: originPendingPlace.address,
      lat: originPendingPlace.lat,
      lng: originPendingPlace.lng,
    };
    setOrigin(newOrigin);
    setRegionCode(regionCode.trim().toUpperCase() || "AR");
    setOriginState(newOrigin);
    setEditingOrigin(false);
    setOriginPendingPlace(null);
    setOriginDraft("");
  }

  function handleAddStop() {
    if (!newStopPlace) return;
    const stop: Stop = {
      id: crypto.randomUUID(),
      address: newStopPlace.address,
      lat: newStopPlace.lat,
      lng: newStopPlace.lng,
      notes: newStopNotes.trim(),
      priority: false,
      delivered: false,
    };
    setStops((prev) => [...prev, stop]);
    setNewStopAddress("");
    setNewStopPlace(null);
    setNewStopNotes("");
  }

  function handleDeleteStop(id: string) {
    setStops((prev) => prev.filter((s) => s.id !== id));
  }

  function handleTogglePriority(id: string) {
    setStops((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, priority: !s.priority } : { ...s, priority: false }
      )
    );
  }

  function handleNotesChange(id: string, notes: string) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, notes } : s)));
  }

  async function handleCalculate() {
    if (!origin) {
      setErrorMessage("Configura el punto de partida primero.");
      setEditingOrigin(true);
      return;
    }
    if (stops.length === 0) {
      setErrorMessage("Agrega al menos una parada.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/optimize-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, vehicle, returnToOrigin, stops }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo calcular la ruta.");
      }
      const result = data as OptimizeRouteResponseBody;
      const byId = new Map(stops.map((s) => [s.id, s]));
      const orderedStops = result.orderedStopIds
        .map((id) => byId.get(id))
        .filter((s): s is Stop => Boolean(s));
      setJourney({
        vehicle,
        returnToOrigin,
        stops: orderedStops,
        calculated: true,
        totalDistanceMeters: result.totalDistanceMeters,
        totalDurationSeconds: result.totalDurationSeconds,
      });
      router.push("/reparto");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo calcular la ruta."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pb-28 pt-6">
      <h1 className="text-2xl font-bold text-slate-900">Armar jornada</h1>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-600">
          Punto de partida
        </h2>
        {!editingOrigin && origin && (
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-sm text-slate-800">{origin.address}</p>
            <button
              type="button"
              onClick={() => setEditingOrigin(true)}
              className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
            >
              Editar
            </button>
          </div>
        )}
        {editingOrigin && (
          <div className="mt-2 space-y-2">
            <AddressAutocompleteInput
              id="origin-address"
              label="Direccion de partida"
              placeholder="Buscar direccion..."
              value={originDraft}
              onChange={setOriginDraft}
              onSelect={(place) => {
                setOriginDraft(place.address);
                setOriginPendingPlace(place);
              }}
              regionCode={regionCode}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Pais / region (codigo, ej: AR)
              </label>
              <input
                type="text"
                maxLength={2}
                value={regionCode}
                onChange={(e) => setRegionCodeState(e.target.value.toUpperCase())}
                className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              disabled={!originPendingPlace}
              onClick={handleSaveOrigin}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Guardar punto de partida
            </button>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-600">
          Agregar parada ({stops.length}/{MAX_STOPS})
        </h2>
        <div className="mt-2 space-y-2">
          <AddressAutocompleteInput
            id="new-stop-address"
            label="Direccion"
            placeholder="Pegar o buscar direccion..."
            value={newStopAddress}
            onChange={setNewStopAddress}
            onSelect={(place) => {
              setNewStopAddress(place.address);
              setNewStopPlace(place);
            }}
            biasCenter={origin}
            regionCode={regionCode}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Que entregar / notas
            </label>
            <input
              type="text"
              value={newStopNotes}
              onChange={(e) => setNewStopNotes(e.target.value)}
              placeholder="Producto, monto a cobrar, timbre..."
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <button
            type="button"
            disabled={!newStopPlace || stops.length >= MAX_STOPS}
            onClick={handleAddStop}
            className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Agregar parada
          </button>
        </div>
      </section>

      {stops.length > 0 && (
        <section className="mt-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-600">
            Paradas cargadas
          </h2>
          {stops.map((stop) => (
            <StopEditorCard
              key={stop.id}
              stop={stop}
              onDelete={handleDeleteStop}
              onTogglePriority={handleTogglePriority}
              onNotesChange={handleNotesChange}
            />
          ))}
        </section>
      )}

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-600">Vehiculo</h2>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setVehicle("motorcycle")}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold ${
              vehicle === "motorcycle"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 text-slate-700"
            }`}
          >
            Moto
          </button>
          <button
            type="button"
            onClick={() => setVehicle("car")}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold ${
              vehicle === "car"
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 text-slate-700"
            }`}
          >
            Auto
          </button>
        </div>

        <label className="mt-3 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-700">
            Volver al punto de partida
          </span>
          <input
            type="checkbox"
            checked={returnToOrigin}
            onChange={(e) => setReturnToOrigin(e.target.checked)}
            className="h-6 w-6 accent-blue-600"
          />
        </label>
      </section>

      {errorMessage && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-md bg-gradient-to-t from-slate-50 px-4 pb-4 pt-6">
        <button
          type="button"
          disabled={loading || stops.length === 0}
          onClick={handleCalculate}
          className="w-full rounded-xl bg-blue-600 px-4 py-4 text-base font-bold text-white shadow-lg disabled:opacity-40"
        >
          {loading ? "Calculando..." : "Calcular mejor ruta"}
        </button>
      </div>
    </main>
  );
}
