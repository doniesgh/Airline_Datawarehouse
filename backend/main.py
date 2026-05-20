import random
import json
import math
import re
import base64
import time
import os
import io
from datetime import datetime
from typing import Optional, List
import numpy as np
import cv2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI
from deepface import DeepFace
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

import mongo_bridge

load_dotenv()


# ─────────────────────────────────────────────
# APP INIT
# ─────────────────────────────────────────────

app = FastAPI(title="Tunisys API - Face AI")

otp_storage = {}


# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# SMTP CONFIG
# ─────────────────────────────────────────────

SMTP_CONFIG = {
    "server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
    "port": int(os.getenv("SMTP_PORT", "587")),
    "user": os.getenv("SMTP_USER", ""),
    "password": os.getenv("SMTP_PASSWORD", ""),
}


# ─────────────────────────────────────────────
# PYDANTIC MODELS (IMPORTANT -> TOP)
# ─────────────────────────────────────────────

class DescriptorRequest(BaseModel):
    image: str


class VerifyFaceRequest(BaseModel):
    descriptor: List[float]


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


class OTPRequest(BaseModel):
    email: Optional[str] = None


class AuthorizedUser(BaseModel):
    name: str
    role: str = "manager"
    photo: str
    descriptor: List[float]
    active: bool = True


class TravelRequest(BaseModel):
    destination: str = Field(..., min_length=2)
    days: int = Field(..., ge=1, le=60)
    budget: str = Field(..., min_length=2)
    interests: str = Field(..., min_length=3)


class TravelResponse(BaseModel):
    reply: str


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def decode_image(base64_str: str):
    try:
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]

        img_data = base64.b64decode(base64_str)
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return img
    except:
        return None


def normalize(vec):
    vec = np.array(vec, dtype=np.float32)
    norm = np.linalg.norm(vec)
    return vec / norm if norm != 0 else vec


# ─────────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "message": "Airline API running"}


# ─────────────────────────────────────────────
# EMOTION ANALYSIS
# ─────────────────────────────────────────────

@app.post("/tss/auth/analyze-face")
async def analyze_face(payload: DescriptorRequest):
    try:
        img = decode_image(payload.image)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        result = DeepFace.analyze(
            img_path=img,
            actions=["emotion"],
            enforce_detection=False
        )

        return {
            "success": True,
            "emotion": str(result[0]["dominant_emotion"]),
            "emotions": {k: float(v) for k, v in result[0]["emotion"].items()}
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# FACE EMBEDDING
# ─────────────────────────────────────────────

@app.post("/tss/auth/extract-descriptor")
async def extract_descriptor(payload: DescriptorRequest):

    try:
        img = decode_image(payload.image)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")

        embedding = DeepFace.represent(
            img_path=img,
            model_name="Facenet512",
            enforce_detection=False
        )

        return {
            "success": True,
            "descriptor": [float(x) for x in embedding[0]["embedding"]]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# FACE VERIFY
# ─────────────────────────────────────────────

@app.post("/tss/auth/verify-face")
async def verify_face(payload: VerifyFaceRequest):

    try:
        input_vec = normalize(payload.descriptor)

        db = mongo_bridge._get_db()
        users = list(db.Authorized_users.find({"active": True}))

        best_match = None
        best_score = -1

        for user in users:

            stored = user.get("descriptor")
            if not stored:
                continue

            stored_vec = normalize(stored)

            score = float(np.dot(input_vec, stored_vec))

            if score > best_score:
                best_score = score
                best_match = user

        THRESHOLD = 0.65

        if best_match and best_score >= THRESHOLD:
            return {
                "authenticated": True,
                "user": {
                    "id": str(best_match["_id"]),
                    "name": best_match.get("name"),
                    "role": best_match.get("role"),
                    "similarity": best_score
                }
            }

        return {
            "authenticated": False,
            "message": "User not recognized",
            "similarity": best_score
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# # OTP
# ─────────────────────────────────────────────

@app.post("/tss/auth/send-otp")
async def send_otp(req: OTPRequest):

    email = req.email
    otp = str(random.randint(1000, 9999))

    otp_storage[email] = otp

    msg = MIMEMultipart()
    msg["Subject"] = "Tunisys OTP"
    msg["From"] = SMTP_CONFIG["user"]
    msg["To"] = email

    msg.attach(MIMEText(f"Your OTP is {otp}", "plain"))

    try:
        server = smtplib.SMTP(SMTP_CONFIG["server"], SMTP_CONFIG["port"])
        server.starttls()
        server.login(SMTP_CONFIG["user"], SMTP_CONFIG["password"])
        server.send_message(msg)
        server.quit()

        return {"success": True}

    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/tss/auth/verify-otp")
async def verify_otp(req: VerifyOTPRequest):

    stored = otp_storage.get(req.email)

    if stored == req.otp:
        del otp_storage[req.email]
        return {"valid": True}

    return {"valid": False}


# ─────────────────────────────────────────────
# TRAVEL CONCIERGE (OpenRouter)
# ─────────────────────────────────────────────

def build_prompt(req: TravelRequest) -> str:
    return (
        "You are a professional travel planning assistant.\n\n"
        "Create a detailed day-by-day itinerary for:\n"
        f"Destination: {req.destination}\n"
        f"Number of days: {req.days}\n"
        f"Budget: {req.budget}\n"
        f"Interests: {req.interests}\n\n"
        "Include: flight tips, hotel suggestions, food options, and cost estimates."
    )


@app.post("/api/travel-concierge", response_model=TravelResponse)
def travel_concierge(req: TravelRequest) -> TravelResponse:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY is not set.")

    try:
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        response = client.chat.completions.create(
            model="openrouter/free",
            messages=[{"role": "user", "content": build_prompt(req)}],
            extra_body={"reasoning": {"enabled": True}},
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Upstream model request failed.")

    reply = response.choices[0].message.content if response.choices else ""
    if not reply:
        raise HTTPException(status_code=502, detail="Empty response from model.")

    return TravelResponse(reply=reply)