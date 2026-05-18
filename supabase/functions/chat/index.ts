import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Agent registry — each agent has its own isolated system prompt and model config
const AGENTS: Record<string, { systemPrompt: string; temperature: number; topP: number; topK: number }> = {
  "js-core": {
    systemPrompt: "Eres Alex, tutor experto en JavaScript (ES6+). Responde únicamente sobre JavaScript: sintaxis, closures, prototipos, scope, el DOM, eventos, métodos de array, módulos ESM y los estándares de ECMAScript. Referencias: https://tc39.es/, https://developer.mozilla.org/es/docs/Web/JavaScript, https://lenguajejs.com/javascript/. Usa lenguaje amigable y ejemplos prácticos. Da una bienvenida breve solo al inicio de un chat nuevo, nunca en cada mensaje. No respondas temas fuera de JavaScript.",
    temperature: 0.4, topP: 0.1, topK: 16,
  },
  "typescript": {
    systemPrompt: "Eres Tyler, tutor experto en TypeScript. Responde únicamente sobre TypeScript: sistema de tipos, interfaces, type aliases, generics, union/intersection types, type guards, utility types, decorators, tsconfig y migración desde JavaScript. Referencia principal: https://www.typescriptlang.org/docs/. Nunca uses 'any' en tus ejemplos si hay una alternativa tipada. Da una bienvenida breve solo al inicio de un chat nuevo, nunca en cada mensaje. No respondas temas fuera de TypeScript.",
    temperature: 0.3, topP: 0.1, topK: 16,
  },
  "async-js": {
    systemPrompt: "Eres Sam, tutor experto en JavaScript asíncrono. Responde únicamente sobre: Event Loop, microtask/macrotask queue, Promises, async/await, generators, iteradores, Fetch API, AbortController y Web Workers. Referencia: https://developer.mozilla.org/es/docs/Web/JavaScript/Guide/Using_promises. Usa diagramas ASCII para explicar el event loop cuando sea útil. Da una bienvenida breve solo al inicio de un chat nuevo, nunca en cada mensaje. No respondas temas fuera de JavaScript asíncrono.",
    temperature: 0.4, topP: 0.1, topK: 16,
  },
  "react": {
    systemPrompt: "Eres Maya, tutora experta en React. Responde únicamente sobre React: hooks (useState, useEffect, useRef, useMemo, useCallback, useReducer), Context API, patrones de componentes, React Router, gestión de estado, rendimiento (memo, lazy, Suspense) y React 18 features. Referencia: https://react.dev/. Prefiere hooks funcionales. Da una bienvenida breve solo al inicio de un chat nuevo, nunca en cada mensaje. No respondas temas fuera de React.",
    temperature: 0.4, topP: 0.1, topK: 16,
  },
  "node-backend": {
    systemPrompt: "Eres Noel, tutor experto en backend con Node.js. Responde únicamente sobre: Node.js runtime, módulos CommonJS y ESM, Express.js, middleware, APIs REST, autenticación JWT/OAuth, bases de datos (SQL y MongoDB), variables de entorno y despliegue. Referencia: https://nodejs.org/es/docs/. Siempre incluye manejo de errores y considera la seguridad en tus ejemplos. Da una bienvenida breve solo al inicio de un chat nuevo, nunca en cada mensaje. No respondas temas fuera de Node.js y backend.",
    temperature: 0.4, topP: 0.1, topK: 16,
  },
  "algorithms": {
    systemPrompt: "Eres Vera, tutora experta en algoritmos y estructuras de datos con JavaScript. Responde únicamente sobre: arrays, linked lists, árboles, grafos, hash maps, stacks, queues, búsqueda binaria, ordenamiento, recursión, dynamic programming y análisis de complejidad temporal y espacial (Big O). Implementa siempre en JavaScript puro. Explica el paso a paso antes del código. Da una bienvenida breve solo al inicio de un chat nuevo, nunca en cada mensaje. No respondas temas fuera de algoritmos y estructuras de datos.",
    temperature: 0.5, topP: 0.15, topK: 20,
  },
};

const DEFAULT_AGENT_ID = "js-core";

// Orchestrator prompt — routes queries to the best specialist agent
const ROUTER_PROMPT = `Eres un orquestador de tutores de programación. Analiza la siguiente pregunta y determina qué tutor especializado es más apropiado. Responde ÚNICAMENTE con el ID del agente, sin texto adicional ni explicaciones.

Agentes disponibles:
- js-core: JavaScript ES6+, closures, prototipos, DOM, array methods, scope
- typescript: TypeScript, tipos, generics, interfaces, type guards, tsconfig
- async-js: Promises, async/await, Event Loop, microtasks, Fetch, Workers
- react: React, hooks, componentes, Context, React Router, rendimiento
- node-backend: Node.js, Express, APIs REST, autenticación, bases de datos
- algorithms: Estructuras de datos, algoritmos, Big O, recursión, DP

Pregunta del estudiante: "`;

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

    const { message, history, mode, agentId } = await req.json();
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);

    // Mode: generate a short title for the chat
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

    // Mode: orchestrator routes the query to the best agent
    if (mode === "route") {
      const routerModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const routerResult = await routerModel.generateContent(
        ROUTER_PROMPT + message + `"\n\nResponde solo con el ID:`
      );
      const recommendedId = routerResult.response.text().trim().toLowerCase();
      const resolvedId = AGENTS[recommendedId] ? recommendedId : DEFAULT_AGENT_ID;
      return new Response(
        JSON.stringify({ agentId: resolvedId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default mode: run the specialist agent
    const resolvedAgentId = (agentId && AGENTS[agentId]) ? agentId : DEFAULT_AGENT_ID;
    const agent = AGENTS[resolvedAgentId];

    const geminiHistory = (history as HistoryEntry[] || []).map((entry) => ({
      role: entry.role,
      parts: [{ text: entry.parts }],
    }));

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: agent.topK === 20 ? 8192 : 8192,
        temperature: agent.temperature,
        topP: agent.topP,
        topK: agent.topK,
      },
    });

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: agent.systemPrompt }] },
        { role: "model", parts: [{ text: "Entendido. Estoy listo para ayudarte en mi área de especialización." }] },
        ...geminiHistory,
      ],
    });

    const specialistResult = await chat.sendMessage(message);
    const specialistResponse = specialistResult.response.text();

    // Sequential chain: if response contains code blocks, run a lightweight validator agent
    const hasCode = /```[\s\S]*?```/.test(specialistResponse);
    if (hasCode) {
      try {
        const codeBlocks = specialistResponse.match(/```[\s\S]*?```/g) || [];
        const codeToValidate = codeBlocks.slice(0, 2).join("\n\n");

        const validatorModel = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: { maxOutputTokens: 256, temperature: 0.1, topP: 0.1, topK: 8 },
        });

        const validatorResult = await validatorModel.generateContent(
          `Revisa el siguiente código JavaScript/TypeScript. Si hay un error crítico o algo importante a corregir, responde con una nota MUY breve (1-2 líneas, sin introducción). Si el código es correcto, responde exactamente: OK\n\nCódigo:\n${codeToValidate}`
        );

        const validatorNote = validatorResult.response.text().trim();
        if (validatorNote !== "OK" && validatorNote.length > 2) {
          const finalResponse = `${specialistResponse}\n\n> **Nota del revisor:** ${validatorNote}`;
          return new Response(
            JSON.stringify({ response: finalResponse, agentId: resolvedAgentId }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (validatorErr) {
        // Validator failure is non-fatal — return specialist response as-is
        console.warn("Validator agent failed, returning specialist response:", validatorErr);
      }
    }

    return new Response(
      JSON.stringify({ response: specialistResponse, agentId: resolvedAgentId }),
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
