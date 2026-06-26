import { useState } from "react";

export default function LoginPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async (endpoint) => {
    setLoading(true);
    setError("");

    const body = {
      username,
      password,
      ...(tab === "register" && { email, company })
    };

    try {
      const res = await fetch(`http://localhost:3001/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en autenticación");

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    }}>
      <div style={{
        background: "white",
        padding: "40px",
        borderRadius: "12px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        width: "100%",
        maxWidth: "400px"
      }}>
        <h1 style={{ textAlign: "center", marginBottom: "30px" }}>Street View</h1>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            onClick={() => setTab("login")}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "6px",
              background: tab === "login" ? "#667eea" : "#eee",
              color: tab === "login" ? "white" : "black",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Ingresar
          </button>
          <button
            onClick={() => setTab("register")}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              borderRadius: "6px",
              background: tab === "register" ? "#667eea" : "#eee",
              color: tab === "register" ? "white" : "black",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Registrarse
          </button>
        </div>

        {error && (
          <div style={{
            background: "#fee",
            color: "#c00",
            padding: "10px",
            borderRadius: "6px",
            marginBottom: "15px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px"
            }}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px"
            }}
          />

          {tab === "register" && (
            <>
              <input
                type="email"
                placeholder="Email (opcional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              />

              <input
                type="text"
                placeholder="Empresa (opcional)"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                style={{
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "14px"
                }}
              />
            </>
          )}

          <button
            onClick={() => handleAuth(tab === "login" ? "login" : "register")}
            disabled={loading}
            style={{
              padding: "12px",
              border: "none",
              borderRadius: "6px",
              background: "#667eea",
              color: "white",
              fontWeight: "bold",
              cursor: loading ? "wait" : "pointer",
              fontSize: "14px"
            }}
          >
            {loading ? "Procesando..." : tab === "login" ? "Ingresar" : "Registrarse"}
          </button>
        </div>

        {/* Demo users */}
        <div style={{
          marginTop: "20px",
          fontSize: "12px",
          color: "#666",
          textAlign: "center"
        }}>
          <p style={{ marginBottom: "5px" }}>👤 Demo:</p>
          <p>Admin: admin / 123</p>
          <p>User: user / 123</p>
        </div>
      </div>
    </div>
  );
}
