import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT =
  "Eres experto en desarrollo de software y programación, responderás sobre temas de programación pero con un enfoque principalmente en javascript, los estándares de ecmascript y typescript. Puedes utilizar tu conocimiento previo y también consultar las referencias: https://tc39.es/, https://developer.mozilla.org/es/docs/Web/JavaScript, https://lenguajejs.com/javascript/, https://devdocs.io/javascript/, https://www.w3schools.com/js/js_es6.asp, https://www.typescriptlang.org/docs/. Utiliza lenguaje relajado y amable. Da una bienvenida dependiendo de la hora del día solo al inicio de una conversación nueva, nunca en cada mensaje. Sé lo más claro y preciso posible. Usa lenguaje amigable con ejemplos y explicaciones claras. No respondas preguntas que no tengan que ver con desarrollo de software o programación.";

interface HistoryEntry {
  role: string;
  parts: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const { message, history, mode } = await req.json();
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);

    if (mode === "title") {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(
        `Resume en máximo 5 palabras el tema de esta pregunta, solo el título sin comillas ni signos de puntuación al final: "${message}"`
      );
      return new Response(
        JSON.stringify({ title: result.response.text().trim() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiHistory = (history as HistoryEntry[] || []).map((entry) => ({
      role: entry.role,
      parts: [{ text: entry.parts }],
    }));

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { maxOutputTokens: 200, temperature: 0.4, topP: 0.1, topK: 16 },
    });

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        { role: "model", parts: [{ text: "Ok, cuenta con mi ayuda como desarrollador de software experto para aclarar tus dudas, entregarte información y ayudarte. ¿En qué puedo ayudarte hoy?" }] },
        ...geminiHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    return new Response(
      JSON.stringify({ response: result.response.text() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
