export interface LatLng {
  lat: number;
  lng: number;
}

export type RoutesTravelMode = "DRIVE" | "TWO_WHEELER";

export interface ComputeRouteResult {
  distanceMeters: number;
  durationSeconds: number;
  optimizedOrder: number[];
}

const ROUTES_ENDPOINT =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

function toWaypoint(point: LatLng) {
  return {
    location: {
      latLng: { latitude: point.lat, longitude: point.lng },
    },
  };
}

function parseDurationSeconds(duration: string | undefined): number {
  if (!duration) return 0;
  const match = /^(\d+)s$/.exec(duration);
  return match ? Number(match[1]) : 0;
}

async function callComputeRoutes(
  apiKey: string,
  origin: LatLng,
  destination: LatLng,
  intermediates: LatLng[],
  travelMode: RoutesTravelMode
): Promise<ComputeRouteResult> {
  const body = {
    origin: toWaypoint(origin),
    destination: toWaypoint(destination),
    intermediates: intermediates.map(toWaypoint),
    travelMode,
    optimizeWaypointOrder: intermediates.length > 0,
  };

  const response = await fetch(ROUTES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Routes API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) {
    throw new Error("Routes API no devolvio ninguna ruta.");
  }

  return {
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: parseDurationSeconds(route.duration),
    optimizedOrder:
      route.optimizedIntermediateWaypointIndex ??
      intermediates.map((_, index) => index),
  };
}

export async function computeRouteWithFallback(
  apiKey: string,
  origin: LatLng,
  destination: LatLng,
  intermediates: LatLng[],
  travelMode: RoutesTravelMode
): Promise<ComputeRouteResult & { fellBackToDrive: boolean }> {
  if (travelMode === "DRIVE") {
    const result = await callComputeRoutes(
      apiKey,
      origin,
      destination,
      intermediates,
      "DRIVE"
    );
    return { ...result, fellBackToDrive: false };
  }

  try {
    const result = await callComputeRoutes(
      apiKey,
      origin,
      destination,
      intermediates,
      "TWO_WHEELER"
    );
    return { ...result, fellBackToDrive: false };
  } catch {
    const result = await callComputeRoutes(
      apiKey,
      origin,
      destination,
      intermediates,
      "DRIVE"
    );
    return { ...result, fellBackToDrive: true };
  }
}
