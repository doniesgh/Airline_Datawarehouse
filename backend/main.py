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
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI
from deepface import DeepFace
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

import mongo_bridge
import nlp_service
import loyalty_service
import auth_service
from auth_service import (
    get_current_user, require_manager, require_admin,
    hash_password, verify_password, create_session, revoke_session,
    find_user_by_email, public_user, ROLES,
)
from bson import ObjectId

load_dotenv()

try:
    auth_service.ensure_default_admin()
except Exception as e:
    print(f"[auth] could not seed default admin: {e}")


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


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    role: str = "passenger"
    photo: Optional[str] = None
    descriptor: Optional[List[float]] = None


class LoginPasswordRequest(BaseModel):
    email: str
    password: str


class UpdateRoleRequest(BaseModel):
    role: str


class TravelRequest(BaseModel):
    destination: str = Field(..., min_length=2)
    days: int = Field(..., ge=1, le=60)
    budget: str = Field(..., min_length=2)
    interests: str = Field(..., min_length=3)


class TravelResponse(BaseModel):
    reply: str


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1)
    travel_type: Optional[str] = None


class AnalyzeBatchRequest(BaseModel):
    texts: List[str]
    travel_type: Optional[str] = None


class LoyaltyScoreRequest(BaseModel):
    LoyaltyCard:        Optional[str]   = None
    EnrollmentType:     Optional[str]   = None
    MaritalStatus:      Optional[str]   = None
    Education:          Optional[str]   = None
    Gender:             Optional[str]   = None
    EnrollmentYear:     Optional[int]   = None
    Salary:             Optional[float] = None
    CLV:                Optional[float] = None
    TotalFlights:       Optional[float] = 0
    TotalDistance:      Optional[float] = 0
    PointsAcc:          Optional[float] = 0
    PointsRed:          Optional[float] = 0
    DollarCost:         Optional[float] = 0
    ActiveMonths:       Optional[float] = 0
    RedemptionRate:     Optional[float] = 0
    AvgFlightsPerMonth: Optional[float] = 0
    RecencyMonths:      Optional[float] = 0


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
            token = create_session(best_match["_id"], best_match.get("role", "passenger"))
            return {
                "authenticated": True,
                "token": token,
                "user": {
                    **public_user(best_match),
                    "similarity": best_score,
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
            extra_body={"reasoning": {"enabled": False}},
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Upstream model request failed.")

    reply = response.choices[0].message.content if response.choices else ""
    if not reply:
        raise HTTPException(status_code=502, detail="Empty response from model.")

    return TravelResponse(reply=reply)


# ─────────────────────────────────────────────
# NLP — Voice of Customer (tweet & review sentiment)
# ─────────────────────────────────────────────

NLP_COLLECTION = "nlp_feedback"
NLP_ACTIONS_COLLECTION = "nlp_actions"


def _nlp_collection():
    return mongo_bridge._get_db()[NLP_COLLECTION]


def _nlp_actions_collection():
    return mongo_bridge._get_db()[NLP_ACTIONS_COLLECTION]


@app.get("/tss/nlp/health")
def nlp_health():
    return {"ready": nlp_service.is_ready()}


@app.post("/tss/nlp/analyze")
def nlp_analyze(payload: AnalyzeRequest):
    try:
        return nlp_service.analyze(payload.text, payload.travel_type)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tss/nlp/submit-feedback")
def nlp_submit_feedback(payload: AnalyzeRequest,
                       user: dict = Depends(get_current_user)):
    """Authenticated passenger feedback: run analysis AND persist into
    nlp_feedback so admins/managers see it in the live stream."""
    try:
        result = nlp_service.analyze(payload.text, payload.travel_type)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    overall = result.get("overall_sentiment")
    pred = overall if overall in ("positive", "negative", "neutral") else result.get("model_sentiment")
    av = result.get("aspect_verdict", {}) or {}
    doc = {
        "source":             "live_feedback",
        "airline":            "SkyVoyage",
        "user_id":            str(user["_id"]),
        "user_name":          user.get("name"),
        "user_email":         user.get("email"),
        "date":               datetime.utcnow(),
        "text":               payload.text,
        "pred_sentiment":     pred,
        "pred_confidence":    float(result.get("confidence", 0) or 0),
        "complaint_category": result.get("complaint_category"),
        "emotion":            result.get("emotion"),
        "churn_signal":       bool(result.get("churn_signal")),
        "is_mixed":           bool(result.get("is_mixed")),
        "overall_sentiment":  overall,
        "recommendations":    result.get("recommendations", []),
    }
    for k in ("food", "delays", "staff", "seat_comfort", "baggage", "check_in", "wifi"):
        doc[f"aspect_{k}"] = k in av

    try:
        _nlp_collection().insert_one(doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not persist feedback: {e}")

    return {"analysis": result, "persisted": True}


@app.post("/tss/nlp/analyze-batch")
def nlp_analyze_batch(payload: AnalyzeBatchRequest):
    try:
        return {
            "results": [
                nlp_service.analyze(t, payload.travel_type)
                for t in payload.texts if t and t.strip()
            ]
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _doc_to_feed_item(d: dict) -> dict:
    return {
        "id":                str(d.get("_id", "")),
        "source":            d.get("source"),
        "is_live":           d.get("source") == "live_feedback",
        "airline":           d.get("airline"),
        "user_id":           d.get("user_id"),
        "user_name":         d.get("user_name"),
        "user_email":        d.get("user_email"),
        "date":              str(d.get("date")) if d.get("date") else None,
        "text":              d.get("text"),
        "pred_sentiment":    d.get("pred_sentiment"),
        "pred_confidence":   d.get("pred_confidence"),
        "complaint_category":d.get("complaint_category"),
        "emotion":           d.get("emotion"),
        "churn_signal":      bool(d.get("churn_signal")),
        "aspects": {
            k.replace("aspect_", ""): bool(v)
            for k, v in d.items() if k.startswith("aspect_")
        },
    }


@app.get("/tss/nlp/feed")
def nlp_feed(
    limit: int = 50,
    sentiment: Optional[str] = None,
    airline: Optional[str] = None,
    churn_only: bool = False,
    live_only: bool = False,
):
    try:
        col = _nlp_collection()
        query: dict = {}
        if sentiment in ("positive", "negative", "neutral"):
            query["pred_sentiment"] = sentiment
        if airline:
            query["airline"] = airline
        if churn_only:
            query["churn_signal"] = True
        if live_only:
            query["source"] = "live_feedback"
        cursor = col.find(query).sort("_id", -1).limit(max(1, min(limit, 200)))
        return {"items": [_doc_to_feed_item(d) for d in cursor]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tss/nlp/stats")
def nlp_stats(airline: Optional[str] = None):
    try:
        col = _nlp_collection()
        match: dict = {}
        if airline:
            match["airline"] = airline

        total = col.count_documents(match)
        if total == 0:
            return {
                "total": 0, "sentiment": {}, "complaints": [],
                "aspects": [], "churn_rate": 0.0,
                "satisfaction_pct": 0.0, "dissatisfaction_pct": 0.0,
            }

        sentiment = {
            s: col.count_documents({**match, "pred_sentiment": s})
            for s in ("positive", "negative", "neutral")
        }
        churn = col.count_documents({**match, "churn_signal": True})

        complaint_pipeline = [
            {"$match": {**match, "pred_sentiment": "negative"}},
            {"$group": {"_id": "$complaint_category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}, {"$limit": 8},
        ]
        complaints = [
            {"category": r["_id"] or "other", "count": r["count"]}
            for r in col.aggregate(complaint_pipeline)
        ]

        aspect_keys = ["food", "delays", "staff", "seat_comfort",
                       "baggage", "check_in", "wifi"]
        aspects = []
        for a in aspect_keys:
            key = f"aspect_{a}"
            count = col.count_documents({**match, key: True})
            if count == 0:
                aspects.append({"aspect": a, "count": 0,
                                "positive_pct": 0.0, "negative_pct": 0.0, "neutral_pct": 0.0})
                continue
            pos = col.count_documents({**match, key: True, "pred_sentiment": "positive"})
            neg = col.count_documents({**match, key: True, "pred_sentiment": "negative"})
            neu = col.count_documents({**match, key: True, "pred_sentiment": "neutral"})
            aspects.append({
                "aspect":       a,
                "count":        count,
                "positive_pct": round(pos * 100 / count, 1),
                "negative_pct": round(neg * 100 / count, 1),
                "neutral_pct":  round(neu * 100 / count, 1),
            })
        aspects.sort(key=lambda x: x["count"], reverse=True)

        return {
            "total":               total,
            "sentiment":           sentiment,
            "satisfaction_pct":    round(sentiment["positive"] * 100 / total, 1),
            "dissatisfaction_pct": round(sentiment["negative"] * 100 / total, 1),
            "churn_rate":          round(churn * 100 / total, 1),
            "complaints":          complaints,
            "aspects":             aspects,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tss/nlp/dissatisfied-customers")
def nlp_dissatisfied(min_tweets: int = 3, limit: int = 20):
    try:
        col = _nlp_collection()
        pipeline = [
            {"$match": {"user_id": {"$ne": None}}},
            {"$group": {
                "_id":            "$user_id",
                "total":          {"$sum": 1},
                "neg":            {"$sum": {"$cond": [{"$eq": ["$pred_sentiment", "negative"]}, 1, 0]}},
                "churn":          {"$sum": {"$cond": ["$churn_signal", 1, 0]}},
                "last_text":      {"$last": "$text"},
                "last_airline":   {"$last": "$airline"},
                "last_complaint": {"$last": "$complaint_category"},
            }},
            {"$match": {"total": {"$gte": max(1, min_tweets)}}},
            {"$addFields": {"neg_rate": {"$divide": ["$neg", "$total"]}}},
            {"$sort":  {"neg_rate": -1, "total": -1}},
            {"$limit": max(1, min(limit, 100))},
        ]
        out = []
        for r in col.aggregate(pipeline):
            sentiment = "negative" if r["neg_rate"] >= 0.5 else "neutral"
            aspects_negative: set = set()
            recos = nlp_service.recommend_actions(
                sentiment, aspects_negative, bool(r["churn"]),
            ) if nlp_service.is_ready() else []
            out.append({
                "user_id":         r["_id"],
                "total":           r["total"],
                "neg_rate":        round(r["neg_rate"], 3),
                "churn_signals":   r["churn"],
                "last_text":       r.get("last_text"),
                "last_airline":    r.get("last_airline"),
                "last_complaint":  r.get("last_complaint"),
                "recommendations": recos,
            })
        return {"items": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ActionLog(BaseModel):
    user_id: Optional[str] = None
    action: str
    source: str = "voc_dashboard"
    note: Optional[str] = None


@app.post("/tss/nlp/log-action")
def nlp_log_action(payload: ActionLog):
    try:
        _nlp_actions_collection().insert_one({
            "user_id": payload.user_id,
            "action":  payload.action,
            "source":  payload.source,
            "note":    payload.note,
            "ts":      datetime.utcnow(),
        })
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# Loyalty — CLV estimation & Churn prediction
# ─────────────────────────────────────────────

LOYALTY_COLLECTION = "loyalty_customers"


def _loyalty_col():
    return mongo_bridge._get_db()[LOYALTY_COLLECTION]


def _loyalty_doc(d: dict) -> dict:
    return {
        "id":                 str(d.get("_id", "")),
        "sk_customer":        d.get("SK_Customer"),
        "loyalty_number":     d.get("LoyaltyNumber"),
        "loyalty_card":       d.get("LoyaltyCard"),
        "country":            d.get("Country"),
        "province":           d.get("Province"),
        "city":               d.get("City"),
        "gender":             d.get("Gender"),
        "education":          d.get("Education"),
        "marital_status":     d.get("MaritalStatus"),
        "enrollment_type":    d.get("EnrollmentType"),
        "enrollment_year":    d.get("EnrollmentYear"),
        "clv_actual":         d.get("CLV"),
        "clv_predicted":      d.get("CLV_predicted"),
        "churn_proba":        d.get("churn_proba"),
        "risk_tier":          d.get("risk_tier"),
        "segment":            d.get("segment"),
        "is_churned":         bool(d.get("IsChurned")) if d.get("IsChurned") is not None else None,
        "total_flights":      d.get("TotalFlights"),
        "active_months":      d.get("ActiveMonths"),
        "points_accumulated": d.get("PointsAcc"),
        "points_redeemed":    d.get("PointsRed"),
        "recommended_action": d.get("recommended_action"),
    }


@app.get("/tss/loyalty/health")
def loyalty_health():
    return {"ready": loyalty_service.is_ready()}


@app.get("/tss/loyalty/stats")
def loyalty_stats():
    try:
        col = _loyalty_col()
        total = col.count_documents({})
        if total == 0:
            return {"total": 0, "ready": loyalty_service.is_ready()}

        agg = list(col.aggregate([{"$group": {
            "_id":           None,
            "clv_total":     {"$sum": "$CLV"},
            "clv_avg":       {"$avg": "$CLV"},
            "clv_pred_avg":  {"$avg": "$CLV_predicted"},
            "churn_avg":     {"$avg": "$churn_proba"},
            "churn_count":   {"$sum": {"$cond": ["$IsChurned", 1, 0]}},
        }}]))[0]

        by_card = list(col.aggregate([
            {"$group": {
                "_id":       "$LoyaltyCard",
                "count":     {"$sum": 1},
                "clv_avg":   {"$avg": "$CLV"},
                "churn_avg": {"$avg": "$churn_proba"},
            }},
            {"$sort": {"clv_avg": -1}},
        ]))

        by_risk = {
            t: col.count_documents({"risk_tier": t})
            for t in ("low", "medium", "high")
        }
        by_segment = list(col.aggregate([
            {"$group": {"_id": "$segment", "count": {"$sum": 1},
                        "clv_avg": {"$avg": "$CLV"}}},
            {"$sort": {"clv_avg": -1}},
        ]))

        return {
            "total":           total,
            "clv_total":       round(agg.get("clv_total") or 0, 2),
            "clv_avg":         round(agg.get("clv_avg") or 0, 2),
            "clv_pred_avg":    round(agg.get("clv_pred_avg") or 0, 2),
            "churn_avg":       round((agg.get("churn_avg") or 0) * 100, 1),
            "churn_rate":      round((agg.get("churn_count") or 0) * 100 / total, 1),
            "retention_rate":  round(100 - (agg.get("churn_count") or 0) * 100 / total, 1),
            "by_card": [
                {"card": r["_id"], "count": r["count"],
                 "clv_avg": round(r["clv_avg"] or 0, 2),
                 "churn_avg": round((r["churn_avg"] or 0) * 100, 1)}
                for r in by_card if r["_id"]
            ],
            "by_risk":    by_risk,
            "by_segment": [
                {"segment": r["_id"], "count": r["count"],
                 "clv_avg": round(r["clv_avg"] or 0, 2)}
                for r in by_segment if r["_id"]
            ],
            "ready": loyalty_service.is_ready(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tss/loyalty/customers")
def loyalty_customers(
    limit:      int = 50,
    skip:       int = 0,
    card:       Optional[str] = None,
    risk:       Optional[str] = None,
    segment:    Optional[str] = None,
    sort:       str = "churn",
    min_clv:    Optional[float] = None,
):
    try:
        col = _loyalty_col()
        q: dict = {}
        if card:    q["LoyaltyCard"] = card
        if risk in ("low", "medium", "high"): q["risk_tier"] = risk
        if segment: q["segment"] = segment
        if min_clv is not None: q["CLV"] = {"$gte": min_clv}

        sort_key = {
            "churn": ("churn_proba", -1),
            "clv":   ("CLV", -1),
            "clv_pred": ("CLV_predicted", -1),
            "name":  ("LoyaltyNumber", 1),
        }.get(sort, ("churn_proba", -1))

        total = col.count_documents(q)
        cursor = (col.find(q)
                  .sort(sort_key[0], sort_key[1])
                  .skip(max(0, skip))
                  .limit(max(1, min(limit, 200))))
        return {"total": total, "items": [_loyalty_doc(d) for d in cursor]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tss/loyalty/at-risk")
def loyalty_at_risk(limit: int = 15):
    """Priority retention list: highest churn probability among high-value customers."""
    try:
        col = _loyalty_col()
        cursor = col.find({"risk_tier": {"$in": ["medium", "high"]}}) \
                    .sort([("churn_proba", -1), ("CLV", -1)]) \
                    .limit(max(1, min(limit, 100)))
        return {"items": [_loyalty_doc(d) for d in cursor]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tss/loyalty/top-clv")
def loyalty_top_clv(limit: int = 15):
    try:
        col = _loyalty_col()
        cursor = col.find({}).sort("CLV", -1).limit(max(1, min(limit, 100)))
        return {"items": [_loyalty_doc(d) for d in cursor]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tss/loyalty/score")
def loyalty_score(payload: LoyaltyScoreRequest,
                  _: dict = Depends(get_current_user)):
    try:
        return loyalty_service.score(payload.dict())
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# Auth: signup / login / me / user management
# ─────────────────────────────────────────────

def _users_col():
    return mongo_bridge._get_db()["Authorized_users"]


@app.post("/tss/auth/signup")
def signup(payload: SignupRequest):
    """Public sign-up. Always creates a passenger (role is forced).
    Admins create elevated roles via /tss/auth/users."""
    email = payload.email.lower().strip()
    if find_user_by_email(email):
        raise HTTPException(status_code=409, detail="Email already registered")
    doc = {
        "name":          payload.name.strip(),
        "email":         email,
        "password_hash": hash_password(payload.password),
        "role":          "passenger",
        "active":        True,
        "created_at":    datetime.utcnow(),
    }
    if payload.photo:
        doc["photo"] = payload.photo
    if payload.descriptor:
        doc["descriptor"] = payload.descriptor
    res = _users_col().insert_one(doc)
    user = _users_col().find_one({"_id": res.inserted_id})
    token = create_session(user["_id"], user["role"])
    return {"token": token, "user": public_user(user)}


@app.post("/tss/auth/login")
def login_password(payload: LoginPasswordRequest):
    user = find_user_by_email(payload.email)
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account disabled")
    token = create_session(user["_id"], user.get("role", "passenger"))
    return {"token": token, "user": public_user(user)}


@app.get("/tss/auth/me")
def auth_me(user: dict = Depends(get_current_user)):
    return public_user(user)


@app.post("/tss/auth/logout")
def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and " " in authorization:
        revoke_session(authorization.split()[1])
    return {"ok": True}


@app.get("/tss/auth/users")
def list_users(_: dict = Depends(require_admin)):
    return {"items": [public_user(u) for u in _users_col().find()]}


@app.post("/tss/auth/users")
def admin_create_user(payload: SignupRequest, _: dict = Depends(require_admin)):
    email = payload.email.lower().strip()
    if find_user_by_email(email):
        raise HTTPException(status_code=409, detail="Email already registered")
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {ROLES}")
    doc = {
        "name":          payload.name.strip(),
        "email":         email,
        "password_hash": hash_password(payload.password),
        "role":          payload.role,
        "active":        True,
        "created_at":    datetime.utcnow(),
    }
    if payload.photo:
        doc["photo"] = payload.photo
    if payload.descriptor:
        doc["descriptor"] = payload.descriptor
    res = _users_col().insert_one(doc)
    return public_user(_users_col().find_one({"_id": res.inserted_id}))


@app.patch("/tss/auth/users/{user_id}/role")
def admin_update_role(user_id: str, payload: UpdateRoleRequest,
                      _: dict = Depends(require_admin)):
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {ROLES}")
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Bad user id")
    res = _users_col().update_one({"_id": oid}, {"$set": {"role": payload.role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return public_user(_users_col().find_one({"_id": oid}))


@app.delete("/tss/auth/users/{user_id}")
def admin_delete_user(user_id: str, current: dict = Depends(require_admin)):
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Bad user id")
    if str(current["_id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    _users_col().delete_one({"_id": oid})
    return {"ok": True}
