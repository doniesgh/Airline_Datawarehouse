from flask import Flask, request, jsonify
from pymongo import MongoClient
import face_recognition
import numpy as np
import base64
import cv2

app = Flask(__name__)

# MongoDB connection
client = MongoClient("mongodb://localhost:27017/")
db = client["face_db"]
collection = db["users"]

# Convert base64 image to numpy
def base64_to_image(base64_str):
    img_data = base64.b64decode(base64_str.split(",")[1])
    np_arr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

# =========================
# REGISTER FACE
# =========================
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    name = data["name"]
    image = base64_to_image(data["image"])

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    encodings = face_recognition.face_encodings(rgb)

    if len(encodings) == 0:
        return jsonify({"error": "No face detected"}), 400

    encoding = encodings[0].tolist()

    collection.insert_one({
        "name": name,
        "encoding": encoding
    })

    return jsonify({"message": "User registered"})


# =========================
# LOGIN (FACE MATCH)
# =========================
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    image = base64_to_image(data["image"])

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    encodings = face_recognition.face_encodings(rgb)

    if len(encodings) == 0:
        return jsonify({"error": "No face detected"}), 400

    unknown_encoding = encodings[0]

    users = list(collection.find())

    for user in users:
        stored_encoding = np.array(user["encoding"])

        match = face_recognition.compare_faces(
            [stored_encoding],
            unknown_encoding
        )

        if match[0]:
            return jsonify({
                "success": True,
                "name": user["name"]
            })

    return jsonify({"success": False})


if __name__ == "__main__":
    app.run(debug=True)