/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { supabase } from "../lib/supabase";
import {
  getChatsByProfileId,
  createChat,
  deleteChat as deleteChatService,
} from "../services/chatService";
import { upsertProfile } from "../services/profileService";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [supabaseProfile, setSupabaseProfile] = useState(null);
  const [googleProfile, setGoogleProfile] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const [showTutorPicker, setShowTutorPicker] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showNotesHistory, setShowNotesHistory] = useState(false);
  const [notesCountByChat, setNotesCountByChat] = useState({});

  const updateNotesCount = useCallback((chatId, count) => {
    setNotesCountByChat((prev) => ({ ...prev, [chatId]: count }));
  }, []);

  const loadChats = useCallback(async (profileId) => {
    const data = await getChatsByProfileId(profileId);
    setChats(data);
    return data;
  }, []);

  // Supabase Auth listener — handles initial session and all auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        const meta = user.user_metadata;
        const fullName = meta.full_name || meta.name || meta.user_name || user.email;
        setGoogleProfile({
          id: user.id,
          name: fullName,
          email: user.email,
          picture: meta.avatar_url || meta.picture,
          given_name: fullName.split(" ")[0],
        });
        upsertProfile(user)
          .then((sbProfile) => {
            setSupabaseProfile(sbProfile);
            return loadChats(sbProfile.id);
          })
          .catch((err) => console.error("Error al cargar perfil:", err));
      } else {
        setGoogleProfile(null);
        setSupabaseProfile(null);
        setChats([]);
        setActiveChatId(null);
        setShowNotesPanel(false);
        setShowNotesHistory(false);
        setNotesCountByChat({});
      }
    });

    return () => subscription.unsubscribe();
  }, [loadChats]);

  const handleNewChat = useCallback(async (agentId = "js-core") => {
    if (!supabaseProfile) return;
    const chat = await createChat(supabaseProfile.id, agentId);
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
        setShowNotesPanel(false);
        setShowNotesHistory(false);
        setNotesCountByChat((prev) => { const n = { ...prev }; delete n[chatId]; return n; });
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

  const contextValue = useMemo(
    () => ({
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
      showTutorPicker,
      setShowTutorPicker,
      showNotesPanel,
      setShowNotesPanel,
      showNotesHistory,
      setShowNotesHistory,
      notesCountByChat,
      updateNotesCount,
    }),
    [
      supabaseProfile,
      googleProfile,
      chats,
      activeChatId,
      sidebarOpen,
      showTutorPicker,
      showNotesPanel,
      showNotesHistory,
      notesCountByChat,
      loadChats,
      handleNewChat,
      handleDeleteChat,
      updateChatTitleInList,
      refreshChatTimestamp,
      updateNotesCount,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
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
