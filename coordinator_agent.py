import logging

class CoordinatorAgent:
    def __init__(self, language="en"):
        self.agents = {}
        self.language = language
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger("Coordinator")
        
        # Multilingual Dictionary for Voice Feedback
        self.translations = {
            "en": {
                "vision_active": "Vision assistance mode activated. I am now scanning your surroundings.",
                "subtitle_active": "Audio assistance active. I will now transcribe speech for you.",
                "sos_active": "Emergency sequence initiated. I am notifying your guardians now.",
                "reminder_active": "Reminder system ready. Tell me what you would like to schedule.",
                "vision_not_avail": "I'm sorry, the Vision Agent is currently unavailable.",
                "subtitle_not_avail": "The Subtitle services are not responding right now.",
                "sos_not_avail": "Emergency services could not be initialized.",
                "reminder_not_avail": "The reminder system is offline.",
                "sound_not_avail": "Sound detection is not available at this moment.",
                "unknown": "I'm not sure how to help with that. Try saying 'Start assistance' or 'Send emergency SOS'."
            },
            "hi": {
                "vision_active": "विज़न असिस्टेंस मोड सक्रिय हो गया है। मैं अब आपके परिवेश को स्कैन कर रहा हूँ।",
                "subtitle_active": "ऑडियो सहायता सक्रिय है। मैं अब आपके लिए भाषण को ट्रांसक्राइब करूँगा।",
                "sos_active": "आपातकालीन प्रक्रिया शुरू हो गई है। मैं अभी आपके अभिभावकों को सूचित कर रहा हूँ।",
                "reminder_active": "रिमाइंडर सिस्टम तैयार है। मुझे बताएं कि आप क्या शेड्यूल करना चाहते हैं।",
                "vision_not_avail": "क्षमा करें, विज़न एजेंट अभी उपलब्ध नहीं है।",
                "subtitle_not_avail": "सबटाइटल सेवाएं अभी प्रतिसाद नहीं दे रही हैं।",
                "sos_not_avail": "आपातकालीन सेवाएं शुरू नहीं की जा सकीं।",
                "reminder_not_avail": "रिमाइंडर सिस्टम ऑफ़लाइन है।",
                "sound_not_avail": "इस समय ध्वनि पहचान उपलब्ध नहीं है।",
                "unknown": "मुझे समझ नहीं आया। 'मदद शुरू करें' या 'आपातकालीन एसओएस भेजें' कह कर देखें।"
            }
        }

    def register_agent(self, name, agent_instance):
        self.agents[name] = agent_instance
        self.logger.info(f"Agent '{name}' registered.")

    def route(self, user_input):
        self.logger.info(f"Routing command: {user_input}")
        user_input = user_input.lower()
        t = self.translations.get(self.language, self.translations["en"])

        if any(k in user_input for k in ["vision", "camera", "assistance", "see", "look", "मदद", "देखना"]):
            if "vision" in self.agents:
                self.agents["vision"].run({"mode": "continuous"})
                return t.get("vision_active", "Vision mode active.")
            return t["vision_not_avail"]

        elif any(k in user_input for k in ["hearing", "subtitle", "transcribe", "audio", "sunna", "उपशीर्षक"]):
            if "subtitle" in self.agents:
                self.agents["subtitle"].run({"action": "start"})
                return t.get("subtitle_active", "Audio mode active.")
            return t["subtitle_not_avail"]

        elif "emergency" in user_input or "sos" in user_input or "आपातकाल" in user_input:
            if "sos" in self.agents:
                # Simple parser for "emergency LAT LON"
                parts = user_input.split()
                params = {"trigger": "manual"}
                if len(parts) >= 3:
                    params["latitude"] = parts[1]
                    params["longitude"] = parts[2]
                
                res = self.agents["sos"].run(params)
                return res
            return t["sos_not_avail"]

        elif "reminder" in user_input or "set" in user_input or "याद" in user_input:
            if "reminder" in self.agents:
                self.agents["reminder"].run({"input": user_input})
                return t.get("reminder_active", "Reminders ready.")
            return t["reminder_not_avail"]
            
        elif "sound" in user_input or "detect" in user_input or "आवाज" in user_input:
            if "sound" in self.agents:
                return self.agents["sound"].run({"mode": "listen"})
            return t["sound_not_avail"]

        else:
            return t["unknown"]

    def aggregate_responses(self, responses):
        # Logic to combine responses if needed
        return " | ".join(responses)
