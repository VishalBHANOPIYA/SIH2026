import random
import time

class SoundDetectionAgent:
    def __init__(self):
        self.sounds = ["doorbell", "alarm", "vehicle horn", "smoke detector", "siren"]

    def run(self, input_data):
        print("[Sound Agent] Monitoring environment sounds...")
        # Simulate processing
        time.sleep(1)
        
        # Simulate detection
        detected_sound = random.choice(self.sounds)
        
        if detected_sound in ["smoke detector", "siren"]:
            return f"🚨 URGENT: {detected_sound.upper()} detected! Please check your surroundings."
        
        return f"INFO: {detected_sound.capitalize()} detected."

    def classify_sound(self, audio_sample):
        # Stub for audio classification model
        return "doorbell"
