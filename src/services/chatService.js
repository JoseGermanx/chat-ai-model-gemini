import { supabase } from "../lib/supabase";

export async function getChatsByProfileId(profileId) {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createChat(profileId, agentId = "js-core") {
  const { data, error } = await supabase
    .from("chats")
    .insert({ profile_id: profileId, title: "Nuevo chat", history: [], agent_id: agentId })
    .select()
    .single();

  if (!error) return data;

  // Column agent_id doesn't exist yet (migration pending) — retry without it
  if (error.message?.includes("agent_id")) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("chats")
      .insert({ profile_id: profileId, title: "Nuevo chat", history: [] })
      .select()
      .single();
    if (fallbackError) throw fallbackError;
    return { ...fallback, agent_id: agentId };
  }

  throw error;
}

export async function getChatById(chatId) {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateChatHistory(chatId, history) {
  const { error } = await supabase
    .from("chats")
    .update({ history, updated_at: new Date().toISOString() })
    .eq("id", chatId);

  if (error) throw error;
}

export async function updateChatTitle(chatId, title) {
  const { error } = await supabase
    .from("chats")
    .update({ title })
    .eq("id", chatId);

  if (error) throw error;
}

export async function deleteChat(chatId) {
  const { error } = await supabase.from("chats").delete().eq("id", chatId);
  if (error) throw error;
}
