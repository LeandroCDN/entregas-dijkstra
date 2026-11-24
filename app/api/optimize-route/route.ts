import { NextRequest, NextResponse } from "next/server";
import { computeRouteWithFallback, type LatLng } from "@/lib/routes-api";
import { findFarthestIndex } from "@/lib/geo";
import type { OptimizeRouteRequestBody, OptimizeRouteResponseBody } from "@/lib/types";

const MAX_STOPS = 10;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_ROUTES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta configurar GOOGLE_ROUTES_API_KEY en el servidor." },
      { status: 500 }
    );
  }

  let body: OptimizeRouteRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido." }, { status: 400 });
  }

  const { origin, vehicle, returnToOrigin, stops } = body;
  if (!origin || typeof origin.lat !== "number" || typeof origin.lng !== "number") {
    return NextResponse.json({ error: "Falta el punto de partida." }, { status: 400 });
  }
  if (!Array.isArray(stops) || stops.length === 0) {
    return NextResponse.json({ error: "Agrega al menos una parada." }, { status: 400 });
  }
  if (stops.length > MAX_STOPS) {
    return NextResponse.json(
      { error: `Maximo ${MAX_STOPS} paradas por recorrido.` },
      { status: 400 }
    );
  }

  const travelMode = vehicle === "motorcycle" ? "TWO_WHEELER" : "DRIVE";
  const priorityStop = stops.find((s) => s.priority) ?? null;
  const otherStops = stops.filter((s) => s.id !== priorityStop?.id);

  try {
    const orderedStopIds: string[] = [];
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    let fellBackToDrive = false;

    if (priorityStop) {
      // Leg 1: real origin -> priority stop (fixed, not optimized).
      const leg1 = await computeRouteWithFallback(
        apiKey,
        origin,
        priorityStop,
        [],
        travelMode
      );
      totalDistanceMeters += leg1.distanceMeters;
      totalDurationSeconds += leg1.durationSeconds;
      fellBackToDrive = fellBackToDrive || leg1.fellBackToDrive;
      orderedStopIds.push(priorityStop.id);

      if (otherStops.length === 0) {
        if (returnToOrigin) {
          const legBack = await computeRouteWithFallback(
            apiKey,
            priorityStop,
            origin,
            [],
            travelMode
          );
          totalDistanceMeters += legBack.distanceMeters;
          totalDurationSeconds += legBack.durationSeconds;
          fellBackToDrive = fellBackToDrive || legBack.fellBackToDrive;
        }
      } else {
        const { destination, intermediates, destinationId } = pickDestination(
          priorityStop,
          otherStops,
          returnToOrigin,
          origin
        );
        const leg2 = await computeRouteWithFallback(
          apiKey,
          priorityStop,
          destination,
          intermediates.map((s) => ({ lat: s.lat, lng: s.lng })),
          travelMode
        );
        totalDistanceMeters += leg2.distanceMeters;
        totalDurationSeconds += leg2.durationSeconds;
        fellBackToDrive = fellBackToDrive || leg2.fellBackToDrive;

        for (const index of leg2.optimizedOrder) {
          orderedStopIds.push(intermediates[index].id);
        }
        if (destinationId) orderedStopIds.push(destinationId);
      }
    } else {
      const { destination, intermediates, destinationId } = pickDestination(
        origin,
        otherStops,
        returnToOrigin,
        origin
      );
      const leg = await computeRouteWithFallback(
        apiKey,
        origin,
        destination,
        intermediates.map((s) => ({ lat: s.lat, lng: s.lng })),
        travelMode
      );
      totalDistanceMeters += leg.distanceMeters;
      totalDurationSeconds += leg.durationSeconds;
      fellBackToDrive = leg.fellBackToDrive;

      for (const index of leg.optimizedOrder) {
        orderedStopIds.push(intermediates[index].id);
      }
      if (destinationId) orderedStopIds.push(destinationId);
    }

    const response: OptimizeRouteResponseBody = {
      orderedStopIds,
      totalDistanceMeters,
      totalDurationSeconds,
      usedVehicle: vehicle,
      fellBackToDrive,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "No se pudo calcular la ruta. Intenta de nuevo." },
      { status: 502 }
    );
  }
}

function pickDestination(
  fromPoint: LatLng,
  candidateStops: OptimizeRouteRequestBody["stops"],
  returnToOrigin: boolean,
  origin: LatLng
) {
  if (returnToOrigin) {
    return {
      destination: origin,
      intermediates: candidateStops,
      destinationId: null as string | null,
    };
  }
  const farthestIndex = findFarthestIndex(
    fromPoint,
    candidateStops.map((s) => ({ lat: s.lat, lng: s.lng }))
  );
  const destinationStop = candidateStops[farthestIndex];
  const intermediates = candidateStops.filter(
    (_, index) => index !== farthestIndex
  );
  return {
    destination: { lat: destinationStop.lat, lng: destinationStop.lng },
    intermediates,
    destinationId: destinationStop.id,
  };
}
