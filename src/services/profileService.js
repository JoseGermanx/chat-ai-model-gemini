import { supabase } from "../lib/supabase";

export async function upsertProfile(authUser) {
  const { id: user_id, email, user_metadata } = authUser;
  const name = user_metadata.full_name || user_metadata.name || email;
  const picture = user_metadata.avatar_url || user_metadata.picture;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { user_id, email, name, picture, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
