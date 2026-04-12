import "./NavBar.style.css";
import ia from "./../../assets/star-1-svgrepo-com.svg";
import google from "./../../assets/google-icon-logo-svgrepo-com.svg";
import { googleLogout, useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useEffect, useState } from "react";
import Switch from "../Switch/Switch";

const NavBar = () => {
  const [user, setUser] = useState([]);
  const [profile, setProfile] = useState(JSON.parse(localStorage.getItem("profile")) || []);
  const [display, setDisplay] = useState("none");

  const showDropdown = () => {
    setDisplay(prev => prev === "none" ? "flex" : "none");
  };

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => setUser(codeResponse),
    onError: (error) => console.log("Login Failed:", error),
  });

  useEffect(() => {
    if (user && user.access_token) {
      axios
        .get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`, {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            Accept: "application/json",
          },
        })
        .then((res) => {
          setProfile(res.data);
          localStorage.setItem("profile", JSON.stringify(res.data));
          window.location.reload();
        })
        .catch((err) => console.log(err));
    }
  }, [user]);

  const logOut = () => {
    googleLogout();
    setProfile(null);
    localStorage.removeItem("profile");
    window.location.reload();
  };

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".profile")) {
        setDisplay("none");
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-brand-icon">
          <img src={ia} alt="JS AI" />
        </div>
        <span className="navbar-brand-name">JS Assistant</span>
      </div>

      <div className="navbar-actions">
        <Switch />
        <div className="login-area">
          {profile && profile.length !== 0 ? (
            <div className="profile" onClick={showDropdown}>
              <img className="img-profile" src={profile.picture} alt="usuario" />
              <div className="dropdown" style={{ display }}>
                <div className="dropdown-content">
                  <div className="dropdown-user">
                    <img src={profile.picture} width={36} height={36} alt="" className="dropdown-avatar" />
                    <div>
                      <p className="dropdown-name">{profile.name}</p>
                      <p className="dropdown-email">{profile.email}</p>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  <a href="#" className="dropdown-item" title="En desarrollo">Tus chats</a>
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
