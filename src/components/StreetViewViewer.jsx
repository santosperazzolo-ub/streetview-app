import { useState, useEffect } from "react";
import MapView from "./MapView";
import PanoramaView from "./PanoramaView";
import { filterPointsByDistance } from "../utils/gpsUtils";

export default function StreetViewViewer({ user, token }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [panos, setPanos] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('👤 User:', user.username, '| Token disponible:', !!token);
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchPanos(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      console.log('📦 Obteniendo proyectos...');
      const res = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log('✓ Proyectos obtenidos:', data.length);
      setProjects(data);
      if (data.length > 0) {
        console.log('🔀 Seleccionando proyecto:', data[0].id);
        setSelectedProject(data[0]);
      } else {
        console.log('⚠️ Sin proyectos disponibles');
      }
    } catch (e) {
      console.error("❌ Error fetching projects:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPanos = async (projectId) => {
    setLoading(true);
    try {
      console.log('📍 Cargando frames para proyecto:', projectId);
      // Fetch frames (si existen) o GPS points
      const framesRes = await fetch(`/api/projects/${projectId}/frames`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const frames = await framesRes.json();
      console.log('✓ Frames obtenidos:', frames.length);

      let panoList = [];

      if (frames.length > 0) {
        // Si hay frames extraídos, filtrar por distancia (3 metros)
        const filteredFrames = filterPointsByDistance(frames, 3);
        console.log(`📍 Frames filtrados: ${filteredFrames.length} de ${frames.length}`);

        panoList = filteredFrames.map((frame, i) => ({
          id: i + 1,
          lat: frame.lat,
          lon: frame.lon,
          heading: frame.heading || 0,
          image: `${frame.framePath}`,
          video: false,
          links: i === 0 ? (filteredFrames.length > 1 ? [2] : []) : i === filteredFrames.length - 1 ? [i] : [i, i + 2]
        }));
      } else {
        // Fallback: usar puntos GPS
        const gpsRes = await fetch(`/api/projects/${projectId}/gps`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const gpsData = await gpsRes.json();

        // Fetch video como fallback
        const videoRes = await fetch(`/api/projects/${projectId}/video`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const videoData = await videoRes.json();

        const videoUrl = videoData.videoPath
          ? `${videoData.videoPath}`
          : "/video.MP4";

        // Filtrar GPS points por distancia (3 metros)
        const filteredGpsData = filterPointsByDistance(gpsData, 3);
        console.log(`📍 GPS points filtrados: ${filteredGpsData.length} de ${gpsData.length}`);

        panoList = filteredGpsData.map((point, i) => ({
          id: i + 1,
          lat: point.lat,
          lon: point.lon,
          heading: point.heading || 0,
          image: videoUrl,
          video: true,
          links: i === 0 ? (filteredGpsData.length > 1 ? [2] : []) : i === filteredGpsData.length - 1 ? [i] : [i, i + 2]
        }));
      }

      console.log('🎯 Panoramas creados:', panoList.length);
      setPanos(panoList);
      if (panoList.length > 0) {
        setCurrent(panoList[0]);
        console.log('✓ Primer panorama establecido');
      } else {
        console.log('⚠️ Sin panoramas disponibles');
      }
    } catch (e) {
      console.error("❌ Error fetching panos:", e);
    } finally {
      setLoading(false);
    }
  };

  const mobile = window.innerWidth < 768;

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        height: "100vh",
        background: "black",
        color: "white"
      }}>
        Cargando...
      </div>
    );
  }

  return (
    <>
      {/* Project selector */}
      {projects.length > 1 && (
        <div style={{
          position: "fixed",
          top: 10,
          left: 10,
          zIndex: 9999,
          background: "rgba(0,0,0,0.9)",
          color: "white",
          padding: "10px",
          borderRadius: "8px"
        }}>
          <select
            value={selectedProject?.id || ""}
            onChange={(e) => {
              const proj = projects.find(p => p.id === parseInt(e.target.value));
              setSelectedProject(proj);
            }}
            style={{
              padding: "5px",
              borderRadius: "4px",
              border: "none"
            }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: mobile ? "column" : "row",
          overflow: "hidden",
          background: "black"
        }}
      >
        {/* Mapa */}
        <div
          style={{
            width: mobile ? "100%" : "35%",
            height: mobile ? "22%" : "100%"
          }}
        >
          {panos.length > 0 && (
            <MapView
              panos={panos}
              current={current}
              setCurrent={setCurrent}
            />
          )}
        </div>

        {/* Panorama */}
        <div
          style={{
            width: mobile ? "100%" : "65%",
            height: mobile ? "78%" : "100%",
            position: "relative",
            background: "black"
          }}
        >
          {current && panos.length > 0 && (
            <PanoramaView
              pano={current}
              panos={panos}
              setCurrent={setCurrent}
            />
          )}
        </div>
      </div>
    </>
  );
}
