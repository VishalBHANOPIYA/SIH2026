from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from coordinator_agent import CoordinatorAgent
from vision_agent import VisionAgent
from voice_agent import VoiceAgent
from subtitle_agent import SubtitleAgent
from sos_agent import SOSAgent
from reminder_agent import ReminderAgent
from sound_agent import SoundDetectionAgent
import os

app = Flask(__name__, static_folder='frontend')
CORS(app)

# Initialize Agents
coordinator = CoordinatorAgent()
vision = VisionAgent()
voice = VoiceAgent()
subtitle = SubtitleAgent()
sos = SOSAgent()
reminder = ReminderAgent()
sound = SoundDetectionAgent()

# Register Agents
coordinator.register_agent("vision", vision)
coordinator.register_agent("voice", voice)
coordinator.register_agent("subtitle", subtitle)
coordinator.register_agent("sos", sos)
coordinator.register_agent("reminder", reminder)
coordinator.register_agent("sound", sound)

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route('/api/start-mode', methods=['POST'])
def start_mode():
    data = request.json
    mode = data.get('mode')
    response = coordinator.route(f"start {mode}")
    return jsonify({"status": "success", "message": response})

@app.route('/api/vision')
def get_vision():
    result = vision.run({"mode": "single"})
    return jsonify({"detected_object": result})

@app.route('/api/subtitles')
def get_subtitles():
    result = subtitle.run({"action": "transcribe"})
    return jsonify({"text": result})

@app.route('/api/reminder', methods=['POST'])
def set_reminder():
    data = request.json
    result = reminder.run({"input": f"set reminder {data.get('medicine')}"})
    return jsonify({"message": result})

@app.route('/api/sos', methods=['GET', 'POST'])
def trigger_sos():
    data = request.get_json(silent=True) if request.method == 'POST' else {}
    if not data: data = {}
    lat = data.get('latitude', '28.6139')
    lon = data.get('longitude', '77.2090')
    result = coordinator.route(f"emergency {lat} {lon}")
    if isinstance(result, dict):
        return jsonify(result)
    return jsonify({"status": "success", "message": result})

@app.route('/api/voice-command')
def get_voice_command():
    # Simulated voice command for browser demo
    result = voice.run({"text": "start assistance"})
    return jsonify({"command": result['command'], "intent": result['intent']})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
