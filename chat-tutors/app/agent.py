# ruff: noqa
import asyncio
import os
import re
from pathlib import Path
from typing import AsyncGenerator

from dotenv import load_dotenv
from google.adk.agents import Agent, BaseAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.apps import App
from google.adk.events import Event
from google.adk.models import Gemini
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.genai import types

load_dotenv(Path(__file__).parent.parent / ".env")

# ── Credential bootstrap ───────────────────────────────────────────────────────
# Prefer AI Studio (API key) for local dev; fall back to Vertex AI (GCP) for prod.
if os.getenv("GOOGLE_API_KEY"):
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"
else:
    try:
        import google.auth

        _, project_id = google.auth.default()
        if project_id:
            os.environ.setdefault("GOOGLE_CLOUD_PROJECT", project_id)
    except Exception:
        pass
    os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
    os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

# ── Agent identifiers ─────────────────────────────────────────────────────────

DEFAULT_AGENT_ID = "js-core"

_AGENT_IDS = [
    "js-core",
    "typescript",
    "async-js",
    "react",
    "node-backend",
    "algorithms",
]

# ── System prompts (canonical — single source of truth) ──────────────────────

_SYSTEM_PROMPTS: dict[str, str] = {
    "js-core": (
        "Eres Alex, tutor experto en JavaScript (ES6+). Responde únicamente sobre "
        "JavaScript: sintaxis, closures, prototipos, scope, el DOM, eventos, métodos "
        "de array, módulos ESM y los estándares de ECMAScript. Referencias: "
        "https://tc39.es/, https://developer.mozilla.org/es/docs/Web/JavaScript, "
        "https://lenguajejs.com/javascript/. Usa lenguaje amigable y ejemplos "
        "prácticos. Da una bienvenida breve solo al inicio de un chat nuevo, nunca "
        "en cada mensaje. No respondas temas fuera de JavaScript."
    ),
    "typescript": (
        "Eres Tyler, tutor experto en TypeScript. Responde únicamente sobre "
        "TypeScript: sistema de tipos, interfaces, type aliases, generics, "
        "union/intersection types, type guards, utility types, decorators, tsconfig "
        "y migración desde JavaScript. Referencia principal: "
        "https://www.typescriptlang.org/docs/. Nunca uses 'any' en tus ejemplos si "
        "hay una alternativa tipada. Da una bienvenida breve solo al inicio de un "
        "chat nuevo, nunca en cada mensaje. No respondas temas fuera de TypeScript."
    ),
    "async-js": (
        "Eres Sam, tutor experto en JavaScript asíncrono. Responde únicamente sobre: "
        "Event Loop, microtask/macrotask queue, Promises, async/await, generators, "
        "iteradores, Fetch API, AbortController y Web Workers. Referencia: "
        "https://developer.mozilla.org/es/docs/Web/JavaScript/Guide/Using_promises. "
        "Usa diagramas ASCII para explicar el event loop cuando sea útil. Da una "
        "bienvenida breve solo al inicio de un chat nuevo, nunca en cada mensaje. "
        "No respondas temas fuera de JavaScript asíncrono."
    ),
    "react": (
        "Eres Maya, tutora experta en React. Responde únicamente sobre React: hooks "
        "(useState, useEffect, useRef, useMemo, useCallback, useReducer), Context "
        "API, patrones de componentes, React Router, gestión de estado, rendimiento "
        "(memo, lazy, Suspense) y React 18 features. Referencia: https://react.dev/. "
        "Prefiere hooks funcionales. Da una bienvenida breve solo al inicio de un "
        "chat nuevo, nunca en cada mensaje. No respondas temas fuera de React."
    ),
    "node-backend": (
        "Eres Noel, tutor experto en backend con Node.js. Responde únicamente sobre: "
        "Node.js runtime, módulos CommonJS y ESM, Express.js, middleware, APIs REST, "
        "autenticación JWT/OAuth, bases de datos (SQL y MongoDB), variables de "
        "entorno y despliegue. Referencia: https://nodejs.org/es/docs/. Siempre "
        "incluye manejo de errores y considera la seguridad en tus ejemplos. Da una "
        "bienvenida breve solo al inicio de un chat nuevo, nunca en cada mensaje. "
        "No respondas temas fuera de Node.js y backend."
    ),
    "algorithms": (
        "Eres Vera, tutora experta en algoritmos y estructuras de datos con "
        "JavaScript. Responde únicamente sobre: arrays, linked lists, árboles, "
        "grafos, hash maps, stacks, queues, búsqueda binaria, ordenamiento, "
        "recursión, dynamic programming y análisis de complejidad temporal y espacial "
        "(Big O). Implementa siempre en JavaScript puro. Explica el paso a paso "
        "antes del código. Da una bienvenida breve solo al inicio de un chat nuevo, "
        "nunca en cada mensaje. No respondas temas fuera de algoritmos y estructuras "
        "de datos."
    ),
}

# temperature, top_p, top_k per agent
_MODEL_CONFIGS: dict[str, tuple[float, float, int]] = {
    "js-core": (0.4, 0.1, 16),
    "typescript": (0.3, 0.1, 16),
    "async-js": (0.4, 0.1, 16),
    "react": (0.4, 0.1, 16),
    "node-backend": (0.4, 0.1, 16),
    "algorithms": (0.5, 0.15, 20),
}

# ── Topic-based auto-routing ──────────────────────────────────────────────────

# Keyword patterns (regex) per agent domain.  Used to override agentId routing
# when the user's message clearly belongs to a different specialist's domain.
_TOPIC_PATTERNS: dict[str, list[str]] = {
    "typescript": [
        r"\btypescript\b", r"\btsconfig\b", r"\bgenerics?\b",
        r"\btype\s+alias\b", r"\bdecorator[s]?\b", r"\bunion\s+type[s]?\b",
        r"\bintersection\s+type[s]?\b", r"\butility\s+type[s]?\b",
        r"\btype\s+guard[s]?\b", r"\bstatic\s+typing\b",
        r"\btipado\s+(estático|fuerte)\b",
    ],
    "react": [
        r"\breact\b", r"\bjsx\b", r"\buseState\b", r"\buseEffect\b",
        r"\buseRef\b", r"\buseContext\b", r"\buseReducer\b",
        r"\buseMemo\b", r"\buseCallback\b", r"\bcontext\s+api\b",
        r"\breact\s+router\b", r"\bsuspense\b",
    ],
    "async-js": [
        r"\bpromise[s]?\b", r"\basync[\s/]await\b", r"\basync\s+function\b",
        r"\bevent\s+loop\b", r"\bfetch\s+api\b", r"\bweb\s+worker[s]?\b",
        r"\bmicrotask[s]?\b", r"\bmacrotask[s]?\b", r"\bgenerator\s+function\b",
        r"\babortsignal\b", r"\babortcontroller\b",
    ],
    "node-backend": [
        r"\bnode\.?js\b", r"\bexpress\.?js\b", r"\brest\s+api\b",
        r"\bjwt\b", r"\boauth\b", r"\bmongodb\b", r"\bpostgresql\b",
        r"\bmiddleware\b", r"\bbackend\b", r"\bhttp\s+server\b",
    ],
    "algorithms": [
        r"\balgorithm[os]?\b", r"\bestructura[s]?\s+de\s+dato[s]?\b",
        r"\bdata\s+structure[s]?\b", r"\bbig[- ]?o\b", r"\brecursi[oó]n\b",
        r"\bprogramaci[oó]n\s+din[aá]mica\b", r"\bdynamic\s+programming\b",
        r"\blista\s+enlazada\b", r"\blinked\s+list\b", r"\bbinary\s+search\b",
        r"\border(amiento|nación)\b", r"\bsorting\b",
        r"\bhash\s+map\b", r"\b[aá]rbol\s+(binario|de\s+búsqueda)\b",
    ],
    "js-core": [
        r"\bclosure[s]?\b", r"\bprototype[s]?\b", r"\bscope\b", r"\bhoisting\b",
        r"\bdom\b", r"\bevent\s+listener[s]?\b", r"\barray\s+method[s]?\b",
        r"\besm\b", r"\bjavascript\b",
    ],
}


def _detect_best_agent(message: str, preferred_agent_id: str) -> str:
    """Return the specialist that best matches the message content.

    Only overrides ``preferred_agent_id`` when another specialist scores at
    least one hit AND the preferred specialist scores zero — avoiding spurious
    re-routing on ambiguous or general questions.
    """
    scores: dict[str, int] = {}
    for agent_id, patterns in _TOPIC_PATTERNS.items():
        count = sum(1 for p in patterns if re.search(p, message, re.IGNORECASE))
        if count:
            scores[agent_id] = count

    if not scores:
        return preferred_agent_id

    best = max(scores, key=lambda k: scores[k])
    if best != preferred_agent_id and scores.get(preferred_agent_id, 0) == 0:
        return best

    return preferred_agent_id


_VALIDATOR_PROMPT = (
    "Revisa el siguiente código JavaScript/TypeScript. Si hay un error crítico o "
    "algo importante a corregir, responde con una nota MUY breve (1-2 líneas, sin "
    "introducción). Si el código es correcto, responde exactamente: OK\n\nCódigo:\n{code}"
)

# ── Callbacks ─────────────────────────────────────────────────────────────────


async def inject_history(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> LlmResponse | None:
    """Prepend Supabase chat history into the LLM request before the model call."""
    history: list[dict] = callback_context.state.get("history", [])
    if not history or not llm_request.contents:
        return None

    history_contents = [
        types.Content(
            role=h["role"],
            parts=[types.Part.from_text(text=h["parts"])],
        )
        for h in history
    ]
    current_message = llm_request.contents[-1]
    llm_request.contents[:] = history_contents + [current_message]
    return None


# ── Specialist agents ─────────────────────────────────────────────────────────


def _make_specialist(agent_id: str) -> Agent:
    temp, top_p, top_k = _MODEL_CONFIGS[agent_id]
    return Agent(
        name=agent_id.replace("-", "_"),
        model=Gemini(
            model="gemini-2.5-flash",
            retry_options=types.HttpRetryOptions(attempts=3),
        ),
        instruction=_SYSTEM_PROMPTS[agent_id],
        description=f"Specialist tutor for {agent_id}.",
        generate_content_config=types.GenerateContentConfig(
            temperature=temp,
            top_p=top_p,
            top_k=top_k,
            max_output_tokens=8192,
        ),
        before_model_callback=inject_history,
    )


# ── Validator ─────────────────────────────────────────────────────────────────


async def _validate_code(response_text: str) -> str:
    """Check code blocks for critical errors; append reviewer note if found.

    Non-fatal: returns original text on any failure.
    """
    code_blocks = re.findall(r"```[\s\S]*?```", response_text)[:2]
    if not code_blocks:
        return response_text

    code_to_validate = "\n\n".join(code_blocks)

    try:
        from google import genai

        if os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "True").lower() == "true":
            client = genai.Client(
                vertexai=True,
                project=os.environ.get("GOOGLE_CLOUD_PROJECT"),
                location="global",
            )
        else:
            client = genai.Client()

        result = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=_VALIDATOR_PROMPT.format(code=code_to_validate),
            config=genai.types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=256,
                top_p=0.1,
                top_k=8,
            ),
        )
        note = (result.text or "").strip()
        if note and note.upper() != "OK" and len(note) > 2:
            return f"{response_text}\n\n> **Nota del revisor:** {note}"
    except Exception:
        pass

    return response_text


# ── Orchestrator ──────────────────────────────────────────────────────────────


class TutorOrchestrator(BaseAgent):
    """Routes messages to the right specialist and conditionally validates code."""

    def _get_specialist(self, agent_id: str) -> Agent:
        name = agent_id.replace("-", "_")
        for agent in self.sub_agents:
            if agent.name == name:
                return agent  # type: ignore[return-value]
        return self.sub_agents[0]  # type: ignore[return-value]

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        agent_id: str = ctx.session.state.get("agentId", DEFAULT_AGENT_ID)
        if agent_id not in _SYSTEM_PROMPTS:
            agent_id = DEFAULT_AGENT_ID

        # Auto-route when the message clearly belongs to a different specialist.
        user_message: str = ctx.session.state.get("message", "")
        if user_message:
            agent_id = _detect_best_agent(user_message, agent_id)

        specialist = self._get_specialist(agent_id)

        collected_parts: list[str] = []
        final_event: Event | None = None

        async for event in specialist.run_async(ctx):
            if not event.is_final_response():
                yield event
                continue

            # Buffer the final response for optional validation
            if event.content and event.content.parts:
                collected_parts = [p.text or "" for p in event.content.parts]
            final_event = event

        if final_event is None:
            return

        final_text = "".join(collected_parts)

        # Validate code blocks (non-fatal)
        if re.search(r"```[\s\S]*?```", final_text):
            final_text = await _validate_code(final_text)

        # Yield final event with (possibly annotated) response
        yield Event(
            invocation_id=final_event.invocation_id,
            author=final_event.author,
            content=types.Content(
                role="model",
                parts=[types.Part.from_text(text=final_text)],
            ),
        )


# ── Root agent & App ──────────────────────────────────────────────────────────

root_agent = TutorOrchestrator(
    name="tutor_orchestrator",
    description="Routes to the right programming tutor and validates code.",
    sub_agents=[_make_specialist(aid) for aid in _AGENT_IDS],
)

app = App(
    root_agent=root_agent,
    name="app",
)
