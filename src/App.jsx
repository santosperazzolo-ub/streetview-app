import { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import AdminPanel from "./components/AdminPanel";
import StreetViewViewer from "./components/StreetViewViewer";

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState("view");

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
  };

  if (!user || !token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const tabs = [];
  if (user.role === "admin") {
    tabs.push({ id: "admin", label: "📋 Admin" });
  }
  tabs.push({ id: "view", label: "🗺️ Street View" });

  return (
    <div style={{ width: "100%", overflowX: "hidden" }}>
      {/* Header */}
      <div style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        display: "flex",
        gap: 10,
        alignItems: "center",
        background: "rgba(0,0,0,0.9)",
        borderRadius: "0 0 12px 12px",
        padding: "8px 16px"
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: "bold",
              background: tab === t.id ? "white" : "transparent",
              color: tab === t.id ? "black" : "#aaa"
            }}
          >
            {t.label}
          </button>
        ))}

        <div style={{
          borderLeft: "1px solid #666",
          paddingLeft: "10px",
          color: "white",
          fontSize: "12px"
        }}>
          👤 {user.username} ({user.role})
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            border: "none",
            background: "#c00",
            color: "white",
            cursor: "pointer",
            fontSize: "12px"
          }}
        >
          Salir
        </button>
      </div>

      {/* Content */}
      {tab === "admin" && user.role === "admin" ? (
        <AdminPanel token={token} />
      ) : (
        <StreetViewViewer user={user} token={token} />
      )}
    </div>
  );
}
