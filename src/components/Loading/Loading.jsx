// import { useEffect, useState } from "react";
// import ContentLoader from "react-content-loader";
import "./Loading.style.css";

// eslint-disable-next-line no-unused-vars
const Loading = (props) => {
  // const [theme, setTheme] = useState("light");

  // useEffect(() => {
  //   const storedTheme =
  //     localStorage.getItem("preferredDarkMode") === "true" ? "dark" : "light";
  //   setTheme(storedTheme);
  // }, []);

  // const backgroundColor = theme === "dark" ? "#1e293b " : "#CCFAF9";
  // const foregroundColor = theme === "dark" ? "#155e75  " : "#2C3E50";
  return (
    <>
      <div className="loader"></div>
      {/* <div className="">
        <ContentLoader
          viewBox="30 0 600 500"
          backgroundColor={backgroundColor} // Light gray background
          foregroundColor={foregroundColor} // Custom foreground (loading animation) color
          // eslint-disable-next-line no-undef
          {...props}
        >
          <circle cx="75" cy="20" r="8" width="100" height="10" />
          <rect x="90" y="12" rx="5" ry="5" width="500" height="10" />
          <rect x="90" y="29" rx="5" ry="5" width="480" height="10" />
          <rect x="90" y="46" rx="5" ry="5" width="450" height="10" />
          <rect x="90" y="63" rx="5" ry="5" width="420" height="10" />
          <rect x="90" y="80" rx="5" ry="5" width="390" height="10" />
        </ContentLoader>
      </div> */}
    
    </>
  );
};

export default Loading;
