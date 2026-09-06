import random
import time

class VisionAgent:
    def __init__(self):
        # In a real scenario, we would load the YOLO model here
        # self.model = YOLO('yolov8n.pt')
        self.objects = ["person", "chair", "stairs", "door", "vehicle", "obstacle"]

    def run(self, input_data):
        print("[Vision Agent] Capturing frame and running detection...")
        # Simulate processing time
        time.sleep(1)
        
        # Simulate detection
        detected = random.choice(self.objects)
        confidence = random.uniform(0.7, 0.99)
        
        result = f"{detected.capitalize()} detected ahead (Confidence: {confidence:.2f})"
        
        if detected in ["stairs", "vehicle", "obstacle"]:
            return f"⚠️ ALERT: {result}. Please be careful."
        
        return f"INFO: {result}"

    def detect_objects(self, frame):
        # Stub for real YOLO detection
        # results = self.model(frame)
        return []
