import speech_recognition as sr
import logging

class VoiceAgent:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.logger = logging.getLogger("VoiceAgent")

    def listen_command(self):
        """Attempts to listen for a voice command."""
        print("[Voice Agent] Listening for command...")
        try:
            with sr.Microphone() as source:
                self.recognizer.adjust_for_ambient_noise(source)
                audio = self.recognizer.listen(source, timeout=5)
                command = self.recognizer.recognize_google(audio)
                self.logger.info(f"Command detected: {command}")
                return command
        except Exception as e:
            self.logger.warning(f"Voice detection failed or timed out: {e}")
            return None

    def detect_intent(self, text):
        """Simplistic intent detection."""
        if not text: return None
        text = text.lower()
        if "assistance" in text: return "start assistance"
        if "subtitle" in text: return "start subtitles"
        if "emergency" in text or "sos" in text: return "send emergency alert"
        if "reminder" in text: return "set reminder"
        if "sound" in text: return "detect sound"
        return text

    def run(self, input_data=None):
        """
        Main run method. If input_data contains 'text', use it. 
        Otherwise, attempt to listen.
        """
        if input_data and "text" in input_data:
            command = input_data["text"]
        else:
            command = self.listen_command()
        
        if command:
            intent = self.detect_intent(command)
            return {"status": "success", "command": command, "intent": intent}
        else:
            return {"status": "fail", "message": "No command detected. Please try again or use text input."}
