/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from "react";
import PropTypes from "prop-types";
import {
  getChatsByProfileId,
  createChat,
  deleteChat as deleteChatService,
} from "../services/chatService";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [supabaseProfile, setSupabaseProfile] = useState(null);
  const [googleProfile, setGoogleProfile] = useState(
    () => JSON.parse(localStorage.getItem("profile")) || null
  );
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);

  const loadChats = useCallback(async (profileId) => {
    const data = await getChatsByProfileId(profileId);
    setChats(data);
    return data;
  }, []);

  const handleNewChat = useCallback(async () => {
    if (!supabaseProfile) return;
    const chat = await createChat(supabaseProfile.id);
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    return chat;
  }, [supabaseProfile]);

  const handleDeleteChat = useCallback(
    async (chatId) => {
      await deleteChatService(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
    },
    [activeChatId]
  );

  const updateChatTitleInList = useCallback((chatId, title) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title } : c))
    );
  }, []);

  const refreshChatTimestamp = useCallback((chatId) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, updated_at: new Date().toISOString() } : c
      )
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        supabaseProfile,
        setSupabaseProfile,
        googleProfile,
        setGoogleProfile,
        chats,
        setChats,
        activeChatId,
        setActiveChatId,
        loadChats,
        handleNewChat,
        handleDeleteChat,
        updateChatTitleInList,
        refreshChatTimestamp,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
