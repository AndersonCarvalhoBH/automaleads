// src/App.tsx

import React, { useEffect, useState } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { Dashboard } from "./pages/Dashboard";
import { MasterDashboard } from "./pages/MasterDashboard";
import { LoginResponse } from "./api";

type View = "login" | "signup" | "dashboard";

const App: React.FC = () => {
  const [view, setView] = useState<View>("login");
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // Tenta carregar token + role salvos ao abrir a aplicação
  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    const storedRole = localStorage.getItem("authRole");

    if (storedToken) {
      setToken(storedToken);
      if (storedRole) {
        setRole(storedRole);
      }
      setView("dashboard");
    }
  }, []);

  /**
   * Chamado quando login/cadastro tem sucesso.
   * Recebe o LoginResponse vindo da API.
   */
  function handleLoginSuccess(auth: LoginResponse) {
    const newToken = auth.token;
    const newRole = auth.user?.role || null;

    setToken(newToken);
    setRole(newRole);
    setView("dashboard");
  }

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authRole");
    localStorage.removeItem("authUser");

    setToken(null);
    setRole(null);
    setView("login");
  }

  return (
    <ChakraProvider>
      {view === "login" && (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onOpenSignup={() => setView("signup")}
        />
      )}

      {view === "signup" && (
        <SignupPage
          onSignupSuccess={handleLoginSuccess}
          onBackToLogin={() => setView("login")}
        />
      )}

      {view === "dashboard" && token && (
        role === "master" ? (
          <MasterDashboard token={token} onLogout={handleLogout} />
        ) : (
          <Dashboard token={token} onLogout={handleLogout} />
        )
      )}
    </ChakraProvider>
  );
};

export default App;
