/* ============================================
   QURANPUZZLE - DAILY PUZZLE DATA
   ============================================ */

const PUZZLES = {

    // ==================== CONNECTIONS PUZZLES ====================
    connections: [
        {
            id: 1,
            categories: [
                {
                    name: "Prophets mentioned in Surah Al-Anbiya",
                    color: "yellow",
                    items: ["Musa", "Dawud", "Sulayman", "Ayyub"]
                },
                {
                    name: "Names of Allah (Ar-Rahman group)",
                    color: "green",
                    items: ["Ar-Rahman", "Ar-Raheem", "Al-Wadud", "Al-Latif"]
                },
                {
                    name: "Items mentioned in Surah Al-Baqarah",
                    color: "blue",
                    items: ["Cow", "Mountain", "Throne", "Ark"]
                },
                {
                    name: "Surahs named after Prophets",
                    color: "purple",
                    items: ["Yunus", "Hud", "Yusuf", "Ibrahim"]
                }
            ]
        },
        {
            id: 2,
            categories: [
                {
                    name: "Miracles of Prophet Musa (AS)",
                    color: "yellow",
                    items: ["Staff to serpent", "Parting the sea", "Glowing hand", "Twelve springs"]
                },
                {
                    name: "Five Pillars of Islam",
                    color: "green",
                    items: ["Shahada", "Salah", "Zakat", "Hajj"]
                },
                {
                    name: "Angels mentioned in the Quran",
                    color: "blue",
                    items: ["Jibreel", "Mikael", "Israfil", "Malik"]
                },
                {
                    name: "Things Allah swears by in the Quran",
                    color: "purple",
                    items: ["The Sun", "The Fig", "The Pen", "Time (Al-Asr)"]
                }
            ]
        },
        {
            id: 3,
            categories: [
                {
                    name: "People destroyed in the Quran",
                    color: "yellow",
                    items: ["People of Aad", "People of Thamud", "People of Lut", "People of Nuh"]
                },
                {
                    name: "Fruits mentioned in the Quran",
                    color: "green",
                    items: ["Dates", "Grapes", "Olives", "Pomegranates"]
                },
                {
                    name: "Companions of the Cave (themes)",
                    color: "blue",
                    items: ["Youth", "Sleep", "Dog", "Cave"]
                },
                {
                    name: "Descriptions of the Quran itself",
                    color: "purple",
                    items: ["Light (Nur)", "Guidance (Huda)", "Healing (Shifa)", "Mercy (Rahma)"]
                }
            ]
        },
        {
            id: 4,
            categories: [
                {
                    name: "Women mentioned in the Quran",
                    color: "yellow",
                    items: ["Maryam", "Asiya", "Wife of Lut", "Mother of Musa"]
                },
                {
                    name: "Prophets given major scriptures",
                    color: "green",
                    items: ["Muhammad (Quran)", "Musa (Torah)", "Dawud (Zabur)", "Isa (Injeel)"]
                },
                {
                    name: "Trials of Prophet Ibrahim (AS)",
                    color: "blue",
                    items: ["Fire", "Sacrifice of son", "Leaving family in desert", "Building the Kaaba"]
                },
                {
                    name: "Last ten Surahs of the Quran",
                    color: "purple",
                    items: ["Al-Fil", "Al-Kawthar", "Al-Ikhlas", "An-Nas"]
                }
            ]
        },
        {
            id: 5,
            categories: [
                {
                    name: "Events of the Day of Judgment",
                    color: "yellow",
                    items: ["Trumpet blown", "Mountains crumble", "Seas overflow", "Stars fall"]
                },
                {
                    name: "Attributes of believers in Surah Al-Mu'minun",
                    color: "green",
                    items: ["Humble in prayer", "Avoid vain talk", "Pay Zakat", "Guard modesty"]
                },
                {
                    name: "Things created in pairs (Quran 36:36)",
                    color: "blue",
                    items: ["Night and Day", "Male and Female", "Sun and Moon", "Land and Sea"]
                },
                {
                    name: "Locations mentioned in the Quran",
                    color: "purple",
                    items: ["Makkah", "Madinah (Yathrib)", "Mount Sinai", "Badr"]
                }
            ]
        },
        {
            id: 6,
            categories: [
                {
                    name: "Stories in Surah Al-Kahf",
                    color: "yellow",
                    items: ["Sleepers of the Cave", "Owner of Two Gardens", "Musa and Khidr", "Dhul-Qarnayn"]
                },
                {
                    name: "Names of Jahannam in the Quran",
                    color: "green",
                    items: ["An-Nar", "Jahannam", "Sa'ir", "Hutama"]
                },
                {
                    name: "Animals mentioned in the Quran",
                    color: "blue",
                    items: ["Bee", "Spider", "Ant", "Hoopoe"]
                },
                {
                    name: "Meccan Surahs about the Hereafter",
                    color: "purple",
                    items: ["Al-Qari'ah", "At-Takathur", "Az-Zalzalah", "Al-Infitar"]
                }
            ]
        },
        {
            id: 7,
            categories: [
                {
                    name: "Qualities of the Quran in Surah Al-Baqarah",
                    color: "yellow",
                    items: ["No doubt in it", "Guidance for the mindful", "Confirms previous books", "Criterion of right and wrong"]
                },
                {
                    name: "Prophets from the lineage of Ibrahim",
                    color: "green",
                    items: ["Ishaq", "Yaqub", "Yusuf", "Ismail"]
                },
                {
                    name: "Rewards of Paradise (Jannah)",
                    color: "blue",
                    items: ["Rivers of milk", "Rivers of honey", "Gardens beneath which rivers flow", "Thornless lote trees"]
                },
                {
                    name: "Causes of revelation (Asbab al-Nuzul themes)",
                    color: "purple",
                    items: ["Changing Qiblah", "Night Journey", "Battle of Badr", "Treaty of Hudaybiyyah"]
                }
            ]
        },
        {
            id: 8,
            categories: [
                {
                    name: "Characteristics of hypocrites (Al-Munafiqun)",
                    color: "yellow",
                    items: ["Lying when speaking", "Breaking promises", "Deceiving believers", "Showing off in prayer"]
                },
                {
                    name: "Things Shaytan does (Quranic references)",
                    color: "green",
                    items: ["Whispers", "Beautifies evil deeds", "Causes forgetfulness", "Promises poverty"]
                },
                {
                    name: "Prayers mentioned in the Quran",
                    color: "blue",
                    items: ["Dua of Adam (AS)", "Dua of Yunus (AS)", "Dua of Ibrahim (AS)", "Dua of Musa (AS)"]
                },
                {
                    name: "Number references in the Quran",
                    color: "purple",
                    items: ["Seven heavens", "Twelve tribes", "Nineteen angels", "Forty nights"]
                }
            ]
        },
        {
            id: 9,
            categories: [
                {
                    name: "Parables in the Quran",
                    color: "yellow",
                    items: ["Light upon light", "Spider's web", "Fly's wing", "Dog panting"]
                },
                {
                    name: "Types of water mentioned in the Quran",
                    color: "green",
                    items: ["Rain from sky", "Springs from earth", "Rivers flowing", "Sea water"]
                },
                {
                    name: "Quranic commands to the Prophet (SAW)",
                    color: "blue",
                    items: ["Read (Iqra)", "Stand in prayer at night", "Warn your nearest kin", "Be patient"]
                },
                {
                    name: "Metals and materials in the Quran",
                    color: "purple",
                    items: ["Iron (Hadid)", "Gold", "Silver", "Copper"]
                }
            ]
        },
        {
            id: 10,
            categories: [
                {
                    name: "Oaths in Surah Ash-Shams",
                    color: "yellow",
                    items: ["By the sun", "By the moon", "By the day", "By the night"]
                },
                {
                    name: "Prophet Yusuf's story elements",
                    color: "green",
                    items: ["Dream of eleven stars", "Thrown in a well", "False accusation", "Interpreter of dreams"]
                },
                {
                    name: "Rights emphasized in the Quran",
                    color: "blue",
                    items: ["Rights of parents", "Rights of orphans", "Rights of neighbors", "Rights of travelers"]
                },
                {
                    name: "Surahs beginning with 'Qul' (Say)",
                    color: "purple",
                    items: ["Al-Kafirun", "Al-Ikhlas", "Al-Falaq", "An-Nas"]
                }
            ]
        },
        {
            id: 11,
            categories: [
                {
                    name: "Creation miracles mentioned in the Quran",
                    color: "yellow",
                    items: ["Heavens and Earth in six days", "Human from clay", "Jinn from fire", "Angels from light"]
                },
                {
                    name: "Characteristics of Surah Al-Fatiha",
                    color: "green",
                    items: ["Mother of the Book", "Seven oft-repeated", "Opening chapter", "Contains praise and supplication"]
                },
                {
                    name: "Punishments of past nations",
                    color: "blue",
                    items: ["Flood (Nuh)", "Wind (Aad)", "Earthquake (Thamud)", "Rain of stones (Lut)"]
                },
                {
                    name: "Stages of human creation (Quran 23:12-14)",
                    color: "purple",
                    items: ["Clay", "Drop of fluid", "Clinging clot", "Lump of flesh"]
                }
            ]
        },
        {
            id: 12,
            categories: [
                {
                    name: "Ulul Azm (Prophets of strong will)",
                    color: "yellow",
                    items: ["Nuh", "Ibrahim", "Musa", "Isa"]
                },
                {
                    name: "Themes of Surah Ar-Rahman",
                    color: "green",
                    items: ["Teaching the Quran", "Which favors will you deny?", "Two gardens", "Balance and justice"]
                },
                {
                    name: "Etiquettes taught in Surah Al-Hujurat",
                    color: "blue",
                    items: ["Verify news", "Avoid suspicion", "Do not spy", "Do not mock others"]
                },
                {
                    name: "Colors mentioned in the Quran",
                    color: "purple",
                    items: ["White", "Black", "Green", "Yellow"]
                }
            ]
        },
        {
            id: 13,
            categories: [
                {
                    name: "Surah Al-Mulk themes",
                    color: "yellow",
                    items: ["Sovereignty belongs to Allah", "Death and life as a test", "Seven layered heavens", "Birds held in the sky"]
                },
                {
                    name: "Actions that expiate sins",
                    color: "green",
                    items: ["Repentance (Tawbah)", "Charity (Sadaqah)", "Fasting", "Good deeds erase bad"]
                },
                {
                    name: "Enemies of prophets mentioned in Quran",
                    color: "blue",
                    items: ["Firaun (to Musa)", "Abu Lahab (to Muhammad)", "Namrud (to Ibrahim)", "Qarun (arrogant rich)"]
                },
                {
                    name: "Celestial objects in the Quran",
                    color: "purple",
                    items: ["Stars", "Moon", "Sun", "Constellations"]
                }
            ]
        },
        {
            id: 14,
            categories: [
                {
                    name: "Blessed things in the Quran",
                    color: "yellow",
                    items: ["Olive tree", "Night of Qadr", "Makkah (Bakkah)", "Rain water"]
                },
                {
                    name: "Responsibilities of a Muslim",
                    color: "green",
                    items: ["Enjoin good", "Forbid evil", "Establish prayer", "Trust in Allah"]
                },
                {
                    name: "Scenes from the story of Musa and Khidr",
                    color: "blue",
                    items: ["Damaged boat", "Boy who was killed", "Rebuilt wall", "Fish escaped at junction"]
                },
                {
                    name: "Ayat al-Kursi themes (2:255)",
                    color: "purple",
                    items: ["No god but He", "Neither slumber nor sleep", "His Kursi extends over heavens and earth", "No intercession except by His leave"]
                }
            ]
        }
    ],

    // ==================== VERSE WORDLE PUZZLES ====================
    wordle: [
        { id: 1, word: "QURAN", hint: "The holy book of Islam", verse: "Indeed, it is We who sent down the Quran and indeed, We will be its guardian. (15:9)" },
        { id: 2, word: "MERCY", hint: "Allah's attribute most mentioned", verse: "My mercy encompasses all things. (7:156)" },
        { id: 3, word: "LIGHT", hint: "Allah is the ___ of the heavens and earth", verse: "Allah is the Light of the heavens and the earth. (24:35)" },
        { id: 4, word: "FAITH", hint: "Iman in English", verse: "The believers are only those who, when Allah is mentioned, their hearts become fearful. (8:2)" },
        { id: 5, word: "PEACE", hint: "Salam in English", verse: "And Allah invites to the Home of Peace. (10:25)" },
        { id: 6, word: "TRUTH", hint: "Al-Haqq in English", verse: "Truth has come, and falsehood has departed. Indeed is falsehood ever bound to depart. (17:81)" },
        { id: 7, word: "HEART", hint: "Qalb - what Allah looks at", verse: "Indeed in the remembrance of Allah do hearts find rest. (13:28)" },
        { id: 8, word: "EARTH", hint: "Allah created heavens and ___", verse: "It is He who created the heavens and earth in six days. (7:54)" },
        { id: 9, word: "ANGEL", hint: "Jibreel is one", verse: "He sends down the angels with revelation by His command. (16:2)" },
        { id: 10, word: "NIGHT", hint: "Laylat al-Qadr is a blessed ___", verse: "The Night of Decree is better than a thousand months. (97:3)" },
        { id: 11, word: "WATER", hint: "Every living thing made from this", verse: "And We made from water every living thing. (21:30)" },
        { id: 12, word: "PRAYER", hint: "Salah in English (6 letters)", verse: "Indeed, prayer prohibits immorality and wrongdoing. (29:45)" },
        { id: 13, word: "TRUST", hint: "Tawakkul - reliance on Allah", verse: "And whoever puts their trust in Allah, He is sufficient for them. (65:3)" },
        { id: 14, word: "SATAN", hint: "Shaytan in English", verse: "Indeed, Satan is an enemy to you; so take him as an enemy. (35:6)" },
        { id: 15, word: "MONTH", hint: "Ramadan is a blessed ___", verse: "The month of Ramadan in which was revealed the Quran. (2:185)" },
        { id: 16, word: "JUDGE", hint: "Allah is the best of these", verse: "Is not Allah the most just of judges? (95:8)" },
        { id: 17, word: "GUIDE", hint: "Allah is Al-Hadi, The ___", verse: "And Allah guides whom He wills to a straight path. (2:213)" },
        { id: 18, word: "SIGNS", hint: "Ayat - ___  of Allah in creation", verse: "Indeed, in the creation of the heavens and earth are signs for those of understanding. (3:190)" },
        { id: 19, word: "GRAVE", hint: "Barzakh - life of the ___", verse: "Until, when death comes to one of them, he says, 'My Lord, send me back.' (23:99)" },
        { id: 20, word: "WOMEN", hint: "Surah An-Nisa is about ___", verse: "O mankind, fear your Lord, who created you from one soul. (4:1)" },
        { id: 21, word: "RIVER", hint: "Flows beneath gardens in Jannah", verse: "Gardens beneath which rivers flow, wherein they abide eternally. (2:25)" },
        { id: 22, word: "STONE", hint: "Idols were made of this", verse: "Do you worship that which you yourselves carve? (37:95)" },
        { id: 23, word: "FLOOD", hint: "Sent upon the people of Nuh", verse: "So We opened the gates of the heaven with rain pouring down. (54:11)" },
        { id: 24, word: "MOUNT", hint: "Sinai - where Musa spoke to Allah", verse: "And We called him from the right side of the Mount. (19:52)" },
        { id: 25, word: "HONEY", hint: "Comes from bees, mentioned as healing", verse: "There comes from their bellies a drink of varying colors in which there is healing. (16:69)" },
        { id: 26, word: "TRADE", hint: "Commerce that never fails with Allah", verse: "Those who recite the Book of Allah and establish prayer... hope for a trade that will never perish. (35:29)" },
        { id: 27, word: "CLOUD", hint: "Shades the Children of Israel", verse: "And We shaded you with clouds. (2:57)" },
        { id: 28, word: "SOULS", hint: "Nafs - every ___ shall taste death", verse: "Every soul will taste death. (3:185)" },
        { id: 29, word: "KINGS", hint: "Sulayman was one of these", verse: "Indeed, when kings enter a city, they ruin it. (27:34)" },
        { id: 30, word: "STEEL", hint: "Dhul-Qarnayn used this metal", verse: "Bring me sheets of iron... then blow... Bring me molten copper to pour over it. (18:96)" }
    ],

    // ==================== DEDUCTION PUZZLES ====================
    deduction: [
        {
            id: 1,
            title: "The Mystery Prophet",
            intro: "A great prophet faced a tremendous trial. Using the clues below, identify the prophet, the trial, the location, and the outcome.",
            clues: [
                "This prophet is one of the Ulul Azm (Prophets of strong will)",
                "His people rejected him for 950 years",
                "Allah commanded him to build something unusual",
                "Water played a central role in the outcome",
                "His own son refused to join him",
                "Animals came in pairs"
            ],
            categories: {
                prophet: { label: "Prophet", options: ["Nuh", "Ibrahim", "Musa", "Isa", "Muhammad"], answer: "Nuh" },
                trial: { label: "Trial", options: ["Fire", "Flood", "Exile", "Battle", "Famine"], answer: "Flood" },
                location: { label: "What he built", options: ["Mosque", "Ark", "Kaaba", "Well", "Tower"], answer: "Ark" },
                outcome: { label: "Outcome", options: ["Victory in battle", "New civilization", "Migration", "Miracle shown", "Earth renewed"], answer: "Earth renewed" }
            },
            verse: "And it was revealed to Nuh that, 'No one will believe from your people except those who have already believed, so do not be distressed by what they have been doing.' (11:36)",
            arabic: "وَأُوحِيَ إِلَىٰ نُوحٍ أَنَّهُ لَن يُؤْمِنَ مِن قَوْمِكَ إِلَّا مَن قَدْ آمَنَ فَلَا تَبْتَئِسْ بِمَا كَانُوا يَفْعَلُونَ"
        },
        {
            id: 2,
            title: "The Patient Prophet",
            intro: "This prophet was tested with extreme hardship but never lost faith. Identify the details of his story.",
            clues: [
                "He lost his wealth, his health, and his children",
                "His wife remained faithful to him throughout",
                "He is described as an excellent servant who always turned to Allah",
                "Allah told him to strike the ground with his foot for a cure",
                "His patience became proverbial",
                "He is mentioned in Surah Sad"
            ],
            categories: {
                prophet: { label: "Prophet", options: ["Ayyub", "Yaqub", "Zakariyya", "Shuayb", "Idris"], answer: "Ayyub" },
                trial: { label: "Main trial", options: ["Blindness", "Loss of everything", "Exile", "Imprisonment", "Mockery"], answer: "Loss of everything" },
                location: { label: "Cure involved", options: ["River water", "Spring from the ground", "Honey", "Zamzam", "Olive oil"], answer: "Spring from the ground" },
                outcome: { label: "Reward", options: ["Kingdom restored", "All blessings doubled", "Prophethood for son", "Long life", "Great wealth"], answer: "All blessings doubled" }
            },
            verse: "And remember Our servant Ayyub, when he called to his Lord, 'Indeed, adversity has touched me, and you are the Most Merciful of the merciful.' (21:83)",
            arabic: "وَأَيُّوبَ إِذْ نَادَىٰ رَبَّهُ أَنِّي مَسَّنِيَ الضُّرُّ وَأَنتَ أَرْحَمُ الرَّاحِمِينَ"
        },
        {
            id: 3,
            title: "The Miraculous Birth",
            intro: "An extraordinary birth took place by Allah's command. Identify the key elements of this story.",
            clues: [
                "The mother received food from Allah in her place of worship",
                "An angel appeared in human form to deliver the news",
                "The child spoke from the cradle",
                "The mother was told to shake a palm tree",
                "She was the only woman mentioned by name in the Quran",
                "Her son could heal the blind and raise the dead by Allah's permission"
            ],
            categories: {
                prophet: { label: "The Child", options: ["Yahya", "Isa", "Ismail", "Musa", "Ibrahim"], answer: "Isa" },
                trial: { label: "Mother's trial", options: ["Exile", "Poverty", "Accusations from people", "Illness", "War"], answer: "Accusations from people" },
                location: { label: "Where the birth occurred", options: ["Makkah", "Near a palm tree", "In Egypt", "In a cave", "By a river"], answer: "Near a palm tree" },
                outcome: { label: "Baby's first miracle", options: ["Moved a mountain", "Spoke from cradle", "Healed the sick", "Split water", "Glowed with light"], answer: "Spoke from cradle" }
            },
            verse: "She said, 'How can I have a boy while no man has touched me and I have not been unchaste?' He said, 'Thus it will be; your Lord says, It is easy for Me.' (19:20-21)",
            arabic: "قَالَتْ أَنَّىٰ يَكُونُ لِي غُلَامٌ وَلَمْ يَمْسَسْنِي بَشَرٌ وَلَمْ أَكُ بَغِيًّا"
        },
        {
            id: 4,
            title: "The Dream Interpreter",
            intro: "A young prophet's journey from betrayal to power, driven by his God-given gift.",
            clues: [
                "His brothers were jealous of him",
                "He was thrown into a dark place as a child",
                "He was falsely accused and imprisoned",
                "A king had a dream that no one could interpret",
                "He eventually became a minister of Egypt",
                "His father lost his sight from weeping"
            ],
            categories: {
                prophet: { label: "Prophet", options: ["Yusuf", "Musa", "Dawud", "Sulayman", "Idris"], answer: "Yusuf" },
                trial: { label: "First trial", options: ["Thrown in a well", "Cast into fire", "Set adrift in river", "Exiled to desert", "Sold as slave"], answer: "Thrown in a well" },
                location: { label: "Where he rose to power", options: ["Babylon", "Egypt", "Palestine", "Yemen", "Makkah"], answer: "Egypt" },
                outcome: { label: "Family reunion", options: ["Brothers came for grain", "Father came for trade", "Angel guided them", "King summoned them", "Dream revealed location"], answer: "Brothers came for grain" }
            },
            verse: "Indeed, I saw eleven stars and the sun and the moon; I saw them prostrating to me. (12:4)",
            arabic: "إِنِّي رَأَيْتُ أَحَدَ عَشَرَ كَوْكَبًا وَالشَّمْسَ وَالْقَمَرَ رَأَيْتُهُمْ لِي سَاجِدِينَ"
        },
        {
            id: 5,
            title: "The Friend of Allah",
            intro: "Known as Khalilullah, this prophet faced extreme tests of faith throughout his life.",
            clues: [
                "He questioned his people's worship of idols",
                "He was thrown into a fire but Allah saved him",
                "He was commanded to leave his wife and infant in a barren valley",
                "He was commanded to sacrifice his son",
                "He rebuilt a sacred house with his son",
                "He is the father of many prophets"
            ],
            categories: {
                prophet: { label: "Prophet", options: ["Ibrahim", "Nuh", "Musa", "Ismail", "Yaqub"], answer: "Ibrahim" },
                trial: { label: "Greatest test", options: ["The fire", "Sacrifice of son", "Leaving family", "Debating the king", "Smashing idols"], answer: "Sacrifice of son" },
                location: { label: "What he rebuilt", options: ["Al-Aqsa", "The Kaaba", "The Ark", "A temple", "A well"], answer: "The Kaaba" },
                outcome: { label: "Legacy", options: ["Father of prophets", "King of a nation", "Writer of scripture", "Builder of cities", "Teacher of angels"], answer: "Father of prophets" }
            },
            verse: "And who is better in religion than one who submits himself to Allah while being a doer of good and follows the religion of Ibrahim, inclining toward truth? And Allah took Ibrahim as an intimate friend. (4:125)",
            arabic: "وَاتَّخَذَ اللَّهُ إِبْرَاهِيمَ خَلِيلًا"
        },
        {
            id: 6,
            title: "The Speaker to Allah",
            intro: "This prophet had a direct conversation with Allah and led a nation to freedom.",
            clues: [
                "He was raised in the palace of his enemy",
                "He accidentally caused a man's death and fled",
                "Allah spoke to him near a burning bush",
                "He had a speech difficulty and asked for his brother's help",
                "His staff transformed into a serpent",
                "The sea was parted for him and his people"
            ],
            categories: {
                prophet: { label: "Prophet", options: ["Musa", "Ibrahim", "Harun", "Dawud", "Sulayman"], answer: "Musa" },
                trial: { label: "Enemy", options: ["Firaun", "Namrud", "Abu Jahl", "Jalut", "Qarun"], answer: "Firaun" },
                location: { label: "Where Allah spoke to him", options: ["Mount Sinai", "Cave of Hira", "Dome of Rock", "Makkah", "Madinah"], answer: "Mount Sinai" },
                outcome: { label: "Miracle at the sea", options: ["Sea froze", "Sea parted", "Bridge appeared", "Walked on water", "Sea dried up"], answer: "Sea parted" }
            },
            verse: "And I produced you for Myself. Go, you and your brother, with My signs and do not slacken in My remembrance. Go, both of you, to Firaun. Indeed, he has transgressed. (20:41-43)",
            arabic: "وَاصْطَنَعْتُكَ لِنَفْسِي اذْهَبْ أَنتَ وَأَخُوكَ بِآيَاتِي وَلَا تَنِيَا فِي ذِكْرِي"
        },
        {
            id: 7,
            title: "The Rescued Prophet",
            intro: "Swallowed by a great creature, this prophet called out to Allah from the depths of darkness.",
            clues: [
                "He was sent to the people of Nineveh",
                "He left his people in anger before receiving permission",
                "He drew lots on a ship and lost",
                "He was swallowed by a whale (large fish)",
                "He called out 'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers'",
                "His people eventually believed after he returned"
            ],
            categories: {
                prophet: { label: "Prophet", options: ["Yunus", "Nuh", "Ilyas", "Alyasa", "Lut"], answer: "Yunus" },
                trial: { label: "What swallowed him", options: ["Whale", "Sea serpent", "Giant wave", "Whirlpool", "Storm"], answer: "Whale" },
                location: { label: "His people's city", options: ["Nineveh", "Babylon", "Sodom", "Madyan", "Thamud"], answer: "Nineveh" },
                outcome: { label: "Result of his return", options: ["People believed", "People destroyed", "People migrated", "People divided", "People fought"], answer: "People believed" }
            },
            verse: "And he called out within the darknesses, 'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.' (21:87)",
            arabic: "فَنَادَىٰ فِي الظُّلُمَاتِ أَن لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ"
        },
        {
            id: 8,
            title: "The Wise King",
            intro: "A prophet-king who was given power over wind, jinn, and could understand the language of creatures.",
            clues: [
                "He inherited from his father, who was also a prophet-king",
                "He understood the speech of birds and ants",
                "He had power over the jinn who worked for him",
                "A bird (Hoopoe) brought him news of a queen",
                "The Queen of Sheba visited him",
                "He asked Allah for a kingdom that none after him would have"
            ],
            categories: {
                prophet: { label: "Prophet", options: ["Sulayman", "Dawud", "Yusuf", "Dhul-Qarnayn", "Luqman"], answer: "Sulayman" },
                trial: { label: "Special ability", options: ["Language of creatures", "Super strength", "Invisible", "Time travel", "Healing touch"], answer: "Language of creatures" },
                location: { label: "Famous visitor", options: ["Queen of Sheba", "Queen of Egypt", "King of Persia", "King of Rome", "Queen of Babylon"], answer: "Queen of Sheba" },
                outcome: { label: "His request to Allah", options: ["Unique kingdom", "Eternal life", "Many children", "Knowledge of all", "Power over death"], answer: "Unique kingdom" }
            },
            verse: "He said, 'My Lord, forgive me and grant me a kingdom such as will not belong to anyone after me. Indeed, You are the Bestower.' (38:35)",
            arabic: "قَالَ رَبِّ اغْفِرْ لِي وَهَبْ لِي مُلْكًا لَّا يَنبَغِي لِأَحَدٍ مِّن بَعْدِي ۖ إِنَّكَ أَنتَ الْوَهَّابُ"
        },
        {
            id: 9,
            title: "The Sleepers",
            intro: "A group of young believers fled persecution and experienced a miraculous event.",
            clues: [
                "They were youth who believed in their Lord",
                "They fled from a tyrannical ruler who persecuted believers",
                "They sought refuge in a cave",
                "Allah caused them to sleep for a very long time",
                "Their dog lay stretched at the entrance of the cave",
                "When they awoke, they thought they had slept only a day or less"
            ],
            categories: {
                prophet: { label: "Who were they", options: ["Sleepers of the Cave", "People of the Ditch", "Companions of the Elephant", "People of the Garden", "Army of Talut"], answer: "Sleepers of the Cave" },
                trial: { label: "How long they slept", options: ["100 years", "300+ years", "40 years", "7 years", "1000 years"], answer: "300+ years" },
                location: { label: "Where they hid", options: ["Cave", "Mountain top", "Underground tunnel", "Forest", "Island"], answer: "Cave" },
                outcome: { label: "Their companion", options: ["A dog", "A cat", "A bird", "A horse", "A sheep"], answer: "A dog" }
            },
            verse: "Do you think that the companions of the cave and the inscription were, among Our signs, a wonder? (18:9)",
            arabic: "أَمْ حَسِبْتَ أَنَّ أَصْحَابَ الْكَهْفِ وَالرَّقِيمِ كَانُوا مِنْ آيَاتِنَا عَجَبًا"
        },
        {
            id: 10,
            title: "The Night Journey",
            intro: "A miraculous journey that took place in a single night, covering an extraordinary distance.",
            clues: [
                "It began at Al-Masjid Al-Haram in Makkah",
                "The destination was Al-Masjid Al-Aqsa in Jerusalem",
                "The traveler then ascended through the seven heavens",
                "He met previous prophets at different levels of heaven",
                "The five daily prayers were prescribed during this journey",
                "The Quraysh refused to believe this account"
            ],
            categories: {
                prophet: { label: "Who traveled", options: ["Muhammad (SAW)", "Musa", "Ibrahim", "Isa", "Idris"], answer: "Muhammad (SAW)" },
                trial: { label: "Name of the journey", options: ["Isra and Mi'raj", "Hijrah", "Conquest of Makkah", "Treaty signing", "First revelation"], answer: "Isra and Mi'raj" },
                location: { label: "Destination on earth", options: ["Al-Aqsa", "Mount Sinai", "Madinah", "Cave of Hira", "Taif"], answer: "Al-Aqsa" },
                outcome: { label: "What was prescribed", options: ["Five daily prayers", "Fasting Ramadan", "Hajj pilgrimage", "Zakat", "Shahada"], answer: "Five daily prayers" }
            },
            verse: "Exalted is He who took His Servant by night from al-Masjid al-Haram to al-Masjid al-Aqsa, whose surroundings We have blessed. (17:1)",
            arabic: "سُبْحَانَ الَّذِي أَسْرَىٰ بِعَبْدِهِ لَيْلًا مِّنَ الْمَسْجِدِ الْحَرَامِ إِلَى الْمَسْجِدِ الْأَقْصَى الَّذِي بَارَكْنَا حَوْلَهُ"
        },
        {
            id: 11,
            title: "The Builder of the Barrier",
            intro: "A powerful ruler who traveled the earth and built a mighty structure to protect people.",
            clues: [
                "He traveled to where the sun sets and where it rises",
                "Allah established him on earth and gave him means to everything",
                "A people asked him for help against Yajuj and Majuj",
                "He built a barrier using iron and molten copper",
                "He attributed his power to his Lord, not himself",
                "The barrier will be broken near the end of times"
            ],
            categories: {
                prophet: { label: "Who was he", options: ["Dhul-Qarnayn", "Sulayman", "Dawud", "Talut", "Luqman"], answer: "Dhul-Qarnayn" },
                trial: { label: "Threat he addressed", options: ["Yajuj and Majuj", "Shaytan's army", "Great flood", "Dragon", "Invading kings"], answer: "Yajuj and Majuj" },
                location: { label: "Materials used", options: ["Iron and copper", "Stone and clay", "Gold and silver", "Wood and rope", "Bricks and mortar"], answer: "Iron and copper" },
                outcome: { label: "When it breaks", options: ["Near Day of Judgment", "After 1000 years", "Never", "When sun rises from west", "When trumpet blows"], answer: "Near Day of Judgment" }
            },
            verse: "He said, 'This is a mercy from my Lord. But when the promise of my Lord comes, He will make it level, and ever is the promise of my Lord true.' (18:98)",
            arabic: "قَالَ هَٰذَا رَحْمَةٌ مِّن رَّبِّي ۖ فَإِذَا جَاءَ وَعْدُ رَبِّي جَعَلَهُ دَكَّاءَ ۖ وَكَانَ وَعْدُ رَبِّي حَقًّا"
        },
        {
            id: 12,
            title: "The Elderly Father's Prayer",
            intro: "An elderly prophet prayed for an heir despite being very old, and Allah answered his prayer miraculously.",
            clues: [
                "He served in the temple (mihrab) and cared for Maryam",
                "He was elderly and his wife was barren",
                "He prayed secretly to Allah for an heir",
                "Allah gave him glad tidings of a son with a name never given before",
                "He was told he would not speak to people for three days as a sign",
                "His son would later confirm the coming of a Word from Allah"
            ],
            categories: {
                prophet: { label: "Prophet", options: ["Zakariyya", "Ibrahim", "Yaqub", "Shuayb", "Lut"], answer: "Zakariyya" },
                trial: { label: "His difficulty", options: ["Old age and barren wife", "Poverty", "Exile", "Blindness", "Enemy king"], answer: "Old age and barren wife" },
                location: { label: "Son's name", options: ["Yahya", "Isa", "Ismail", "Ishaq", "Yusuf"], answer: "Yahya" },
                outcome: { label: "Sign given to him", options: ["Could not speak for 3 days", "Staff bloomed", "Hair turned white", "Ground split", "Fire descended"], answer: "Could not speak for 3 days" }
            },
            verse: "So the angels called him while he was standing in prayer in the chamber, 'Indeed, Allah gives you good tidings of Yahya, confirming a word from Allah.' (3:39)",
            arabic: "فَنَادَتْهُ الْمَلَائِكَةُ وَهُوَ قَائِمٌ يُصَلِّي فِي الْمِحْرَابِ أَنَّ اللَّهَ يُبَشِّرُكَ بِيَحْيَىٰ مُصَدِّقًا بِكَلِمَةٍ مِّنَ اللَّهِ"
        },
        {
            id: 13,
            title: "The Great Sacrifice",
            intro: "A father was commanded in a dream to make the ultimate sacrifice, testing the limits of obedience.",
            clues: [
                "The father received this command through a recurring dream",
                "He consulted his son, who willingly agreed",
                "The son said 'You will find me patient, if Allah wills'",
                "When both submitted to Allah's will, the command was fulfilled",
                "A great ram was sent as a ransom",
                "This event is commemorated annually by Muslims"
            ],
            categories: {
                prophet: { label: "Father", options: ["Ibrahim", "Nuh", "Yaqub", "Ismail", "Adam"], answer: "Ibrahim" },
                trial: { label: "Son", options: ["Ismail", "Ishaq", "Yusuf", "Yahya", "Isa"], answer: "Ismail" },
                location: { label: "What replaced the sacrifice", options: ["A ram", "A camel", "A dove", "A bull", "A goat"], answer: "A ram" },
                outcome: { label: "Annual commemoration", options: ["Eid al-Adha", "Eid al-Fitr", "Ashura", "Mawlid", "Laylat al-Qadr"], answer: "Eid al-Adha" }
            },
            verse: "And when they had both submitted and he put him down upon his forehead, We called to him, 'O Ibrahim, you have fulfilled the vision.' (37:103-105)",
            arabic: "فَلَمَّا أَسْلَمَا وَتَلَّهُ لِلْجَبِينِ وَنَادَيْنَاهُ أَن يَا إِبْرَاهِيمُ قَدْ صَدَّقْتَ الرُّؤْيَا"
        },
        {
            id: 14,
            title: "The First Sin",
            intro: "The very first act of disobedience in creation and its consequences.",
            clues: [
                "It took place in a garden",
                "A forbidden tree was the center of the test",
                "Shaytan whispered and deceived them",
                "They covered themselves with leaves when they realized",
                "They were sent down to earth",
                "They repented and Allah forgave them"
            ],
            categories: {
                prophet: { label: "Who was tested", options: ["Adam and Hawwa", "Ibrahim", "Musa", "Dawud", "Nuh"], answer: "Adam and Hawwa" },
                trial: { label: "The forbidden thing", options: ["A tree", "A fruit", "A river", "A mountain", "A stone"], answer: "A tree" },
                location: { label: "Where it happened", options: ["Jannah (Garden)", "Earth", "A mountain", "A cave", "The sea"], answer: "Jannah (Garden)" },
                outcome: { label: "After repentance", options: ["Allah forgave them", "Punished forever", "Lost prophethood", "Became angels", "Returned to Garden"], answer: "Allah forgave them" }
            },
            verse: "Then Adam received from his Lord [some] words, and He accepted his repentance. Indeed, it is He who is the Accepting of Repentance, the Merciful. (2:37)",
            arabic: "فَتَلَقَّىٰ آدَمُ مِن رَّبِّهِ كَلِمَاتٍ فَتَابَ عَلَيْهِ ۚ إِنَّهُ هُوَ التَّوَّابُ الرَّحِيمُ"
        }
    ],

    // ==================== SCRAMBLE PUZZLES ====================
    scramble: [
        {
            id: 1,
            reference: "Surah Al-Fatiha (1:1)",
            words: ["In the name", "of Allah", "the Most Gracious", "the Most Merciful"],
            arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
            hint: "The opening verse of the Quran"
        },
        {
            id: 2,
            reference: "Surah Al-Ikhlas (112:1)",
            words: ["Say", "He is Allah", "the One"],
            arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ",
            hint: "A surah about the oneness of Allah"
        },
        {
            id: 3,
            reference: "Surah Al-Asr (103:1-2)",
            words: ["By time", "Indeed mankind", "is in loss"],
            arabic: "وَالْعَصْرِ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ",
            hint: "A short surah about time and loss"
        },
        {
            id: 4,
            reference: "Surah Al-Baqarah (2:255) - Opening",
            words: ["Allah", "there is no deity", "except Him", "the Ever-Living", "the Sustainer"],
            arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
            hint: "The beginning of Ayat al-Kursi"
        },
        {
            id: 5,
            reference: "Surah Ar-Ra'd (13:28)",
            words: ["Verily", "in the remembrance", "of Allah", "do hearts", "find rest"],
            arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
            hint: "About what brings peace to the heart"
        },
        {
            id: 6,
            reference: "Surah Al-Anbiya (21:30)",
            words: ["And We made", "from water", "every living", "thing"],
            arabic: "وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ",
            hint: "About the origin of life"
        },
        {
            id: 7,
            reference: "Surah Al-Baqarah (2:286)",
            words: ["Allah does not", "burden a soul", "beyond", "its capacity"],
            arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
            hint: "About Allah's mercy regarding burdens"
        },
        {
            id: 8,
            reference: "Surah Al-Isra (17:81)",
            words: ["Truth has come", "and falsehood", "has departed", "Indeed falsehood", "is bound to depart"],
            arabic: "جَاءَ الْحَقُّ وَزَهَقَ الْبَاطِلُ ۚ إِنَّ الْبَاطِلَ كَانَ زَهُوقًا",
            hint: "About truth overcoming falsehood"
        },
        {
            id: 9,
            reference: "Surah Al-Qadr (97:1)",
            words: ["Indeed We", "sent it down", "during the Night", "of Decree"],
            arabic: "إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ",
            hint: "About when the Quran was revealed"
        },
        {
            id: 10,
            reference: "Surah Al-Qamar (54:17)",
            words: ["And We have", "certainly made", "the Quran easy", "for remembrance"],
            arabic: "وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ",
            hint: "About the ease of the Quran"
        },
        {
            id: 11,
            reference: "Surah Al-Imran (3:185)",
            words: ["Every soul", "will taste", "death"],
            arabic: "كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ",
            hint: "An inevitable reality for every being"
        },
        {
            id: 12,
            reference: "Surah At-Talaq (65:3)",
            words: ["And whoever", "puts their trust", "in Allah", "He is sufficient", "for them"],
            arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
            hint: "About relying on Allah"
        },
        {
            id: 13,
            reference: "Surah An-Nahl (16:97)",
            words: ["Whoever does", "righteousness", "whether male", "or female", "while being a believer"],
            arabic: "مَنْ عَمِلَ صَالِحًا مِّن ذَكَرٍ أَوْ أُنثَىٰ وَهُوَ مُؤْمِنٌ",
            hint: "Good deeds accepted from all believers"
        },
        {
            id: 14,
            reference: "Surah Taha (20:114)",
            words: ["And say", "My Lord", "increase me", "in knowledge"],
            arabic: "وَقُل رَّبِّ زِدْنِي عِلْمًا",
            hint: "A prayer for knowledge"
        }
    ]
};

// Valid 5-letter words for Wordle validation
const VALID_WORDS = new Set([
    "quran","mercy","light","faith","peace","truth","heart","earth","angel","night",
    "water","trust","satan","month","judge","guide","signs","grave","women","river",
    "stone","flood","mount","honey","trade","cloud","souls","kings","steel","prayer",
    "about","above","abuse","acted","added","admit","adopt","adult","after","again",
    "agent","agree","ahead","alarm","album","alert","alien","align","alive","allow",
    "alone","along","alter","among","anger","angle","angry","apart","apple","apply",
    "arena","argue","arise","aside","asset","avoid","award","aware","awful","basic",
    "basis","beach","began","begin","being","below","bench","bible","birth","black",
    "blade","blame","blank","blast","blaze","bleed","blend","bless","blind","block",
    "blood","bloom","blown","board","bonus","bound","brain","brand","brave","bread",
    "break","breed","brick","brief","bring","broad","broke","brown","brush","buddy",
    "build","built","bunch","burst","buyer","cabin","cable","camel","carry","catch",
    "cause","chain","chair","chaos","charm","chart","chase","cheap","check","cheek",
    "chess","chest","chief","child","china","chunk","civil","claim","class","clean",
    "clear","climb","clock","close","cloth","coach","coast","color","comes","coral",
    "couch","could","count","court","cover","crack","craft","crash","crazy","cream",
    "crime","cross","crowd","crush","curve","cycle","daily","dance","death","debut",
    "delay","depth","devil","dirty","donor","doubt","draft","drain","drama","drawn",
    "dream","dress","drift","drink","drive","eager","early","eight","elect","elite",
    "email","empty","endow","enemy","enjoy","enter","equal","error","essay","event",
    "every","exact","exert","exile","exist","extra","faces","fatal","fault","feast",
    "fetch","fever","fiber","field","fifth","fifty","fight","final","first","fixed",
    "flame","flash","fleet","flesh","float","floor","fluid","focus","force","forge",
    "forth","forum","found","frame","frank","freed","fresh","front","frost","fruit",
    "given","glass","globe","going","grace","grade","grain","grand","grant","grass",
    "great","green","grief","gross","group","grown","guard","guess","guest","habit",
    "happy","harsh","haven","heads","hello","hence","horse","hotel","house","human",
    "humor","ideal","image","imply","index","indie","inner","input","issue","ivory",
    "japan","jewel","joint","juice","knock","known","label","labor","large","laser",
    "later","laugh","layer","learn","lease","least","leave","legal","level","life",
    "limit","links","lives","local","lodge","logic","loose","lover","lower","loyal",
    "lucky","lunch","magic","major","maker","manor","march","match","mayor","media",
    "mercy","metal","might","minor","minus","mixed","model","money","moral","motor",
    "mouse","mouth","moved","movie","music","myth","naked","naval","needs","nerve",
    "never","newly","noble","noise","north","noted","novel","nurse","occur","ocean",
    "offer","often","omega","onset","opens","opera","order","organ","other","ought",
    "outer","owner","oxide","paint","panel","panic","patch","pause","pearl","penny",
    "phase","phone","photo","piano","piece","pilot","pitch","pixel","place","plain",
    "plane","plant","plate","plaza","plead","pluck","plumb","plume","plump","point",
    "polar","pound","power","press","price","pride","prime","prince","print","prior",
    "prize","proof","proud","prove","psalm","pulse","pupil","queen","query","quest",
    "queue","quick","quiet","quite","quota","quote","radar","radio","raise","ranch",
    "range","rapid","ratio","reach","ready","realm","rebel","refer","reign","relax",
    "reply","rider","rifle","right","risky","rival","robot","rocky","roman","roots",
    "rough","round","route","royal","ruler","rural","saint","salad","scale","scare",
    "scene","scope","score","sense","serve","setup","seven","shade","shall","shame",
    "shape","share","sharp","shelf","shell","shift","shine","shirt","shock","shoot",
    "shore","short","shout","sight","sigma","silly","since","sixth","sixty","sized",
    "skill","slate","sleep","slice","slide","slope","small","smart","smile","smoke",
    "solar","solid","solve","sorry","sound","south","space","spare","speak","speed",
    "spend","spent","spike","spine","spoke","spray","squad","stack","staff","stage",
    "stake","stall","stamp","stand","start","state","steam","steep","steer","stick",
    "still","stock","store","storm","story","strap","straw","strip","stuck","study",
    "stuff","style","sugar","suite","super","surge","swamp","swear","sweep","sweet",
    "swept","swift","swing","sword","table","taken","taste","teach","teeth","tempt",
    "terms","thank","theme","there","thick","thing","think","third","those","three",
    "throw","tight","tired","title","today","token","total","touch","tough","tower",
    "toxic","trace","track","trail","train","trait","trash","treat","trend","trial",
    "tribe","trick","tried","troop","truck","truly","trump","trunk","twist","ultra",
    "uncle","under","union","unite","unity","until","upper","upset","urban","usage",
    "usual","valid","value","verse","video","vigor","virus","visit","vital","vivid",
    "vocal","voice","voter","waste","watch","widen","width","witch","world","worry",
    "worse","worst","worth","would","wound","wrath","write","wrong","wrote","yield",
    "young","youth","being","doing","going","stand","whole","alone","taken"
]);
