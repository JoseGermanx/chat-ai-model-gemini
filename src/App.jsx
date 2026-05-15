import Chat from "./components/Chat/Chat";
import NavBar from "./components/NavBar/NavBar";
import Sidebar from "./components/Sidebar/Sidebar";
import { AppProvider } from "./context/AppContext";
import { useApp } from "./context/AppContext";
import "./App.css";

function AppLayout() {
  const { googleProfile, sidebarOpen } = useApp();

  return (
    <div className="app-shell">
      {googleProfile && <Sidebar />}
      <div className={`app-main ${googleProfile && sidebarOpen ? "" : "sidebar-hidden"}`}>
        <NavBar />
        <Chat />
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}

export default App;
