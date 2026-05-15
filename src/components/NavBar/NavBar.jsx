import "./NavBar.style.css";
import google from "./../../assets/google-icon-logo-svgrepo-com.svg";
import { googleLogout, useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useEffect, useState } from "react";
import Switch from "../Switch/Switch";
import { useApp } from "../../context/AppContext";
import { upsertProfile } from "../../services/profileService";

const NavBar = () => {
  const {
    googleProfile,
    setGoogleProfile,
    setSupabaseProfile,
    loadChats,
    setActiveChatId,
    sidebarOpen,
    setSidebarOpen,
  } = useApp();

  const [tokenInfo, setTokenInfo] = useState(null);
  const [display, setDisplay] = useState("none");

  const showDropdown = () => {
    setDisplay((prev) => (prev === "none" ? "flex" : "none"));
  };

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => setTokenInfo(codeResponse),
    onError: (error) => console.log("Login Failed:", error),
  });

  useEffect(() => {
    if (!tokenInfo?.access_token) return;
    axios
      .get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenInfo.access_token}`, {
        headers: { Authorization: `Bearer ${tokenInfo.access_token}`, Accept: "application/json" },
      })
      .then(async (res) => {
        const gProfile = res.data;
        localStorage.setItem("profile", JSON.stringify(gProfile));
        setGoogleProfile(gProfile);

        const sbProfile = await upsertProfile(gProfile);
        setSupabaseProfile(sbProfile);

        await loadChats(sbProfile.id);
      })
      .catch((err) => console.log(err));
  }, [tokenInfo, setGoogleProfile, setSupabaseProfile, loadChats]);

  // On mount: restore supabase profile if google profile already in localStorage
  useEffect(() => {
    if (!googleProfile) return;
    upsertProfile(googleProfile).then(async (sbProfile) => {
      setSupabaseProfile(sbProfile);
      await loadChats(sbProfile.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logOut = () => {
    googleLogout();
    setGoogleProfile(null);
    setSupabaseProfile(null);
    setActiveChatId(null);
    localStorage.removeItem("profile");
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
