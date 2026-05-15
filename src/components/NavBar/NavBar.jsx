import "./NavBar.style.css";
import google from "./../../assets/google-icon-logo-svgrepo-com.svg";
import { useState, useEffect } from "react";
import Switch from "../Switch/Switch";
import { useApp } from "../../context/AppContext";
import { supabase } from "../../lib/supabase";

const GitHubIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

const NavBar = () => {
  const {
    googleProfile,
    setActiveChatId,
    sidebarOpen,
    setSidebarOpen,
  } = useApp();

  const [display, setDisplay] = useState("none");

  const showDropdown = () => {
    setDisplay((prev) => (prev === "none" ? "flex" : "none"));
  };

  const loginWithGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const loginWithGitHub = () => {
    supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
  };

  const logOut = async () => {
    await supabase.auth.signOut();
    setActiveChatId(null);
    setDisplay("none");
  };

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".profile")) setDisplay("none");
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {googleProfile && (
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
            title={sidebarOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
          >
            <span className={`toggle-icon ${sidebarOpen ? "open" : ""}`}>&#9776;</span>
          </button>
        )}
      </div>

      <div className="navbar-actions">
        <Switch />
        <div className="login-area">
          {googleProfile ? (
            <div className="profile" onClick={showDropdown}>
              <img className="img-profile" src={googleProfile.picture} alt="usuario" />
              <div className="dropdown" style={{ display }}>
                <div className="dropdown-content">
                  <div className="dropdown-user">
                    <img src={googleProfile.picture} width={36} height={36} alt="" className="dropdown-avatar" />
                    <div>
                      <p className="dropdown-name">{googleProfile.name}</p>
                      <p className="dropdown-email">{googleProfile.email}</p>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  <button className="dropdown-logout" onClick={logOut}>Cerrar sesión</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="login-buttons">
              <button className="btn-google-login" onClick={loginWithGoogle}>
                <img src={google} width={15} height={15} alt="Google" />
                <span>Google</span>
              </button>
              <button className="btn-github-login" onClick={loginWithGitHub}>
                <GitHubIcon />
                <span>GitHub</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
