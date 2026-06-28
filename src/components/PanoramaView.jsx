import { useEffect, useRef } from "react";

export default function PanoramaView({ pano, panos, setCurrent }) {
  const viewerRef = useRef(null);
  const videoRef = useRef(null);

  const prevPano = pano.links
    .map((id) => panos.find((p) => p.id === id))
    .filter(Boolean)
    .find((p) => p.id < pano.id);

  const nextPano = pano.links
    .map((id) => panos.find((p) => p.id === id))
    .filter(Boolean)
    .find((p) => p.id > pano.id);

  const isVideo = pano.video;

  // Para frames (imágenes de frame por frame)
  useEffect(() => {
    if (isVideo || !viewerRef.current) return;

    const onDblClick = (e) => {
      const mitad = viewerRef.current.offsetWidth / 2;
      if (e.offsetX >= mitad && nextPano) setCurrent(nextPano);
      else if (e.offsetX < mitad && prevPano) setCurrent(prevPano);
    };

    viewerRef.current.addEventListener("dblclick", onDblClick);
    return () => viewerRef.current?.removeEventListener("dblclick", onDblClick);

  }, [pano, panos, setCurrent, isVideo]);

  // Para videos
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const onDblClick = (e) => {
      const mitad = videoRef.current.offsetWidth / 2;
      if (e.offsetX >= mitad && nextPano) setCurrent(nextPano);
      else if (e.offsetX < mitad && prevPano) setCurrent(prevPano);
    };

    videoRef.current.addEventListener("dblclick", onDblClick);
    return () => videoRef.current?.removeEventListener("dblclick", onDblClick);

  }, [pano, panos, setCurrent, isVideo]);

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        src={pano.image}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          background: "black"
        }}
        controls
        autoPlay
        loop
      />
    );
  }

  return (
    <img
      ref={viewerRef}
      src={pano.image}
      alt={`Frame ${pano.id}`}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        background: "black",
        cursor: "pointer"
      }}
      title="Doble click izquierda/derecha para navegar"
    />
  );
}
