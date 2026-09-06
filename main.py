from coordinator_agent import CoordinatorAgent
from vision_agent import VisionAgent
from voice_agent import VoiceAgent
from subtitle_agent import SubtitleAgent
from sos_agent import SOSAgent
from reminder_agent import ReminderAgent
from sound_agent import SoundDetectionAgent
import time

def run_demo():
    print("="*50)
    print("ACCESSIBILITY COMPANION AGENT - MULTI-AGENT SYSTEM")
    print("="*50)

    # Initialize Agents
    coordinator = CoordinatorAgent()
    vision = VisionAgent()
    voice = VoiceAgent()
    subtitle = SubtitleAgent()
    sos = SOSAgent()
    reminder = ReminderAgent()
    sound = SoundDetectionAgent()

    # Register Agents with Coordinator
    coordinator.register_agent("vision", vision)
    coordinator.register_agent("voice", voice)
    coordinator.register_agent("subtitle", subtitle)
    coordinator.register_agent("sos", sos)
    coordinator.register_agent("reminder", reminder)
    coordinator.register_agent("sound", sound)

    # Demo Flow (Step 10)
    print("\n[SCENARIO 1] User wants vision assistance")
    response = coordinator.route("start assistance")
    print(f"System Output: {response}")

    print("\n[SCENARIO 2] User wants subtitles")
    response = coordinator.route("start subtitles")
    print(f"System Output: {response}")

    print("\n[SCENARIO 3] Sound detection monitoring")
    response = coordinator.route("detect sounds in environment")
    print(f"System Output: {response}")

    print("\n[SCENARIO 4] Emergency Situation")
    response = coordinator.route("EMERGENCY - I need help!")
    print(f"System Output: {response}")

    print("\n[SCENARIO 5] Reminder setup")
    response = coordinator.route("set reminder for 8 PM medicine")
    print(f"System Output: {response}")

    print("\n" + "="*50)
    print("DEMO COMPLETE")
    print("="*50)

if __name__ == "__main__":
    run_demo()
