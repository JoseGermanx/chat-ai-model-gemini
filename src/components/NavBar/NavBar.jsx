import "./NavBar.style.css";
import google from "./../../assets/google-icon-logo-svgrepo-com.svg";
import { useState, useEffect } from "react";
import Switch from "../Switch/Switch";
import { useApp } from "../../context/AppContext";
import { supabase } from "../../lib/supabase";

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

  const login = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
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
            <button className="btn-google-login" onClick={login}>
              <img src={google} width={15} height={15} alt="Google" />
              <span>Ingresar</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
