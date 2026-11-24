"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMapsReady } from "./GoogleMapsProvider";

export interface SelectedPlace {
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (text: string) => void;
  onSelect: (place: SelectedPlace) => void;
  biasCenter?: { lat: number; lng: number } | null;
  regionCode?: string;
}

let sessionToken: google.maps.places.AutocompleteSessionToken | null = null;

function getSessionToken(): google.maps.places.AutocompleteSessionToken {
  if (!sessionToken) {
    sessionToken = new google.maps.places.AutocompleteSessionToken();
  }
  return sessionToken;
}

function resetSessionToken(): void {
  sessionToken = null;
}

export default function AddressAutocompleteInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  biasCenter,
  regionCode,
}: Props) {
  const mapsReady = useGoogleMapsReady();
  const [suggestions, setSuggestions] = useState<
    google.maps.places.PlacePrediction[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchSuggestions(input: string) {
    if (!mapsReady || input.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const { AutocompleteSuggestion } = (await google.maps.importLibrary(
        "places"
      )) as google.maps.PlacesLibrary;

      const request: google.maps.places.AutocompleteRequest = {
        input,
        sessionToken: getSessionToken(),
        includedRegionCodes: regionCode ? [regionCode] : undefined,
        locationBias: biasCenter
          ? { center: biasCenter, radius: 50000 }
          : undefined,
      };

      const { suggestions: results } =
        await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      setSuggestions(
        results
          .map((s) => s.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => Boolean(p))
      );
      setOpen(true);
    } catch (error) {
      console.error("Error buscando direcciones", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(text: string) {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  }

  async function handleSelect(prediction: google.maps.places.PlacePrediction) {
    setOpen(false);
    setSuggestions([]);
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ["formattedAddress", "location"] });
    resetSessionToken();
    if (!place.location) return;
    onSelect({
      address: place.formattedAddress ?? prediction.text.toString(),
      lat: place.location.lat(),
      lng: place.location.lng(),
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {!mapsReady && (
        <p className="mt-1 text-xs text-amber-600">
          Cargando buscador de direcciones…
        </p>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.map((prediction) => (
            <li key={prediction.placeId}>
              <button
                type="button"
                onClick={() => handleSelect(prediction)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 active:bg-blue-100"
              >
                {prediction.text.toString()}
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && (
        <p className="mt-1 text-xs text-slate-400">Buscando…</p>
      )}
    </div>
  );
}
