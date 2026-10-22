"""
Canonical ayah counts per surah (114 surahs, Madani mushaf).

Used by the Connections prompt builder to turn a huge negative
constraint ("don't use these 3,331 verses") into a small positive one
("use these surahs, minus these blocked ayahs").

Source: standard Medina print counts. Index 0 = surah 1.
"""

VERSES_PER_SURAH = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99,
    128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
    34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38,
    29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18,
    12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29,
    19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8,
    11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
]

SURAH_NAMES = {
    1: "Al-Fatihah", 2: "Al-Baqarah", 3: "Ali 'Imran", 4: "An-Nisa",
    5: "Al-Ma'idah", 6: "Al-An'am", 7: "Al-A'raf", 8: "Al-Anfal",
    9: "At-Tawbah", 10: "Yunus", 11: "Hud", 12: "Yusuf",
    13: "Ar-Ra'd", 14: "Ibrahim", 15: "Al-Hijr", 16: "An-Nahl",
    17: "Al-Isra", 18: "Al-Kahf", 19: "Maryam", 20: "Ta-Ha",
    21: "Al-Anbiya", 22: "Al-Hajj", 23: "Al-Mu'minun", 24: "An-Nur",
    25: "Al-Furqan", 26: "Ash-Shu'ara", 27: "An-Naml", 28: "Al-Qasas",
    29: "Al-Ankabut", 30: "Ar-Rum", 31: "Luqman", 32: "As-Sajdah",
    33: "Al-Ahzab", 34: "Saba", 35: "Fatir", 36: "Ya-Sin",
    37: "As-Saffat", 38: "Sad", 39: "Az-Zumar", 40: "Ghafir",
    41: "Fussilat", 42: "Ash-Shura", 43: "Az-Zukhruf", 44: "Ad-Dukhan",
    45: "Al-Jathiyah", 46: "Al-Ahqaf", 47: "Muhammad", 48: "Al-Fath",
    49: "Al-Hujurat", 50: "Qaf", 51: "Adh-Dhariyat", 52: "At-Tur",
    53: "An-Najm", 54: "Al-Qamar", 55: "Ar-Rahman", 56: "Al-Waqi'ah",
    57: "Al-Hadid", 58: "Al-Mujadilah", 59: "Al-Hashr", 60: "Al-Mumtahanah",
    61: "As-Saff", 62: "Al-Jumu'ah", 63: "Al-Munafiqun", 64: "At-Taghabun",
    65: "At-Talaq", 66: "At-Tahrim", 67: "Al-Mulk", 68: "Al-Qalam",
    69: "Al-Haqqah", 70: "Al-Ma'arij", 71: "Nuh", 72: "Al-Jinn",
    73: "Al-Muzzammil", 74: "Al-Muddaththir", 75: "Al-Qiyamah", 76: "Al-Insan",
    77: "Al-Mursalat", 78: "An-Naba", 79: "An-Nazi'at", 80: "Abasa",
    81: "At-Takwir", 82: "Al-Infitar", 83: "Al-Mutaffifin", 84: "Al-Inshiqaq",
    85: "Al-Buruj", 86: "At-Tariq", 87: "Al-A'la", 88: "Al-Ghashiyah",
    89: "Al-Fajr", 90: "Al-Balad", 91: "Ash-Shams", 92: "Al-Layl",
    93: "Ad-Duha", 94: "Ash-Sharh", 95: "At-Tin", 96: "Al-Alaq",
    97: "Al-Qadr", 98: "Al-Bayyinah", 99: "Az-Zalzalah", 100: "Al-Adiyat",
    101: "Al-Qari'ah", 102: "At-Takathur", 103: "Al-Asr", 104: "Al-Humazah",
    105: "Al-Fil", 106: "Quraysh", 107: "Al-Ma'un", 108: "Al-Kawthar",
    109: "Al-Kafirun", 110: "An-Nasr", 111: "Al-Masad", 112: "Al-Ikhlas",
    113: "Al-Falaq", 114: "An-Nas",
}

assert len(VERSES_PER_SURAH) == 114
assert VERSES_PER_SURAH[0] == 7 and VERSES_PER_SURAH[113] == 6
assert sum(VERSES_PER_SURAH) == 6236


def surah_ayah_count(n):
    """Number of ayahs in surah n (1-114)."""
    return VERSES_PER_SURAH[n - 1]


def free_ayah_ranges(blocked_refs, min_free=3):
    """Return {surah: [(start, end), ...]} of ayah ranges still available.

    A range is emitted only when it holds at least `min_free` unblocked
    ayahs, so we don't offer the model a one-ayah sliver it will collide
    with the moment two categories are generated.
    """
    blocked_by_surah = {}
    for ref in blocked_refs or ():
        if ":" not in str(ref):
            continue
        head, _, tail = str(ref).partition(":")
        try:
            s, a = int(head), int(tail)
        except ValueError:
            continue
        if 1 <= s <= 114:
            blocked_by_surah.setdefault(s, set()).add(a)

    ranges = {}
    for s in range(1, 115):
        total = VERSES_PER_SURAH[s - 1]
        used = blocked_by_surah.get(s, set())
        if len(used) >= total:
            continue  # surah fully exhausted
        runs = []
        start = None
        for a in range(1, total + 2):
            free = a <= total and a not in used
            if free and start is None:
                start = a
            elif not free and start is not None:
                if a - start >= min_free:
                    runs.append((start, a - 1))
                start = None
        if runs:
            ranges[s] = runs
    return ranges


# Runs shorter than this are not shown to the model, so the validator must
# not reject refs from them either — otherwise the prompt offers a surah and
# then refuses the whole neighbourhood it just pointed at.
MIN_SPAN = 8


def offered_ranges(blocked_refs, min_span=MIN_SPAN, max_surahs=20):
    """The ranges the prompt actually advertises, as {surah: [(lo, hi)]}.

    Must be the single source of truth for BOTH the prompt text and the
    validator's accept/reject decision. `format_allowed_ranges` renders
    these; `_in_allowlist` tests against them.
    """
    ranges = free_ayah_ranges(blocked_refs)
    offered = {}
    for s, runs in ranges.items():
        kept = [(lo, hi) for lo, hi in runs if (hi - lo + 1) >= min_span][:3]
        if kept:
            offered[s] = kept
    # Rank by free space, then cap — same ordering the prompt uses.
    ranked = sorted(offered.items(), key=lambda kv: -sum(b - a + 1 for a, b in kv[1]))
    return dict(ranked[:max_surahs])


def format_allowed_ranges(ranges, max_surahs=20, min_span=8):
    """Compact human-readable allowlist for the prompt.

    Prefer passing the output of `offered_ranges` directly — this function
    additionally filters and caps, so calling it on raw `free_ayah_ranges`
    output can advertise a surah whose runs were later dropped.
    """
    if not ranges:
        return "(none)"
    ranked = sorted(ranges.items(), key=lambda kv: -sum(
        b - a + 1 for a, b in kv[1]
    ))[:max_surahs]
    parts = []
    for s, runs in ranked:
        kept = [r for r in runs if (r[1] - r[0] + 1) >= min_span][:3]
        if not kept:
            continue
        name = SURAH_NAMES.get(s, f"{s}")
        span = ",".join(f"{a}-{b}" if a != b else str(a) for a, b in kept)
        parts.append(f"{s} ({name}) [{span}]")
    return "; ".join(parts) if parts else "(none)"


if __name__ == "__main__":
    print(f"surahs: {len(VERSES_PER_SURAH)}, total ayahs: {sum(VERSES_PER_SURAH)}")