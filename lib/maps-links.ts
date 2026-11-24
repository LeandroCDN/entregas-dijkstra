import type { OriginPoint, Stop } from "./types";

// Google Maps' deep-link URL API only accepts driving|walking|bicycling|transit.
// There is no dedicated motorcycle mode, so every link uses "driving";
// the rider can switch to two-wheeler mode inside the Maps app if needed.
const TRAVEL_MODE = "driving";

function coord(point: { lat: number; lng: number }): string {
  return `${point.lat},${point.lng}`;
}

export function buildFullRouteUrl(
  origin: OriginPoint,
  orderedStops: Stop[],
  returnToOrigin: boolean
): string {
  const destination = returnToOrigin
    ? origin
    : orderedStops[orderedStops.length - 1];
  const waypointStops = returnToOrigin
    ? orderedStops
    : orderedStops.slice(0, -1);

  const params = new URLSearchParams({
    api: "1",
    origin: coord(origin),
    destination: coord(destination),
    travelmode: TRAVEL_MODE,
  });
  if (waypointStops.length > 0) {
    params.set("waypoints", waypointStops.map(coord).join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildSingleStopUrl(stop: Stop): string {
  const params = new URLSearchParams({
    api: "1",
    destination: coord(stop),
    travelmode: TRAVEL_MODE,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
