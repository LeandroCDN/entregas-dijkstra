"use client";

import Script from "next/script";
import { createContext, useCallback, useContext, useState } from "react";

const GoogleMapsContext = createContext(false);

export function useGoogleMapsReady(): boolean {
  return useContext(GoogleMapsContext);
}

export function GoogleMapsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleReady = useCallback(() => {
    setReady(true);
  }, []);

  if (!apiKey) {
    return <>{children}</>;
  }

  return (
    <GoogleMapsContext.Provider value={ready}>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&v=weekly`}
        strategy="afterInteractive"
        onReady={handleReady}
      />
      {children}
    </GoogleMapsContext.Provider>
  );
}
