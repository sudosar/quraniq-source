import json
from typing import Dict, Any

# --- Mock Data Structure from the Problem ---
SAMPLE_DATA = {
    "educational_notes": {
      "verse_context": "This verse was revealed in Makkah during a period of intense hardship for Prophet Muhammad (ﷺ) and the early Muslims. It serves as a direct consolation from Allah, reminding the Prophet that the difficulties he was facing were temporary and that relief was not just coming after, but was present *with* the struggle. The verse is repeated for emphasis in the next ayah (94:6).",
      "theme_explanation": "The theme is one of divine hope and resilience. The Arabic word 'ma'a' (مَعَ) means 'with', not 'ba'da' (بَعْدَ) which means 'after'. This subtle but profound choice of words teaches that ease is not a separate event that follows hardship, but is intrinsically connected to it. The very process of enduring hardship with faith and patience is a source of spiritual ease and brings one closer to the ultimate relief from Allah. It's a universal principle for believers facing any trial.",
      "surah_overview": "Surah Al-Inshirah, meaning 'The Relief' or 'The Opening-Forth,' is the 94th surah of the Quran. It is a short Makkan surah of 8 verses, revealed to comfort and reassure Prophet Muhammad (ﷺ). The surah begins by reminding the Prophet of the blessings Allah has bestowed upon him, such as opening his heart and removing his burdens. It then presents the core principle that with every hardship comes ease, repeating it for emphasis. The surah concludes by advising the Prophet to turn to his Lord with devotion and supplication once his immediate tasks are completed."
    }
}

def serialize_educational_notes(notes: Dict[str, str]) -> str:
    """
    Concatenates all fields within educational_notes into a single markdown string.
    This ensures that the entire context is passed to the external translation service 
    without intermediate data structure loss or truncation based on key-value separation.

    Args:
        notes: The dictionary containing contextual notes (verse_context, etc.).

    Returns:
        A single, continuous markdown string ready for API transmission.
    """
    if not notes:
        return ""

    parts = []
    # Manually structure the concatenation to maintain context flow and clarity for the LLM
    parts.append("# Educational Notes on Surah Al-Inshirah\n")
    parts.append("## Verse Context:\n" + notes.get("verse_context", "") + "\n\n")
    parts.append("## Theme Explanation:\n" + notes.get("theme_explanation", "") + "\n\n")
    parts.append("## Surah Overview:\n" + notes.get("surah_overview", "") + "\n")

    # Joining with a header separator to maximize context retention during translation.
    return "\n***\n\n".join(parts)


def process_for_translation(data: Dict[str, Any]) -> str:
    """
    Main function wrapper that fixes the serialization issue before calling the 
    hypothetical external API.
    """
    notes = data.get("educational_notes")
    if notes:
        # FIX APPLIED HERE: Use robust concatenation instead of relying on simple string interpolation.
        full_source_text = serialize_educational_notes(notes)
        print("\n[INFO] Successfully serialized full source text for translation.")
        return full_source_text
    return "No educational notes available."

# --- End of Fix Code ---