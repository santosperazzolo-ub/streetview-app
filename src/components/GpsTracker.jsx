import { useEffect } from "react";

export default function GpsTracker({
  setGps
}) {

  useEffect(() => {

    const watchId =
      navigator.geolocation.watchPosition(
        (pos) => {

          setGps({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            heading: pos.coords.heading,
            accuracy: pos.coords.accuracy
          });

        },
        console.error,
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );

    return () =>
      navigator.geolocation.clearWatch(
        watchId
      );

  }, []);

  return null;
}
