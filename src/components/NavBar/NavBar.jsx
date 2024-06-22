import "./NavBar.style.css";
import ia from"./../../assets/star-1-svgrepo-com.svg";
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
    if (display === "none") {
      setDisplay("block");
    } else {
      setDisplay("none");
    }
  }

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => setUser(codeResponse),
    onError: (error) => console.log("Login Failed:", error),
  });

  useEffect(() => {
    if (user) {
      axios
        .get(
          `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
              Accept: "application/json",
            },
          }
        )
        .then((res) => {
          setProfile(res.data);
          localStorage.setItem("profile", JSON.stringify(res.data));
          window.location.reload()
        })
        .catch((err) => console.log(err));
    }
  }, [user]);

  // log out function to log the user out of google and set the profile array to null
  const logOut = () => {
    googleLogout();
    setProfile(null);
    localStorage.removeItem("profile");
    window.location.reload()
  };

  useEffect(() => {
    document.addEventListener("click", (e) => {
      if (e.target.className !== "img-profile" && e.target.className !== "dropdown-content" && e.target.className !== "profile" && e.target.className !== "dropdown" ) {
        setDisplay("none");
      }
    });
    }, []);



  return (
    <div className="navbar">
      <div className="logo">
        <img src={ia} width="50"></img>
      </div>
      <Switch />
      <div className="login-button">
        {" "}
        {profile && profile.length !== 0 ? (
          <div className="profile"
            onClick={showDropdown}
          >
            <img
              className="img-profile"
              src={profile.picture}
              alt="user image"
            />
            
            {/* crear html para un menu dropdown con las opciones de perfil */}
            <div className="dropdown"  style={{display: display}}>
              <div className="dropdown-content">
                <a href="#" title="En desarrollo">Tus chats</a>
                <p>{profile.name}</p>
                <button className="btn-login-logout" onClick={logOut}>Cerrar sesión</button>
              </div>
            </div>
          </div> 
        ) : (
          <button className="btn-login-logout" onClick={login}><span>Ingresar con Google </span><img src={google} width={20}/></button>
        )}
      </div>
    </div>
  );
};

export default NavBar;
