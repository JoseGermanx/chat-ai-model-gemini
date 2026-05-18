# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0

import asyncio
import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from pydantic import BaseModel
from supabase import create_client

load_dotenv()

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
APP_NAME = "app"

allow_origins_raw = os.getenv("ALLOW_ORIGINS", "")
allow_origins = allow_origins_raw.split(",") if allow_origins_raw else None

app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    allow_origins=allow_origins,
)
app.title = "chat-tutors"
app.description = "ADK-powered multi-tutor programming assistant"


# ── Request / response models ─────────────────────────────────────────────────


class HistoryEntry(BaseModel):
    id: str
    role: str
    parts: str


class ChatRequest(BaseModel):
    message: str
    agentId: str = "js-core"
    history: list[HistoryEntry] = []
    generateTitle: bool = False


class ChatResponse(BaseModel):
    response: str
    agentId: str
    title: str | None = None


# ── Auth helper ───────────────────────────────────────────────────────────────


def _validate_supabase_token(token: str) -> str:
    """Validate Supabase Bearer token; return user_id or raise 401."""
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    try:
        result = client.auth.get_user(token)
        if not result or not result.user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        return result.user.id
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Unauthorized") from exc


# ── Title generation helper ───────────────────────────────────────────────────


async def _generate_title(message: str) -> str | None:
    """Generate a short chat title from the first user message."""
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
            contents=(
                f"Resume en máximo 5 palabras el tema de esta pregunta, solo el "
                f'título sin comillas ni signos de puntuación al final: "{message}"'
            ),
            config=genai.types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=32,
            ),
        )
        return (result.text or "").strip() or None
    except Exception:
        return None


# ── Custom /chat endpoint ─────────────────────────────────────────────────────


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    body: ChatRequest,
    authorization: str = Header(None),
) -> ChatResponse:
    """Main chat endpoint — validates Supabase JWT, routes to the right tutor."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.removeprefix("Bearer ")
    user_id = await asyncio.to_thread(_validate_supabase_token, token)

    # Import here to avoid circular import (agent.py configures env vars first)
    from app.agent import root_agent

    session_id = str(uuid.uuid4())
    session_service = InMemorySessionService()

    await session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id,
        state={
            "agentId": body.agentId,
            "history": [h.model_dump() for h in body.history],
        },
    )

    runner = Runner(
        agent=root_agent,
        app_name=APP_NAME,
        session_service=session_service,
    )

    response_text = ""
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=types.Content(
            role="user",
            parts=[types.Part.from_text(text=body.message)],
        ),
    ):
        if event.is_final_response() and event.content and event.content.parts:
            response_text = "".join(p.text or "" for p in event.content.parts)

    if not response_text:
        raise HTTPException(status_code=500, detail="No response from agent")

    title: str | None = None
    if body.generateTitle:
        title = await _generate_title(body.message)

    return ChatResponse(response=response_text, agentId=body.agentId, title=title)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
