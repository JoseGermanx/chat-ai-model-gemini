import { supabase } from "../lib/supabase";

export async function upsertProfile(authUser) {
  const { id: user_id, email, user_metadata } = authUser;
  const name = user_metadata.full_name || user_metadata.name || email;
  const picture = user_metadata.avatar_url || user_metadata.picture;
  const google_id = user_metadata.provider_id || user_metadata.sub;

  // Buscar perfil existente por google_id (con o sin user_id asignado)
  // para vincularlo al usuario de Supabase Auth y preservar chats previos
  if (google_id) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("google_id", google_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from("profiles")
        .update({ user_id, name, picture, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  // Sin perfil previo: crear uno nuevo
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { user_id, email, name, picture, google_id, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
