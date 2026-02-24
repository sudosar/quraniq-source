const state = {
    mistakes: 0,
    solved: [
        {
            "name": "Geographical Locations Mentioned by Name",
            "nameEn": "Geographical Locations Mentioned by Name",
            "items": [
                {
                    "ar": "مَكَّةَ",
                    "en": "Makkah",
                    "ref": "48:24"
                },
                {
                    "ar": "مِصْرَ",
                    "en": "Egypt",
                    "ref": "10:87"
                }
            ]
        }
    ],
    correctCount: 4,
    exploredVerses: ["48:24", "10:87"]
};

const correctCount = state.solved.length === 4 && state.mistakes > 0 ? 4 : (state.correctCount ?? 0);
const explored = new Set(state.exploredVerses);
let totalExplored = 0;
let totalVerses = 0;
let totalScore = 0;

state.solved.forEach((s, i) => {
    const wasSolved = i < correctCount;
    // Use unique refs per row
    const items = s.items || [];
    const uniqueRefs = new Set();
    items.forEach(item => {
        const ref = typeof item === 'object' ? item.ref : '';
        if (ref) uniqueRefs.add(ref);
    });
    const rowTotal = uniqueRefs.size || items.length;
    let rowExplored = 0;
    uniqueRefs.forEach(ref => {
        if (explored.has(ref)) rowExplored++;
    });
    totalVerses += rowTotal;
    totalExplored += rowExplored;

    let crescent;
    let rowScore = 0;
    if (!wasSolved) {
        crescent = '🌑'; // Failed
        rowScore = 0;
    } else if (rowExplored >= rowTotal) {
        crescent = '🌙'; // Solved + reviewed
        rowScore = 2;
    } else {
        crescent = '🌒'; // Solved, unreviewed
        rowScore = 1;
    }

    totalScore += rowScore;
});

console.log('Total Score:', totalScore);
