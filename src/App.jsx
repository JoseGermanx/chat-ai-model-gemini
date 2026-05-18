import Chat from "./components/Chat/Chat";
import NavBar from "./components/NavBar/NavBar";
import Sidebar from "./components/Sidebar/Sidebar";
import TutorPicker from "./components/TutorPicker/TutorPicker";
import { AppProvider } from "./context/AppContext";
import { useApp } from "./context/AppContext";
import "./App.css";

function AppLayout() {
  const { googleProfile, sidebarOpen, setSidebarOpen, showTutorPicker } = useApp();

  return (
    <div className="app-shell">
      {googleProfile && <Sidebar />}
      {googleProfile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`app-main ${googleProfile && sidebarOpen ? "" : "sidebar-hidden"}`}>
        <NavBar />
        <Chat />
      </div>
      {showTutorPicker && <TutorPicker />}
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
