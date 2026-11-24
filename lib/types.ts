export type VehicleType = "car" | "motorcycle";

export interface OriginPoint {
  address: string;
  lat: number;
  lng: number;
}

export interface Stop {
  id: string;
  address: string;
  lat: number;
  lng: number;
  notes: string;
  priority: boolean;
  delivered: boolean;
}

export interface Journey {
  vehicle: VehicleType;
  returnToOrigin: boolean;
  stops: Stop[];
  calculated: boolean;
  totalDistanceMeters?: number;
  totalDurationSeconds?: number;
}

export interface OptimizeRouteRequestBody {
  origin: OriginPoint;
  vehicle: VehicleType;
  returnToOrigin: boolean;
  stops: Pick<Stop, "id" | "address" | "lat" | "lng" | "notes" | "priority">[];
}

export interface OptimizeRouteResponseBody {
  orderedStopIds: string[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  usedVehicle: VehicleType;
  fellBackToDrive: boolean;
}
