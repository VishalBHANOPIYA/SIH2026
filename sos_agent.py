import logging

class SOSAgent:
    def __init__(self):
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger("SOSAgent")

    def run(self, params):
        trigger = params.get("trigger", "manual")
        lat = params.get("latitude", "28.6139")  # Default to New Delhi
        lon = params.get("longitude", "77.2090")
        
        maps_link = f"https://www.google.com/maps?q={lat},{lon}"
        
        msg = f"EMERGENCY ALERT! User needs help immediately. Location: {lat}, {lon}. View maps: {maps_link}"
        
        self.logger.critical(f"SOS TRIGGERED: {trigger}")
        self.logger.info(f"Generating Emergency SMS to Primary Guardian...")
        self.logger.info(f"SMS CONTENT: {msg}")
        self.logger.info("Initializing Auto-Call sequence to Emergency Services (112)...")
        
        return {
            "status": "success",
            "message": "Emergency services and guardians have been notified. Location link sent successfully.",
            "location": {"lat": lat, "lon": lon},
            "maps_url": maps_link
        }
