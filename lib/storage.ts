import type { Journey, OriginPoint } from "./types";

const ORIGIN_KEY = "entregas:origin";
const REGION_KEY = "entregas:region";
const JOURNEY_KEY = "entregas:journey";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getOrigin(): OriginPoint | null {
  return readJson<OriginPoint>(ORIGIN_KEY);
}

export function setOrigin(origin: OriginPoint): void {
  writeJson(ORIGIN_KEY, origin);
}

export function getRegionCode(): string {
  return readJson<string>(REGION_KEY) ?? "AR";
}

export function setRegionCode(regionCode: string): void {
  writeJson(REGION_KEY, regionCode);
}

export function getJourney(): Journey | null {
  return readJson<Journey>(JOURNEY_KEY);
}

export function setJourney(journey: Journey): void {
  writeJson(JOURNEY_KEY, journey);
}

export function clearJourney(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(JOURNEY_KEY);
}
