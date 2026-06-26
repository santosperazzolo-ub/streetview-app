import { useEffect, useRef } from "react";
import Marzipano from "marzipano";

export default function PanoramaView({ pano, panos, setCurrent }) {
  const viewerRef = useRef(null);
  const videoRef = useRef(null);
  const viewerInstance = useRef(null);
  const currentView = useRef(null);

  const prevPano = pano.links
    .map((id) => panos.find((p) => p.id === id))
    .filter(Boolean)
    .find((p) => p.id < pano.id);

  const nextPano = pano.links
    .map((id) => panos.find((p) => p.id === id))
    .filter(Boolean)
    .find((p) => p.id > pano.id);

  const isVideo = pano.video;

  // Para panoramas (imágenes 360)
  useEffect(() => {
    if (isVideo || !viewerRef.current) return;

    if (!viewerInstance.current) {
      viewerInstance.current = new Marzipano.Viewer(viewerRef.current, {
        stageType: "webgl",
        controls: { mouseViewMode: "drag" },
      });
    }

    const viewer = viewerInstance.current;
    const el = viewerRef.current;

    let savedYaw = 0, savedPitch = 0;
    if (currentView.current) {
      savedYaw = currentView.current.yaw();
      savedPitch = currentView.current.pitch();
    }

    const source = Marzipano.ImageUrlSource.fromString(pano.image);
    const geometry = new Marzipano.EquirectGeometry([{ width: 8000 }]);
    const limiter = Marzipano.RectilinearView.limit.traditional(4096, 100 * Math.PI / 180);
    const view = new Marzipano.RectilinearView(
      { yaw: savedYaw, pitch: savedPitch, fov: Math.PI / 2 },
      limiter
    );
    currentView.current = view;

    const scene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });
    scene.switchTo({ transitionDuration: 500 });

    const onDblClick = (e) => {
      const mitad = el.offsetWidth / 2;
      if (e.offsetX >= mitad && nextPano) setCurrent(nextPano);
      else if (e.offsetX < mitad && prevPano) setCurrent(prevPano);
    };

    el.addEventListener("dblclick", onDblClick);
    return () => el.removeEventListener("dblclick", onDblClick);

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
    <div ref={viewerRef} style={{ width: "100%", height: "100%", background: "black" }} />
  );
}
