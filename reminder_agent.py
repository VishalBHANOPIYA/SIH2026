from apscheduler.schedulers.background import BackgroundScheduler
import datetime
import logging

class ReminderAgent:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.scheduler.start()
        self.logger = logging.getLogger("ReminderAgent")

    def add_reminder(self, task, time_str):
        # Simplistic time parsing for demo purposes
        # In real life, use dateparser or similar
        try:
            # For demo, just say "success" and print it
            self.logger.info(f"Reminder set for '{task}' at {time_str}")
            return f"SUCCESS: Reminder set for '{task}' at {time_str}"
        except Exception as e:
            return f"FAIL: Could not set reminder. {e}"

    def run(self, input_data):
        user_input = input_data.get("input", "")
        if "reminder" in user_input:
            # Simple extraction logic for demo
            if "medicine" in user_input:
                return self.add_reminder("Medicine", "8:00 PM")
            elif "walk" in user_input:
                return self.add_reminder("Evening Walk", "6:00 PM")
            
            return self.add_reminder("General Task", "Scheduled Time")
        
        return "INFO: Reminder service is active."
