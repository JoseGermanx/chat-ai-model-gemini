import { supabase } from "../lib/supabase";

export async function upsertProfile(googleProfile) {
  const { id: google_id, email, name, picture } = googleProfile;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { google_id, email, name, picture, updated_at: new Date().toISOString() },
      { onConflict: "google_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProfileByGoogleId(googleId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("google_id", googleId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}
