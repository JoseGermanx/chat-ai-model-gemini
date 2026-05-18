import { supabase } from "../lib/supabase";

export async function getNotesByChatId(chatId) {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createNote(chatId, profileId, content) {
  const { data, error } = await supabase
    .from("notes")
    .insert({ chat_id: chatId, profile_id: profileId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote(noteId, content) {
  const { data, error } = await supabase
    .from("notes")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNote(noteId) {
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId);
  if (error) throw error;
}
