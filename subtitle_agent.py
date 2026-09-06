import time

class SubtitleAgent:
    def __init__(self):
        self.is_running = False

    def run(self, input_data):
        action = input_data.get("action", "start")
        if action == "start":
            self.is_running = True
            print("[Subtitle Agent] Live subtitles enabled.")
            # In a real app, this would start a background thread listening and printing text
            return "SUCCESS: Live subtitles enabled. Listening for speech..."
        elif action == "stop":
            self.is_running = False
            return "SUCCESS: Subtitles disabled."
        
        # Simulated conversion
        return "INFO: Speech converted successfully. Displaying on screen."

    def transcribe_audio(self, audio_sample):
        # Stub for deepgram / whisper / google stt
        return "Simulated transcription: Hello, how can I help you today?"
