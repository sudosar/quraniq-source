/* ============================================
   QURANPUZZLE - DAILY PUZZLE DATA
   ============================================ */

const PUZZLES = {

    // ==================== CONNECTIONS PUZZLES ====================
    // Every tile is an actual Quranic word, phrase, or direct reference.
    // Groups are based on meaningful Islamic, spiritual, or logical connections.
    connections: [
        {
            id: 1,
            categories: [
                { name: "سور سُمّيت بحيوانات", nameEn: "Surahs named after animals", color: "yellow",
                    items: [{ar:"البقرة",en:"The Cow (2)"},{ar:"النحل",en:"The Bee (16)"},{ar:"النمل",en:"The Ant (27)"},{ar:"العنكبوت",en:"The Spider (29)"}],
                    verse: {ayah:"وَأَوْحَىٰ رَبُّكَ إِلَى النَّحْلِ أَنِ اتَّخِذِي مِنَ الْجِبَالِ بُيُوتًا", en:"And your Lord inspired the bee: 'Make your homes in the mountains.'", ref:"16:68"}},
                { name: "مواد خُلقت منها الكائنات", nameEn: "Materials beings were created from", color: "green",
                    items: [{ar:"طين",en:"Clay (humans)"},{ar:"نار",en:"Fire (jinn)"},{ar:"نور",en:"Light (angels)"},{ar:"ماء",en:"Water (all living)"}],
                    verse: {ayah:"خَلَقَ الْإِنسَانَ مِن صَلْصَالٍ كَالْفَخَّارِ ۝ وَخَلَقَ الْجَانَّ مِن مَّارِجٍ مِّن نَّارٍ", en:"He created man from clay like pottery, and He created the jinn from a smokeless flame of fire.", ref:"55:14-15"}},
                { name: "أسماء الله تنتهي بـ «يم»", nameEn: "Names of Allah ending in -eem", color: "blue",
                    items: [{ar:"الرحيم",en:"The Most Merciful"},{ar:"العليم",en:"The All-Knowing"},{ar:"الحكيم",en:"The All-Wise"},{ar:"الكريم",en:"The Most Generous"}],
                    verse: {ayah:"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", en:"In the name of Allah, the Most Gracious, the Most Merciful.", ref:"1:1"}},
                { name: "أنبياء ذُكروا في سورة مريم", nameEn: "Prophets mentioned in Surah Maryam", color: "purple",
                    items: [{ar:"عيسى",en:"Isa (AS)"},{ar:"يحيى",en:"Yahya (AS)"},{ar:"إبراهيم",en:"Ibrahim (AS)"},{ar:"موسى",en:"Musa (AS)"}],
                    verse: {ayah:"وَاذْكُرْ فِي الْكِتَابِ مَرْيَمَ إِذِ انتَبَذَتْ مِنْ أَهْلِهَا مَكَانًا شَرْقِيًّا", en:"And mention in the Book, Maryam, when she withdrew from her family to a place facing east.", ref:"19:16"}}
            ]
        },
        {
            id: 2,
            categories: [
                { name: "أشياء أقسم الله بها", nameEn: "Things Allah swears by in the Quran", color: "yellow",
                    items: [{ar:"التين",en:"The Fig (95:1)"},{ar:"العصر",en:"Time (103:1)"},{ar:"القلم",en:"The Pen (68:1)"},{ar:"الفجر",en:"The Dawn (89:1)"}],
                    verse: {ayah:"وَالتِّينِ وَالزَّيْتُونِ ۝ وَطُورِ سِينِينَ ۝ وَهَٰذَا الْبَلَدِ الْأَمِينِ", en:"By the fig and the olive, and Mount Sinai, and this secure city.", ref:"95:1-3"}},
                { name: "أركان الإسلام في القرآن", nameEn: "Pillars of Islam in the Quran", color: "green",
                    items: [{ar:"الصلاة",en:"Prayer"},{ar:"الزكاة",en:"Almsgiving"},{ar:"الصيام",en:"Fasting"},{ar:"الحج",en:"Pilgrimage"}],
                    verse: {ayah:"وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ", en:"And establish prayer and give zakah and bow with those who bow.", ref:"2:43"}},
                { name: "أمم أُهلكت", nameEn: "Destroyed nations in the Quran", color: "blue",
                    items: [{ar:"عاد",en:"Aad"},{ar:"ثمود",en:"Thamud"},{ar:"مدين",en:"Madyan"},{ar:"سبأ",en:"Saba"}],
                    verse: {ayah:"وَعَادًا وَثَمُودَ وَأَصْحَابَ الرَّسِّ وَقُرُونًا بَيْنَ ذَٰلِكَ كَثِيرًا", en:"And Aad and Thamud and the companions of the well and many generations between them.", ref:"25:38"}},
                { name: "أسماء الجنة في القرآن", nameEn: "Names of Paradise in the Quran", color: "purple",
                    items: [{ar:"الفردوس",en:"Al-Firdaws"},{ar:"عدن",en:"Adn (Eden)"},{ar:"دار السلام",en:"Abode of Peace"},{ar:"النعيم",en:"An-Na'eem"}],
                    verse: {ayah:"إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ كَانَتْ لَهُمْ جَنَّاتُ الْفِرْدَوْسِ نُزُلًا", en:"Indeed, those who believed and did righteous deeds — the Gardens of Firdaws will be their lodging.", ref:"18:107"}}
            ]
        },
        {
            id: 3,
            categories: [
                { name: "عناصر قصة يوسف", nameEn: "Elements of Prophet Yusuf's story", color: "yellow",
                    items: [{ar:"الرؤيا",en:"The Dream"},{ar:"الجُبّ",en:"The Well"},{ar:"القميص",en:"The Shirt"},{ar:"السجن",en:"The Prison"}],
                    verse: {ayah:"إِذْ قَالَ يُوسُفُ لِأَبِيهِ يَا أَبَتِ إِنِّي رَأَيْتُ أَحَدَ عَشَرَ كَوْكَبًا", en:"When Yusuf said to his father: 'O my father, indeed I saw eleven stars.'", ref:"12:4"}},
                { name: "معجزات موسى عليه السلام", nameEn: "Miracles of Musa (AS)", color: "green",
                    items: [{ar:"العصا",en:"The Staff"},{ar:"اليد البيضاء",en:"The Glowing Hand"},{ar:"الطوفان",en:"The Flood"},{ar:"الجراد",en:"The Locusts"}],
                    verse: {ayah:"فَأَلْقَىٰ عَصَاهُ فَإِذَا هِيَ ثُعْبَانٌ مُّبِينٌ", en:"So he threw his staff, and suddenly it was a serpent, manifest.", ref:"7:107"}},
                { name: "أوصاف القرآن لنفسه", nameEn: "The Quran's descriptions of itself", color: "blue",
                    items: [{ar:"هدى",en:"Guidance"},{ar:"شفاء",en:"Healing"},{ar:"بيان",en:"Clear Explanation"},{ar:"فرقان",en:"Criterion"}],
                    verse: {ayah:"هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ مِّنَ الْهُدَىٰ وَالْفُرْقَانِ", en:"A guidance for the people and clear proofs of guidance and criterion.", ref:"2:185"}},
                { name: "ألوان ذُكرت في القرآن", nameEn: "Colors mentioned in the Quran", color: "purple",
                    items: [{ar:"أبيض",en:"White"},{ar:"أخضر",en:"Green"},{ar:"أصفر",en:"Yellow"},{ar:"أسود",en:"Black"}],
                    verse: {ayah:"وَمِنَ الْجِبَالِ جُدَدٌ بِيضٌ وَحُمْرٌ مُّخْتَلِفٌ أَلْوَانُهَا وَغَرَابِيبُ سُودٌ", en:"And in the mountains are tracts, white and red of varying shades and black.", ref:"35:27"}}
            ]
        },
        {
            id: 4,
            categories: [
                { name: "قصص سورة الكهف الأربع", nameEn: "Four stories of Surah Al-Kahf", color: "yellow",
                    items: [{ar:"أصحاب الكهف",en:"Sleepers of the Cave"},{ar:"صاحب الجنتين",en:"Owner of Two Gardens"},{ar:"موسى والخضر",en:"Musa and Al-Khidr"},{ar:"ذو القرنين",en:"Dhul-Qarnayn"}],
                    verse: {ayah:"أَمْ حَسِبْتَ أَنَّ أَصْحَابَ الْكَهْفِ وَالرَّقِيمِ كَانُوا مِنْ آيَاتِنَا عَجَبًا", en:"Or did you think that the companions of the cave and the inscription were wonders among Our signs?", ref:"18:9"}},
                { name: "ملائكة ذُكروا بالاسم", nameEn: "Angels mentioned by name", color: "green",
                    items: [{ar:"جبريل",en:"Jibreel"},{ar:"ميكائيل",en:"Mikael"},{ar:"مالك",en:"Malik (of Hellfire)"},{ar:"هاروت",en:"Harut"}],
                    verse: {ayah:"قُلْ مَن كَانَ عَدُوًّا لِّجِبْرِيلَ فَإِنَّهُ نَزَّلَهُ عَلَىٰ قَلْبِكَ بِإِذْنِ اللَّهِ", en:"Say: Whoever is an enemy to Jibreel — it is he who brought it down upon your heart by permission of Allah.", ref:"2:97"}},
                { name: "فواكه ذُكرت في القرآن", nameEn: "Fruits mentioned in the Quran", color: "blue",
                    items: [{ar:"تين",en:"Fig"},{ar:"زيتون",en:"Olive"},{ar:"رمان",en:"Pomegranate"},{ar:"عنب",en:"Grape"}],
                    verse: {ayah:"وَالتِّينِ وَالزَّيْتُونِ", en:"By the fig and the olive.", ref:"95:1"}},
                { name: "سور من آخر القرآن", nameEn: "Surahs from the end of the Quran", color: "purple",
                    items: [{ar:"الفلق",en:"Al-Falaq (113)"},{ar:"الناس",en:"An-Nas (114)"},{ar:"الإخلاص",en:"Al-Ikhlas (112)"},{ar:"الكوثر",en:"Al-Kawthar (108)"}],
                    verse: {ayah:"قُلْ هُوَ اللَّهُ أَحَدٌ", en:"Say: He is Allah, the One.", ref:"112:1"}}
            ]
        },
        {
            id: 5,
            categories: [
                { name: "أحداث يوم القيامة", nameEn: "Events of the Day of Judgment", color: "yellow",
                    items: [{ar:"الصور",en:"The Trumpet"},{ar:"الحساب",en:"The Reckoning"},{ar:"الميزان",en:"The Scale"},{ar:"الصراط",en:"The Bridge"}],
                    verse: {ayah:"وَنَضَعُ الْمَوَازِينَ الْقِسْطَ لِيَوْمِ الْقِيَامَةِ فَلَا تُظْلَمُ نَفْسٌ شَيْئًا", en:"And We place the scales of justice for the Day of Resurrection, so no soul will be treated unjustly.", ref:"21:47"}},
                { name: "أولو العزم من الرسل", nameEn: "Prophets of strong will (Ulul Azm)", color: "green",
                    items: [{ar:"نوح",en:"Nuh"},{ar:"إبراهيم",en:"Ibrahim"},{ar:"موسى",en:"Musa"},{ar:"عيسى",en:"Isa"}],
                    verse: {ayah:"فَاصْبِرْ كَمَا صَبَرَ أُولُو الْعَزْمِ مِنَ الرُّسُلِ", en:"So be patient as those of determination among the messengers were patient.", ref:"46:35"}},
                { name: "آداب سورة الحجرات", nameEn: "Ethics commanded in Surah Al-Hujurat", color: "blue",
                    items: [{ar:"تبيّنوا",en:"Verify (49:6)"},{ar:"لا تجسسوا",en:"Do not spy (49:12)"},{ar:"لا تنابزوا",en:"Do not insult (49:11)"},{ar:"لا يسخر",en:"Do not mock (49:11)"}],
                    verse: {ayah:"يَا أَيُّهَا الَّذِينَ آمَنُوا إِن جَاءَكُمْ فَاسِقٌ بِنَبَإٍ فَتَبَيَّنُوا", en:"O you who believe, if a sinful person comes to you with news, verify it.", ref:"49:6"}},
                { name: "أجرام سماوية أقسم الله بها", nameEn: "Celestial bodies Allah swears by", color: "purple",
                    items: [{ar:"الشمس",en:"The Sun (91:1)"},{ar:"القمر",en:"The Moon (91:2)"},{ar:"النجم",en:"The Star (53:1)"},{ar:"البروج",en:"The Constellations (85:1)"}],
                    verse: {ayah:"وَالشَّمْسِ وَضُحَاهَا ۝ وَالْقَمَرِ إِذَا تَلَاهَا", en:"By the sun and its brightness, and the moon as it follows it.", ref:"91:1-2"}}
            ]
        },
        {
            id: 6,
            categories: [
                { name: "أشياء ذُكرت في سورة البقرة", nameEn: "Things mentioned in Surah Al-Baqarah", color: "yellow",
                    items: [{ar:"البقرة",en:"The Cow"},{ar:"التابوت",en:"The Ark"},{ar:"العرش",en:"The Throne"},{ar:"المن والسلوى",en:"Manna and Quails"}],
                    verse: {ayah:"إِنَّ اللَّهَ يَأْمُرُكُمْ أَن تَذْبَحُوا بَقَرَةً", en:"Indeed, Allah commands you to slaughter a cow.", ref:"2:67"}},
                { name: "ابتلاءات إبراهيم عليه السلام", nameEn: "Trials of Prophet Ibrahim (AS)", color: "green",
                    items: [{ar:"النار",en:"The Fire"},{ar:"ذبح الابن",en:"Sacrifice of his son"},{ar:"هجرة الأهل",en:"Leaving family in desert"},{ar:"بناء الكعبة",en:"Building the Ka'bah"}],
                    verse: {ayah:"قُلْنَا يَا نَارُ كُونِي بَرْدًا وَسَلَامًا عَلَىٰ إِبْرَاهِيمَ", en:"We said: O fire, be coolness and safety upon Ibrahim.", ref:"21:69"}},
                { name: "معادن ذُكرت في القرآن", nameEn: "Metals mentioned in the Quran", color: "blue",
                    items: [{ar:"حديد",en:"Iron"},{ar:"ذهب",en:"Gold"},{ar:"فضة",en:"Silver"},{ar:"نحاس",en:"Copper"}],
                    verse: {ayah:"وَأَنزَلْنَا الْحَدِيدَ فِيهِ بَأْسٌ شَدِيدٌ وَمَنَافِعُ لِلنَّاسِ", en:"And We sent down iron, wherein is great military might and benefits for the people.", ref:"57:25"}},
                { name: "موضوعات سورة الرحمن", nameEn: "Themes of Surah Ar-Rahman", color: "purple",
                    items: [{ar:"علّم القرآن",en:"Taught the Quran"},{ar:"مرج البحرين",en:"Two seas meeting"},{ar:"فبأي آلاء",en:"Which favors will you deny?"},{ar:"اللؤلؤ والمرجان",en:"Pearls and coral"}],
                    verse: {ayah:"الرَّحْمَٰنُ ۝ عَلَّمَ الْقُرْآنَ ۝ خَلَقَ الْإِنسَانَ ۝ عَلَّمَهُ الْبَيَانَ", en:"The Most Merciful. Taught the Quran. Created man. Taught him eloquence.", ref:"55:1-4"}}
            ]
        },
        {
            id: 7,
            categories: [
                { name: "نساء ذُكرن في القرآن", nameEn: "Women referenced in the Quran", color: "yellow",
                    items: [{ar:"مريم",en:"Maryam"},{ar:"آسية",en:"Asiya (wife of Fir'awn)"},{ar:"أم موسى",en:"Mother of Musa"},{ar:"امرأة العزيز",en:"Wife of Al-Aziz"}],
                    verse: {ayah:"وَإِذْ قَالَتِ الْمَلَائِكَةُ يَا مَرْيَمُ إِنَّ اللَّهَ اصْطَفَاكِ وَطَهَّرَكِ", en:"And when the angels said: O Maryam, indeed Allah has chosen you and purified you.", ref:"3:42"}},
                { name: "صفات المؤمنين في سورة المؤمنون", nameEn: "Qualities of believers (Al-Mu'minun)", color: "green",
                    items: [{ar:"خاشعون في صلاتهم",en:"Humble in prayer"},{ar:"معرضون عن اللغو",en:"Avoid vain talk"},{ar:"حافظون لأماناتهم",en:"Guard their trusts"},{ar:"فاعلون للزكاة",en:"Pay Zakat"}],
                    verse: {ayah:"قَدْ أَفْلَحَ الْمُؤْمِنُونَ ۝ الَّذِينَ هُمْ فِي صَلَاتِهِمْ خَاشِعُونَ", en:"Certainly the believers have succeeded — those who are humble in their prayer.", ref:"23:1-2"}},
                { name: "أمثال في القرآن", nameEn: "Parables/similes in the Quran", color: "blue",
                    items: [{ar:"كمشكاة",en:"Like a niche (24:35)"},{ar:"كالعنكبوت",en:"Like a spider (29:41)"},{ar:"كالحمار",en:"Like a donkey (62:5)"},{ar:"كالكلب",en:"Like a dog (7:176)"}],
                    verse: {ayah:"مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ", en:"The example of His light is like a niche within which is a lamp.", ref:"24:35"}},
                { name: "أعداد محددة في القرآن", nameEn: "Specific numbers in the Quran", color: "purple",
                    items: [{ar:"سبع سماوات",en:"Seven heavens"},{ar:"اثنا عشر نقيبا",en:"Twelve chiefs"},{ar:"أربعين ليلة",en:"Forty nights"},{ar:"تسعة عشر",en:"Nineteen (74:30)"}],
                    verse: {ayah:"اللَّهُ الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ وَمِنَ الْأَرْضِ مِثْلَهُنَّ", en:"It is Allah who created seven heavens and of the earth, the like of them.", ref:"65:12"}}
            ]
        },
        {
            id: 8,
            categories: [
                { name: "مشاهد من قصة موسى والخضر", nameEn: "Scenes from Musa and Al-Khidr", color: "yellow",
                    items: [{ar:"السفينة",en:"The Ship (18:71)"},{ar:"الغلام",en:"The Boy (18:74)"},{ar:"الجدار",en:"The Wall (18:77)"},{ar:"مجمع البحرين",en:"Junction of two seas (18:60)"}],
                    verse: {ayah:"قَالَ لَهُ مُوسَىٰ هَلْ أَتَّبِعُكَ عَلَىٰ أَن تُعَلِّمَنِ مِمَّا عُلِّمْتَ رُشْدًا", en:"Musa said to him: May I follow you so that you teach me from what you have been taught?", ref:"18:66"}},
                { name: "أفعال الشيطان في القرآن", nameEn: "Actions of Shaytan in the Quran", color: "green",
                    items: [{ar:"الوسوسة",en:"Whispering"},{ar:"تزيين المعاصي",en:"Beautifying sins"},{ar:"وعد الفقر",en:"Promising poverty"},{ar:"الأمر بالفحشاء",en:"Commanding indecency"}],
                    verse: {ayah:"الشَّيْطَانُ يَعِدُكُمُ الْفَقْرَ وَيَأْمُرُكُم بِالْفَحْشَاءِ", en:"Satan threatens you with poverty and orders you to immorality.", ref:"2:268"}},
                { name: "الحروف المقطعة", nameEn: "Huruf Muqatta'at (opening letters)", color: "blue",
                    items: [{ar:"الم",en:"Alif-Lam-Mim"},{ar:"يس",en:"Ya-Sin"},{ar:"طه",en:"Ta-Ha"},{ar:"حم",en:"Ha-Mim"}],
                    verse: {ayah:"الم ۝ ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ", en:"Alif-Lam-Mim. This is the Book about which there is no doubt.", ref:"2:1-2"}},
                { name: "أدعية الأنبياء في القرآن", nameEn: "Prophetic duas in the Quran", color: "purple",
                    items: [{ar:"رب اغفر لي",en:"My Lord, forgive me (Nuh)"},{ar:"لا إله إلا أنت سبحانك",en:"None worthy but You (Yunus)"},{ar:"رب اشرح لي صدري",en:"Expand my chest (Musa)"},{ar:"رب هب لي حكما",en:"Grant me wisdom (Ibrahim)"}],
                    verse: {ayah:"رَبِّ اشْرَحْ لِي صَدْرِي ۝ وَيَسِّرْ لِي أَمْرِي", en:"My Lord, expand for me my chest, and ease for me my task.", ref:"20:25-26"}}
            ]
        },
        {
            id: 9,
            categories: [
                { name: "عبارات من آية الكرسي", nameEn: "Phrases from Ayat al-Kursi (2:255)", color: "yellow",
                    items: [{ar:"الحي القيوم",en:"The Ever-Living, Self-Sustaining"},{ar:"لا تأخذه سنة ولا نوم",en:"Neither drowsiness nor sleep"},{ar:"وسع كرسيه",en:"His Kursi extends over all"},{ar:"ولا يئوده حفظهما",en:"Guarding them does not tire Him"}],
                    verse: {ayah:"اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ", en:"Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence.", ref:"2:255"}},
                { name: "عبارات من سورة الفاتحة", nameEn: "Phrases from Surah Al-Fatiha", color: "green",
                    items: [{ar:"بسم الله",en:"In the name of Allah"},{ar:"الحمد لله",en:"All praise is for Allah"},{ar:"مالك يوم الدين",en:"Master of the Day of Judgment"},{ar:"اهدنا الصراط المستقيم",en:"Guide us to the straight path"}],
                    verse: {ayah:"الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", en:"All praise is due to Allah, Lord of the worlds.", ref:"1:2"}},
                { name: "وصايا لقمان لابنه", nameEn: "Luqman's advice to his son (31:13-19)", color: "blue",
                    items: [{ar:"لا تشرك بالله",en:"Do not associate with Allah"},{ar:"أقم الصلاة",en:"Establish prayer"},{ar:"اصبر على ما أصابك",en:"Be patient with what befalls you"},{ar:"لا تمش في الأرض مرحا",en:"Do not walk arrogantly"}],
                    verse: {ayah:"يَا بُنَيَّ لَا تُشْرِكْ بِاللَّهِ إِنَّ الشِّرْكَ لَظُلْمٌ عَظِيمٌ", en:"O my son, do not associate anything with Allah. Indeed, association is great injustice.", ref:"31:13"}},
                { name: "أشياء خُلقت أزواجاً", nameEn: "Things created in pairs (36:36)", color: "purple",
                    items: [{ar:"الليل والنهار",en:"Night and Day"},{ar:"الذكر والأنثى",en:"Male and Female"},{ar:"السماء والأرض",en:"Heaven and Earth"},{ar:"البر والبحر",en:"Land and Sea"}],
                    verse: {ayah:"سُبْحَانَ الَّذِي خَلَقَ الْأَزْوَاجَ كُلَّهَا مِمَّا تُنبِتُ الْأَرْضُ وَمِنْ أَنفُسِهِمْ", en:"Exalted is He who created all pairs — from what the earth grows and from themselves.", ref:"36:36"}}
            ]
        },
        {
            id: 10,
            categories: [
                { name: "أقسام في سورة الشمس", nameEn: "Oaths in Surah Ash-Shams (91:1-4)", color: "yellow",
                    items: [{ar:"والشمس وضحاها",en:"By the sun and its brightness"},{ar:"والقمر إذا تلاها",en:"By the moon as it follows"},{ar:"والنهار إذا جلاها",en:"By the day as it reveals"},{ar:"والليل إذا يغشاها",en:"By the night as it covers"}],
                    verse: {ayah:"وَالشَّمْسِ وَضُحَاهَا ۝ وَالْقَمَرِ إِذَا تَلَاهَا", en:"By the sun and its brightness, and by the moon as it follows it.", ref:"91:1-2"}},
                { name: "مراحل خلق الإنسان", nameEn: "Stages of human creation (23:12-14)", color: "green",
                    items: [{ar:"طين",en:"Clay"},{ar:"نطفة",en:"Drop of fluid"},{ar:"علقة",en:"Clinging clot"},{ar:"مضغة",en:"Lump of flesh"}],
                    verse: {ayah:"وَلَقَدْ خَلَقْنَا الْإِنسَانَ مِن سُلَالَةٍ مِّن طِينٍ", en:"And certainly We created man from an extract of clay.", ref:"23:12"}},
                { name: "عقوبات الأمم السابقة", nameEn: "Punishments of past nations", color: "blue",
                    items: [{ar:"الطوفان",en:"The Flood (Nuh)"},{ar:"الريح الصرصر",en:"The Howling Wind (Aad)"},{ar:"الصيحة",en:"The Blast (Thamud)"},{ar:"الخسف",en:"The Earth Swallowed (Qarun)"}],
                    verse: {ayah:"فَكُلًّا أَخَذْنَا بِذَنبِهِ فَمِنْهُم مَّنْ أَرْسَلْنَا عَلَيْهِ حَاصِبًا", en:"So each We seized for his sin; among them were those upon whom We sent a storm of stones.", ref:"29:40"}},
                { name: "أسماء سورة الفاتحة", nameEn: "Names/titles of Surah Al-Fatiha", color: "purple",
                    items: [{ar:"أم الكتاب",en:"Mother of the Book"},{ar:"السبع المثاني",en:"Seven Oft-Repeated"},{ar:"الحمد",en:"The Praise"},{ar:"فاتحة الكتاب",en:"Opening of the Book"}],
                    verse: {ayah:"وَلَقَدْ آتَيْنَاكَ سَبْعًا مِّنَ الْمَثَانِي وَالْقُرْآنَ الْعَظِيمَ", en:"And We have certainly given you seven of the oft-repeated and the great Quran.", ref:"15:87"}}
            ]
        },
        {
            id: 11,
            categories: [
                { name: "الكتب السماوية في القرآن", nameEn: "Divine scriptures in the Quran", color: "yellow",
                    items: [{ar:"القرآن",en:"The Quran"},{ar:"التوراة",en:"The Torah"},{ar:"الزبور",en:"The Psalms"},{ar:"الإنجيل",en:"The Gospel"}],
                    verse: {ayah:"نَزَّلَ عَلَيْكَ الْكِتَابَ بِالْحَقِّ مُصَدِّقًا لِّمَا بَيْنَ يَدَيْهِ وَأَنزَلَ التَّوْرَاةَ وَالْإِنجِيلَ", en:"He sent down the Book in truth, confirming what was before it, and He sent down the Torah and the Gospel.", ref:"3:3"}},
                { name: "حقوق أكّد عليها القرآن", nameEn: "Rights emphasized in the Quran", color: "green",
                    items: [{ar:"حق الوالدين",en:"Rights of parents"},{ar:"حق اليتامى",en:"Rights of orphans"},{ar:"حق الجار",en:"Rights of neighbors"},{ar:"حق ابن السبيل",en:"Rights of travelers"}],
                    verse: {ayah:"وَبِالْوَالِدَيْنِ إِحْسَانًا وَبِذِي الْقُرْبَىٰ وَالْيَتَامَىٰ وَالْمَسَاكِينِ", en:"And to parents do good, and to relatives, orphans, and the needy.", ref:"2:83"}},
                { name: "أسماء جهنم في القرآن", nameEn: "Names of Hellfire in the Quran", color: "blue",
                    items: [{ar:"جهنم",en:"Jahannam"},{ar:"سعير",en:"Sa'ir (Blazing Fire)"},{ar:"الحطمة",en:"Al-Hutamah (Crusher)"},{ar:"سقر",en:"Saqar"}],
                    verse: {ayah:"كَلَّا لَيُنبَذَنَّ فِي الْحُطَمَةِ ۝ وَمَا أَدْرَاكَ مَا الْحُطَمَةُ", en:"No! He will surely be thrown into the Crusher. And what can make you know what the Crusher is?", ref:"104:4-5"}},
                { name: "حيوانات لها دور في القصص", nameEn: "Animals with narrative roles in the Quran", color: "purple",
                    items: [{ar:"الهدهد",en:"Hoopoe (Sulayman)"},{ar:"الغراب",en:"Crow (Qabil)"},{ar:"الحوت",en:"Whale (Yunus)"},{ar:"كلب أصحاب الكهف",en:"Dog (Cave companions)"}],
                    verse: {ayah:"فَبَعَثَ اللَّهُ غُرَابًا يَبْحَثُ فِي الْأَرْضِ لِيُرِيَهُ كَيْفَ يُوَارِي سَوْءَةَ أَخِيهِ", en:"Then Allah sent a crow digging in the ground to show him how to hide the body of his brother.", ref:"5:31"}}
            ]
        },
        {
            id: 12,
            categories: [
                { name: "أشياء مباركة في القرآن", nameEn: "Blessed things in the Quran", color: "yellow",
                    items: [{ar:"ليلة القدر",en:"Night of Qadr"},{ar:"شجرة الزيتون",en:"Olive tree"},{ar:"مكة",en:"Makkah"},{ar:"ماء المطر",en:"Rain water"}],
                    verse: {ayah:"إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ", en:"Indeed, We sent it down during the Night of Decree.", ref:"97:1"}},
                { name: "أعمال تكفّر الذنوب", nameEn: "Actions that expiate sins", color: "green",
                    items: [{ar:"التوبة",en:"Repentance"},{ar:"الصدقة",en:"Charity"},{ar:"الاستغفار",en:"Seeking forgiveness"},{ar:"الحسنات يذهبن السيئات",en:"Good deeds erase bad (11:114)"}],
                    verse: {ayah:"إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ", en:"Indeed, good deeds do away with misdeeds.", ref:"11:114"}},
                { name: "طغاة وأعداء الأنبياء", nameEn: "Tyrants and enemies of prophets", color: "blue",
                    items: [{ar:"فرعون",en:"Fir'awn (vs. Musa)"},{ar:"نمرود",en:"Namrud (vs. Ibrahim)"},{ar:"أبو لهب",en:"Abu Lahab (vs. Muhammad)"},{ar:"قارون",en:"Qarun (arrogant rich)"}],
                    verse: {ayah:"إِنَّ فِرْعَوْنَ عَلَا فِي الْأَرْضِ وَجَعَلَ أَهْلَهَا شِيَعًا", en:"Indeed, Pharaoh exalted himself in the land and made its people into factions.", ref:"28:4"}},
                { name: "سور تبدأ بـ «قل»", nameEn: "Surahs that begin with 'Qul' (Say)", color: "purple",
                    items: [{ar:"الكافرون",en:"Al-Kafirun (109)"},{ar:"الإخلاص",en:"Al-Ikhlas (112)"},{ar:"الفلق",en:"Al-Falaq (113)"},{ar:"الناس",en:"An-Nas (114)"}],
                    verse: {ayah:"قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ", en:"Say: I seek refuge in the Lord of daybreak.", ref:"113:1"}}
            ]
        },
        {
            id: 13,
            categories: [
                { name: "معجزات أنبياء مختلفين", nameEn: "Miracles of different prophets", color: "yellow",
                    items: [{ar:"عصا موسى",en:"Staff of Musa"},{ar:"ناقة صالح",en:"She-camel of Salih"},{ar:"طير عيسى",en:"Birds of Isa"},{ar:"سفينة نوح",en:"Ark of Nuh"}],
                    verse: {ayah:"وَلَقَدْ آتَيْنَا مُوسَى تِسْعَ آيَاتٍ بَيِّنَاتٍ", en:"And We certainly gave Musa nine evident signs.", ref:"17:101"}},
                { name: "أسماء القرآن في القرآن", nameEn: "Names of the Quran within itself", color: "green",
                    items: [{ar:"الفرقان",en:"The Criterion"},{ar:"الذكر",en:"The Reminder"},{ar:"الكتاب",en:"The Book"},{ar:"التنزيل",en:"The Revelation"}],
                    verse: {ayah:"تَبَارَكَ الَّذِي نَزَّلَ الْفُرْقَانَ عَلَىٰ عَبْدِهِ", en:"Blessed is He who sent down the Criterion upon His Servant.", ref:"25:1"}},
                { name: "أماكن مقدسة في القرآن", nameEn: "Sacred places in the Quran", color: "blue",
                    items: [{ar:"المسجد الحرام",en:"The Sacred Mosque"},{ar:"المسجد الأقصى",en:"Al-Aqsa Mosque"},{ar:"الطور",en:"Mount Tur (Sinai)"},{ar:"بكة",en:"Bakkah (Makkah)"}],
                    verse: {ayah:"سُبْحَانَ الَّذِي أَسْرَىٰ بِعَبْدِهِ لَيْلًا مِّنَ الْمَسْجِدِ الْحَرَامِ إِلَى الْمَسْجِدِ الْأَقْصَى", en:"Exalted is He who took His Servant by night from the Sacred Mosque to the Farthest Mosque.", ref:"17:1"}},
                { name: "صفات الله (القوة والعظمة)", nameEn: "Names of Allah (Power & Majesty)", color: "purple",
                    items: [{ar:"العزيز",en:"The Almighty"},{ar:"الجبار",en:"The Compeller"},{ar:"المتكبر",en:"The Supreme"},{ar:"القهار",en:"The Subduer"}],
                    verse: {ayah:"هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ الْمَلِكُ الْقُدُّوسُ السَّلَامُ الْمُؤْمِنُ الْمُهَيْمِنُ الْعَزِيزُ الْجَبَّارُ الْمُتَكَبِّرُ", en:"He is Allah, other than whom there is no deity, the Sovereign, the Holy, the Source of Peace, the Guardian, the Almighty, the Compeller, the Supreme.", ref:"59:23"}}
            ]
        },
        {
            id: 14,
            categories: [
                { name: "أسماء مكة في القرآن", nameEn: "Names of Makkah in the Quran", color: "yellow",
                    items: [{ar:"مكة",en:"Makkah (48:24)"},{ar:"بكة",en:"Bakkah (3:96)"},{ar:"أم القرى",en:"Mother of Cities (42:7)"},{ar:"البلد الأمين",en:"The Secure City (95:3)"}],
                    verse: {ayah:"إِنَّ أَوَّلَ بَيْتٍ وُضِعَ لِلنَّاسِ لَلَّذِي بِبَكَّةَ مُبَارَكًا", en:"Indeed, the first House established for mankind was that at Bakkah — blessed.", ref:"3:96"}},
                { name: "ألقاب النبي محمد ﷺ في القرآن", nameEn: "Titles of Prophet Muhammad in the Quran", color: "green",
                    items: [{ar:"رحمة للعالمين",en:"Mercy to the worlds (21:107)"},{ar:"خاتم النبيين",en:"Seal of Prophets (33:40)"},{ar:"الأمين",en:"The Trustworthy"},{ar:"البشير والنذير",en:"Bearer of glad tidings & warner"}],
                    verse: {ayah:"وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ", en:"And We have not sent you except as a mercy to the worlds.", ref:"21:107"}},
                { name: "أنواع الماء في القرآن", nameEn: "Types of water in the Quran", color: "blue",
                    items: [{ar:"مطر",en:"Rain"},{ar:"نهر",en:"River"},{ar:"عين",en:"Spring"},{ar:"بحر",en:"Sea"}],
                    verse: {ayah:"وَأَنزَلْنَا مِنَ السَّمَاءِ مَاءً بِقَدَرٍ فَأَسْكَنَّاهُ فِي الْأَرْضِ", en:"And We sent down water from the sky in a measured amount and settled it in the earth.", ref:"23:18"}},
                { name: "أقمشة وملابس الجنة", nameEn: "Garments of Paradise in the Quran", color: "purple",
                    items: [{ar:"سندس",en:"Fine green silk"},{ar:"إستبرق",en:"Thick brocade"},{ar:"حرير",en:"Silk"},{ar:"لباس التقوى",en:"Garment of righteousness (7:26)"}],
                    verse: {ayah:"يُحَلَّوْنَ فِيهَا مِنْ أَسَاوِرَ مِن ذَهَبٍ وَلُؤْلُؤًا وَلِبَاسُهُمْ فِيهَا حَرِيرٌ", en:"They will be adorned therein with bracelets of gold and pearls, and their garments therein will be silk.", ref:"22:23"}}
            ]
        },
        {
            id: 15,
            categories: [
                { name: "عناصر قصة إبراهيم", nameEn: "Key moments of Ibrahim's story", color: "yellow",
                    items: [{ar:"الكواكب",en:"The Stars (6:76)"},{ar:"النار",en:"The Fire (21:69)"},{ar:"الذبح",en:"The Sacrifice (37:107)"},{ar:"الكعبة",en:"The Ka'bah (2:127)"}],
                    verse: {ayah:"وَإِذِ ابْتَلَىٰ إِبْرَاهِيمَ رَبُّهُ بِكَلِمَاتٍ فَأَتَمَّهُنَّ", en:"And when Ibrahim was tried by his Lord with commands and he fulfilled them.", ref:"2:124"}},
                { name: "أوامر قرآنية عامة", nameEn: "Universal Quranic commands", color: "green",
                    items: [{ar:"أقيموا الصلاة",en:"Establish prayer"},{ar:"آتوا الزكاة",en:"Give Zakat"},{ar:"أطيعوا الله",en:"Obey Allah"},{ar:"اذكروا الله",en:"Remember Allah"}],
                    verse: {ayah:"يَا أَيُّهَا الَّذِينَ آمَنُوا أَطِيعُوا اللَّهَ وَأَطِيعُوا الرَّسُولَ", en:"O you who believe, obey Allah and obey the Messenger.", ref:"4:59"}},
                { name: "عناصر قصة نوح", nameEn: "Elements of Nuh's story", color: "blue",
                    items: [{ar:"السفينة",en:"The Ark"},{ar:"الطوفان",en:"The Flood"},{ar:"الجودي",en:"Mount Judi"},{ar:"ابن نوح",en:"Son of Nuh"}],
                    verse: {ayah:"وَقِيلَ يَا أَرْضُ ابْلَعِي مَاءَكِ وَيَا سَمَاءُ أَقْلِعِي وَاسْتَوَتْ عَلَى الْجُودِيِّ", en:"And it was said: O earth, swallow your water, and O sky, withhold. And it rested on Mount Judi.", ref:"11:44"}},
                { name: "أمراض القلب في القرآن", nameEn: "Spiritual diseases in the Quran", color: "purple",
                    items: [{ar:"الكبر",en:"Arrogance"},{ar:"الحسد",en:"Envy"},{ar:"الرياء",en:"Showing off"},{ar:"البخل",en:"Miserliness"}],
                    verse: {ayah:"وَلَا تُصَعِّرْ خَدَّكَ لِلنَّاسِ وَلَا تَمْشِ فِي الْأَرْضِ مَرَحًا", en:"And do not turn your cheek in contempt toward people and do not walk through the earth exultantly.", ref:"31:18"}}
            ]
        },
        {
            id: 16,
            categories: [
                { name: "أنبياء اشتهروا بالصبر", nameEn: "Prophets known for patience", color: "yellow",
                    items: [{ar:"أيوب",en:"Ayyub (AS)"},{ar:"يعقوب",en:"Ya'qub (AS)"},{ar:"يوسف",en:"Yusuf (AS)"},{ar:"إسماعيل",en:"Isma'il (AS)"}],
                    verse: {ayah:"إِنَّا وَجَدْنَاهُ صَابِرًا نِّعْمَ الْعَبْدُ إِنَّهُ أَوَّابٌ", en:"Indeed, We found him patient, an excellent servant. Indeed, he was one repeatedly turning back.", ref:"38:44"}},
                { name: "أنهار الجنة الأربعة", nameEn: "Four rivers of Paradise (47:15)", color: "green",
                    items: [{ar:"ماء غير آسن",en:"Water unchanged"},{ar:"لبن",en:"Milk"},{ar:"خمر لذة",en:"Wine delightful"},{ar:"عسل مصفى",en:"Honey purified"}],
                    verse: {ayah:"فِيهَا أَنْهَارٌ مِّن مَّاءٍ غَيْرِ آسِنٍ وَأَنْهَارٌ مِّن لَّبَنٍ", en:"In it are rivers of water unaltered, and rivers of milk.", ref:"47:15"}},
                { name: "الأشهر الحرم", nameEn: "Sacred months in the Quran (9:36)", color: "blue",
                    items: [{ar:"ذو القعدة",en:"Dhul-Qi'dah"},{ar:"ذو الحجة",en:"Dhul-Hijjah"},{ar:"محرم",en:"Muharram"},{ar:"رجب",en:"Rajab"}],
                    verse: {ayah:"إِنَّ عِدَّةَ الشُّهُورِ عِندَ اللَّهِ اثْنَا عَشَرَ شَهْرًا مِنْهَا أَرْبَعَةٌ حُرُمٌ", en:"Indeed, the number of months with Allah is twelve, of which four are sacred.", ref:"9:36"}},
                { name: "سور مكية عن الآخرة", nameEn: "Meccan Surahs about the Hereafter", color: "purple",
                    items: [{ar:"القارعة",en:"Al-Qari'ah (101)"},{ar:"التكاثر",en:"At-Takathur (102)"},{ar:"الزلزلة",en:"Az-Zalzalah (99)"},{ar:"الانفطار",en:"Al-Infitar (82)"}],
                    verse: {ayah:"الْقَارِعَةُ ۝ مَا الْقَارِعَةُ ۝ وَمَا أَدْرَاكَ مَا الْقَارِعَةُ", en:"The Striking Calamity — what is the Striking Calamity? And what can make you know what it is?", ref:"101:1-3"}}
            ]
        },
        {
            id: 17,
            categories: [
                { name: "عناصر أصحاب الكهف", nameEn: "Elements of the Cave companions", color: "yellow",
                    items: [{ar:"الفتية",en:"The Youth"},{ar:"الكهف",en:"The Cave"},{ar:"الرقيم",en:"The Inscription"},{ar:"ثلاثمائة سنين",en:"Three hundred years"}],
                    verse: {ayah:"إِذْ أَوَى الْفِتْيَةُ إِلَى الْكَهْفِ فَقَالُوا رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً", en:"When the youths retreated to the cave and said: Our Lord, grant us mercy from Yourself.", ref:"18:10"}},
                { name: "مفاهيم سورة الإخلاص", nameEn: "Concepts in Surah Al-Ikhlas", color: "green",
                    items: [{ar:"أحد",en:"The One"},{ar:"الصمد",en:"The Eternal Refuge"},{ar:"لم يلد",en:"He begets not"},{ar:"لم يكن له كفوا",en:"None comparable to Him"}],
                    verse: {ayah:"قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ", en:"Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born.", ref:"112:1-3"}},
                { name: "أدعية قرآنية مشهورة", nameEn: "Famous Quranic duas", color: "blue",
                    items: [{ar:"ربنا آتنا في الدنيا حسنة",en:"Our Lord, give us good (2:201)"},{ar:"رب زدني علما",en:"My Lord, increase me in knowledge (20:114)"},{ar:"ربنا لا تزغ قلوبنا",en:"Our Lord, let not our hearts deviate (3:8)"},{ar:"رب أوزعني أن أشكر",en:"My Lord, enable me to be grateful (27:19)"}],
                    verse: {ayah:"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", en:"Our Lord, give us good in this world and good in the Hereafter, and protect us from the Fire.", ref:"2:201"}},
                { name: "أنواع الرياح في القرآن", nameEn: "Types of wind in the Quran", color: "purple",
                    items: [{ar:"الرياح مبشرات",en:"Winds as glad tidings"},{ar:"ريح صرصر",en:"Howling wind"},{ar:"الإعصار",en:"Whirlwind"},{ar:"الرياح لواقح",en:"Fertilizing winds (15:22)"}],
                    verse: {ayah:"وَأَرْسَلْنَا الرِّيَاحَ لَوَاقِحَ فَأَنزَلْنَا مِنَ السَّمَاءِ مَاءً", en:"And We have sent the fertilizing winds and sent down water from the sky.", ref:"15:22"}}
            ]
        },
        {
            id: 18,
            categories: [
                { name: "استعارات النور في القرآن", nameEn: "Light metaphors in the Quran (24:35)", color: "yellow",
                    items: [{ar:"نور على نور",en:"Light upon light"},{ar:"مشكاة",en:"Niche"},{ar:"زجاجة",en:"Glass"},{ar:"كوكب دري",en:"Brilliant star"}],
                    verse: {ayah:"اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ", en:"Allah is the Light of the heavens and the earth. The example of His light is like a niche containing a lamp.", ref:"24:35"}},
                { name: "عناصر قصة موسى", nameEn: "Key elements of Musa's story", color: "green",
                    items: [{ar:"فرعون",en:"Pharaoh"},{ar:"الطور",en:"Mount Tur"},{ar:"التيه",en:"The Wilderness"},{ar:"البحر",en:"The Sea"}],
                    verse: {ayah:"فَأَوْحَيْنَا إِلَىٰ مُوسَىٰ أَنِ اضْرِب بِّعَصَاكَ الْبَحْرَ فَانفَلَقَ", en:"So We inspired Musa: Strike the sea with your staff. And it parted.", ref:"26:63"}},
                { name: "صفات المتقين في سورة البقرة", nameEn: "Qualities of the righteous (Al-Baqarah 2:3-4)", color: "blue",
                    items: [{ar:"يؤمنون بالغيب",en:"Believe in the unseen"},{ar:"يقيمون الصلاة",en:"Establish prayer"},{ar:"مما رزقناهم ينفقون",en:"Spend from what We provide"},{ar:"يؤمنون بما أنزل إليك",en:"Believe in what was revealed"}],
                    verse: {ayah:"الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ", en:"Who believe in the unseen, establish prayer, and spend out of what We have provided for them.", ref:"2:3"}},
                { name: "أسماء الله (الرحمة واللطف)", nameEn: "Names of Allah (Mercy & Gentleness)", color: "purple",
                    items: [{ar:"الرحمن",en:"The Most Gracious"},{ar:"الودود",en:"The Most Loving"},{ar:"اللطيف",en:"The Subtle"},{ar:"الغفور",en:"The Forgiving"}],
                    verse: {ayah:"وَهُوَ الْغَفُورُ الْوَدُودُ", en:"And He is the Forgiving, the Most Loving.", ref:"85:14"}}
            ]
        },
        {
            id: 19,
            categories: [
                { name: "أسماء الله في آخر سورة الحشر", nameEn: "Names of Allah at end of Al-Hashr (59:23-24)", color: "yellow",
                    items: [{ar:"الملك",en:"The Sovereign"},{ar:"القدوس",en:"The Holy"},{ar:"السلام",en:"The Source of Peace"},{ar:"المؤمن",en:"The Guardian of Faith"}],
                    verse: {ayah:"هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ الْمَلِكُ الْقُدُّوسُ السَّلَامُ", en:"He is Allah, other than whom there is no deity, the Sovereign, the Holy, the Source of Peace.", ref:"59:23"}},
                { name: "صفات المنافقين في القرآن", nameEn: "Traits of hypocrites in the Quran", color: "green",
                    items: [{ar:"يخادعون الله",en:"They try to deceive Allah"},{ar:"إذا قاموا إلى الصلاة قاموا كسالى",en:"Stand lazily for prayer"},{ar:"يراءون الناس",en:"Show off to people"},{ar:"في قلوبهم مرض",en:"In their hearts is disease"}],
                    verse: {ayah:"إِنَّ الْمُنَافِقِينَ يُخَادِعُونَ اللَّهَ وَهُوَ خَادِعُهُمْ", en:"Indeed, the hypocrites think to deceive Allah, but He is deceiving them.", ref:"4:142"}},
                { name: "موضوعات سورة الملك", nameEn: "Themes of Surah Al-Mulk", color: "blue",
                    items: [{ar:"تبارك الذي بيده الملك",en:"Blessed is He in whose hand is dominion"},{ar:"الموت والحياة ابتلاء",en:"Death and life as a test"},{ar:"سبع سماوات طباقا",en:"Seven layered heavens"},{ar:"الطير فوقهم صافات",en:"Birds above them spreading wings"}],
                    verse: {ayah:"تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", en:"Blessed is He in whose hand is dominion, and He is over all things competent.", ref:"67:1"}},
                { name: "مواضيع آخر آيتين من سورة البقرة", nameEn: "Themes of last 2 ayahs of Al-Baqarah", color: "purple",
                    items: [{ar:"آمن الرسول",en:"The Messenger has believed"},{ar:"لا يكلف الله نفسا إلا وسعها",en:"Allah does not burden beyond capacity"},{ar:"ربنا لا تؤاخذنا",en:"Our Lord, do not impose blame"},{ar:"أنت مولانا",en:"You are our Protector"}],
                    verse: {ayah:"آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ", en:"The Messenger has believed in what was revealed to him from his Lord, and so have the believers.", ref:"2:285"}}
            ]
        },
        {
            id: 20,
            categories: [
                { name: "أنبياء أُنزلت عليهم كتب", nameEn: "Prophets given major scriptures", color: "yellow",
                    items: [{ar:"محمد ﷺ",en:"Muhammad — Quran"},{ar:"موسى",en:"Musa — Torah"},{ar:"داود",en:"Dawud — Zabur"},{ar:"عيسى",en:"Isa — Injeel"}],
                    verse: {ayah:"إِنَّا أَنزَلْنَا التَّوْرَاةَ فِيهَا هُدًى وَنُورٌ", en:"Indeed, We sent down the Torah, in which was guidance and light.", ref:"5:44"}},
                { name: "مواضيع سورة يس", nameEn: "Themes of Surah Ya-Sin", color: "green",
                    items: [{ar:"أصحاب القرية",en:"Companions of the City"},{ar:"الآيات في الأنفس",en:"Signs in creation"},{ar:"البعث بعد الموت",en:"Resurrection after death"},{ar:"يس والقرآن الحكيم",en:"Ya-Sin and the Wise Quran"}],
                    verse: {ayah:"يس ۝ وَالْقُرْآنِ الْحَكِيمِ ۝ إِنَّكَ لَمِنَ الْمُرْسَلِينَ", en:"Ya-Sin. By the wise Quran. Indeed you are among the messengers.", ref:"36:1-3"}},
                { name: "أنبياء من ذرية إبراهيم", nameEn: "Prophets from Ibrahim's lineage", color: "blue",
                    items: [{ar:"إسحاق",en:"Ishaq"},{ar:"يعقوب",en:"Ya'qub"},{ar:"يوسف",en:"Yusuf"},{ar:"إسماعيل",en:"Isma'il"}],
                    verse: {ayah:"وَوَهَبْنَا لَهُ إِسْحَاقَ وَيَعْقُوبَ كُلًّا هَدَيْنَا", en:"And We gave him Ishaq and Ya'qub — all of them We guided.", ref:"6:84"}},
                { name: "أوقات الصلاة في القرآن", nameEn: "Prayer times referenced in the Quran", color: "purple",
                    items: [{ar:"الفجر",en:"Dawn (Fajr)"},{ar:"الشروق",en:"Sunrise"},{ar:"الظهر",en:"Midday"},{ar:"المغرب",en:"Sunset"}],
                    verse: {ayah:"أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ إِلَىٰ غَسَقِ اللَّيْلِ وَقُرْآنَ الْفَجْرِ", en:"Establish prayer at the decline of the sun until the darkness of the night and the Quran at dawn.", ref:"17:78"}}
            ]
        },
        {
            id: 21,
            categories: [
                { name: "أنبياء ذُكروا في سورة الأنبياء", nameEn: "Prophets mentioned in Surah Al-Anbiya", color: "yellow",
                    items: [{ar:"داود",en:"Dawud (AS)"},{ar:"سليمان",en:"Sulayman (AS)"},{ar:"أيوب",en:"Ayyub (AS)"},{ar:"ذو الكفل",en:"Dhul-Kifl (AS)"}],
                    verse: {ayah:"وَدَاوُودَ وَسُلَيْمَانَ إِذْ يَحْكُمَانِ فِي الْحَرْثِ", en:"And Dawud and Sulayman, when they judged concerning the field.", ref:"21:78"}},
                { name: "كلمات افتتاحية لسور قرآنية", nameEn: "Opening words of Quranic Surahs", color: "green",
                    items: [{ar:"اقرأ",en:"Read! (Al-Alaq 96:1)"},{ar:"تبارك",en:"Blessed is (Al-Mulk 67:1)"},{ar:"سبحان",en:"Glory be (Al-Isra 17:1)"},{ar:"الحاقة",en:"The Inevitable (Al-Haqqah 69:1)"}],
                    verse: {ayah:"اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ", en:"Read in the name of your Lord who created.", ref:"96:1"}},
                { name: "أدوات عذاب في القرآن", nameEn: "Instruments of punishment in the Quran", color: "blue",
                    items: [{ar:"حجارة من سجيل",en:"Stones of baked clay"},{ar:"صاعقة",en:"Thunderbolt"},{ar:"ريح صرصر",en:"Howling wind"},{ar:"رجز من السماء",en:"Punishment from the sky"}],
                    verse: {ayah:"وَأَمْطَرْنَا عَلَيْهِمْ حِجَارَةً مِّن سِجِّيلٍ", en:"And We rained upon them stones of baked clay.", ref:"15:74"}},
                { name: "صفات القرآن في أول سورة البقرة", nameEn: "Descriptions of the Quran (Al-Baqarah opening)", color: "purple",
                    items: [{ar:"لا ريب فيه",en:"No doubt in it (2:2)"},{ar:"هدى للمتقين",en:"Guidance for the righteous (2:2)"},{ar:"مصدّق لما بين يديه",en:"Confirms what came before"},{ar:"تفصيل كل شيء",en:"Explanation of all things"}],
                    verse: {ayah:"ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ", en:"This is the Book about which there is no doubt, a guidance for those conscious of Allah.", ref:"2:2"}}
            ]
        },
        {
            id: 22,
            categories: [
                { name: "سور سُمّيت بأوقات", nameEn: "Surahs named after times", color: "yellow",
                    items: [{ar:"الفجر",en:"The Dawn (89)"},{ar:"الضحى",en:"The Morning Hours (93)"},{ar:"العصر",en:"The Declining Day (103)"},{ar:"الليل",en:"The Night (92)"}],
                    verse: {ayah:"وَالْعَصْرِ ۝ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ", en:"By time. Indeed, mankind is in loss.", ref:"103:1-2"}},
                { name: "أشجار ذُكرت في القرآن", nameEn: "Trees mentioned in the Quran", color: "green",
                    items: [{ar:"الزيتون",en:"Olive tree"},{ar:"النخل",en:"Date palm"},{ar:"السدر",en:"Lote tree"},{ar:"الزقوم",en:"Zaqqum tree (Hellfire)"}],
                    verse: {ayah:"وَشَجَرَةً تَخْرُجُ مِن طُورِ سَيْنَاءَ تَنبُتُ بِالدُّهْنِ وَصِبْغٍ لِّلْآكِلِينَ", en:"And a tree that grows from Mount Sinai which produces oil and food for those who eat.", ref:"23:20"}},
                { name: "صفات يوم القيامة", nameEn: "Names/descriptions of the Day of Judgment", color: "blue",
                    items: [{ar:"يوم الحساب",en:"Day of Reckoning"},{ar:"الساعة",en:"The Hour"},{ar:"يوم الفصل",en:"Day of Sorting"},{ar:"الطامة الكبرى",en:"The Greatest Catastrophe"}],
                    verse: {ayah:"يَسْأَلُونَكَ عَنِ السَّاعَةِ أَيَّانَ مُرْسَاهَا", en:"They ask you about the Hour: when is its arrival?", ref:"7:187"}},
                { name: "أوامر في سورة الإسراء للوالدين", nameEn: "Commands about parents (Al-Isra 17:23-24)", color: "purple",
                    items: [{ar:"لا تقل لهما أف",en:"Do not say 'uff' to them"},{ar:"لا تنهرهما",en:"Do not repel them"},{ar:"قل لهما قولا كريما",en:"Speak to them kindly"},{ar:"اخفض لهما جناح الذل",en:"Lower the wing of humility"}],
                    verse: {ayah:"وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا", en:"And your Lord has decreed that you worship none but Him, and that you be dutiful to your parents.", ref:"17:23"}}
            ]
        },
        {
            id: 23,
            categories: [
                { name: "معجزات عيسى عليه السلام", nameEn: "Miracles of Isa (AS) in the Quran", color: "yellow",
                    items: [{ar:"إحياء الموتى",en:"Raising the dead"},{ar:"إبراء الأكمه والأبرص",en:"Healing blind and leper"},{ar:"الطير من الطين",en:"Bird from clay"},{ar:"المائدة من السماء",en:"Table from heaven"}],
                    verse: {ayah:"وَأُبْرِئُ الْأَكْمَهَ وَالْأَبْرَصَ وَأُحْيِي الْمَوْتَىٰ بِإِذْنِ اللَّهِ", en:"And I cure the blind and the leper, and I give life to the dead — by permission of Allah.", ref:"3:49"}},
                { name: "أسماء سورة محمد", nameEn: "Surahs named after prophets", color: "green",
                    items: [{ar:"يونس",en:"Yunus (10)"},{ar:"هود",en:"Hud (11)"},{ar:"يوسف",en:"Yusuf (12)"},{ar:"نوح",en:"Nuh (71)"}],
                    verse: {ayah:"الر تِلْكَ آيَاتُ الْكِتَابِ الْمُبِينِ ۝ إِنَّا أَنزَلْنَاهُ قُرْآنًا عَرَبِيًّا", en:"Alif-Lam-Ra. These are the verses of the clear Book. Indeed, We have sent it down as an Arabic Quran.", ref:"12:1-2"}},
                { name: "مخلوقات غيبية في القرآن", nameEn: "Unseen beings in the Quran", color: "blue",
                    items: [{ar:"الملائكة",en:"Angels"},{ar:"الجن",en:"Jinn"},{ar:"الشياطين",en:"Devils"},{ar:"حور عين",en:"Hoor al-Ayn (of Paradise)"}],
                    verse: {ayah:"وَمَا خَلَقْتُ الْجِنَّ وَالْإِنسَ إِلَّا لِيَعْبُدُونِ", en:"And I did not create the jinn and mankind except to worship Me.", ref:"51:56"}},
                { name: "كلمات تتكرر في سورة الرحمن", nameEn: "Repeated themes in Surah Ar-Rahman", color: "purple",
                    items: [{ar:"فبأي آلاء ربكما تكذبان",en:"Which favors will you deny?"},{ar:"جنتان",en:"Two gardens"},{ar:"مرج البحرين",en:"Two seas released"},{ar:"كل من عليها فان",en:"Everything upon it will perish"}],
                    verse: {ayah:"فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ", en:"So which of the favors of your Lord would you deny?", ref:"55:13"}}
            ]
        },
        {
            id: 24,
            categories: [
                { name: "أطعمة ذُكرت في القرآن", nameEn: "Foods mentioned in the Quran", color: "yellow",
                    items: [{ar:"المن والسلوى",en:"Manna and quails"},{ar:"اللحم",en:"Meat"},{ar:"اللبن",en:"Milk"},{ar:"العسل",en:"Honey"}],
                    verse: {ayah:"وَظَلَّلْنَا عَلَيْكُمُ الْغَمَامَ وَأَنزَلْنَا عَلَيْكُمُ الْمَنَّ وَالسَّلْوَىٰ", en:"And We shaded you with clouds and sent down to you manna and quails.", ref:"2:57"}},
                { name: "صفات الله (العلم والسمع)", nameEn: "Names of Allah (Knowledge & Awareness)", color: "green",
                    items: [{ar:"السميع",en:"The All-Hearing"},{ar:"البصير",en:"The All-Seeing"},{ar:"الخبير",en:"The All-Aware"},{ar:"الشهيد",en:"The Witness"}],
                    verse: {ayah:"وَهُوَ السَّمِيعُ الْبَصِيرُ", en:"And He is the Hearing, the Seeing.", ref:"42:11"}},
                { name: "أحكام سورة النور", nameEn: "Rulings in Surah An-Nur", color: "blue",
                    items: [{ar:"غض البصر",en:"Lower the gaze (24:30)"},{ar:"الاستئذان",en:"Seeking permission (24:27)"},{ar:"حجاب المؤمنات",en:"Modesty of believing women (24:31)"},{ar:"حد القذف",en:"Punishment for slander (24:4)"}],
                    verse: {ayah:"قُل لِّلْمُؤْمِنِينَ يَغُضُّوا مِنْ أَبْصَارِهِمْ وَيَحْفَظُوا فُرُوجَهُمْ", en:"Tell the believing men to lower their gaze and guard their private parts.", ref:"24:30"}},
                { name: "أماكن ذُكرت في قصة موسى", nameEn: "Places in Musa's story", color: "purple",
                    items: [{ar:"مصر",en:"Egypt"},{ar:"مدين",en:"Madyan"},{ar:"الطور",en:"Mount Tur"},{ar:"الوادي المقدس طوى",en:"Sacred valley of Tuwa"}],
                    verse: {ayah:"فَلَمَّا أَتَاهَا نُودِيَ مِن شَاطِئِ الْوَادِ الْأَيْمَنِ فِي الْبُقْعَةِ الْمُبَارَكَةِ", en:"And when he came to it, he was called from the right side of the valley in a blessed spot.", ref:"28:30"}}
            ]
        },
        {
            id: 25,
            categories: [
                { name: "أسلحة ومعارك في القرآن", nameEn: "Battles and events in the Quran", color: "yellow",
                    items: [{ar:"بدر",en:"Badr (3:123)"},{ar:"أحد",en:"Uhud (3:121)"},{ar:"حنين",en:"Hunayn (9:25)"},{ar:"الأحزاب",en:"The Confederates (33:9)"}],
                    verse: {ayah:"وَلَقَدْ نَصَرَكُمُ اللَّهُ بِبَدْرٍ وَأَنتُمْ أَذِلَّةٌ", en:"And already had Allah given you victory at Badr while you were few in number.", ref:"3:123"}},
                { name: "أنواع النفس في القرآن", nameEn: "Types of the soul in the Quran", color: "green",
                    items: [{ar:"النفس المطمئنة",en:"The tranquil soul (89:27)"},{ar:"النفس اللوامة",en:"The self-reproaching soul (75:2)"},{ar:"النفس الأمارة بالسوء",en:"The soul inciting evil (12:53)"},{ar:"النفس الراضية",en:"The pleased soul (89:28)"}],
                    verse: {ayah:"يَا أَيَّتُهَا النَّفْسُ الْمُطْمَئِنَّةُ ۝ ارْجِعِي إِلَىٰ رَبِّكِ رَاضِيَةً مَّرْضِيَّةً", en:"O tranquil soul, return to your Lord, well-pleased and pleasing.", ref:"89:27-28"}},
                { name: "وعود الله في القرآن", nameEn: "Promises of Allah in the Quran", color: "blue",
                    items: [{ar:"إن مع العسر يسرا",en:"With hardship comes ease (94:6)"},{ar:"لئن شكرتم لأزيدنكم",en:"If grateful, I will increase (14:7)"},{ar:"ادعوني أستجب لكم",en:"Call Me, I will respond (40:60)"},{ar:"إنا نحن نزلنا الذكر وإنا له لحافظون",en:"We will preserve the Quran (15:9)"}],
                    verse: {ayah:"فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا", en:"For indeed, with hardship comes ease. Indeed, with hardship comes ease.", ref:"94:5-6"}},
                { name: "حشرات ذُكرت في القرآن", nameEn: "Insects mentioned in the Quran", color: "purple",
                    items: [{ar:"النحل",en:"Bee"},{ar:"النمل",en:"Ant"},{ar:"البعوضة",en:"Mosquito (2:26)"},{ar:"الجراد",en:"Locust"}],
                    verse: {ayah:"وَأَوْحَىٰ رَبُّكَ إِلَى النَّحْلِ أَنِ اتَّخِذِي مِنَ الْجِبَالِ بُيُوتًا", en:"And your Lord inspired the bee: Make your homes in the mountains.", ref:"16:68"}}
            ]
        },
        {
            id: 26,
            categories: [
                { name: "عبارات من سورة الفتح", nameEn: "Phrases from Surah Al-Fath", color: "yellow",
                    items: [{ar:"إنا فتحنا لك فتحا مبينا",en:"We have given you a clear victory"},{ar:"ليغفر لك الله",en:"That Allah may forgive you"},{ar:"هو الذي أنزل السكينة",en:"He sent down tranquility"},{ar:"بيعة الرضوان",en:"Pledge under the tree"}],
                    verse: {ayah:"إِنَّا فَتَحْنَا لَكَ فَتْحًا مُّبِينًا", en:"Indeed, We have given you a clear conquest.", ref:"48:1"}},
                { name: "أنهار ذُكرت في القرآن", nameEn: "Rivers/water bodies in the Quran", color: "green",
                    items: [{ar:"النيل",en:"The Nile (implied)"},{ar:"البحر",en:"The Sea"},{ar:"العين",en:"The Spring"},{ar:"الأنهار",en:"The Rivers (of Paradise)"}],
                    verse: {ayah:"وَهُوَ الَّذِي مَرَجَ الْبَحْرَيْنِ هَٰذَا عَذْبٌ فُرَاتٌ وَهَٰذَا مِلْحٌ أُجَاجٌ", en:"And it is He who released the two seas — one fresh and sweet and the other salty and bitter.", ref:"25:53"}},
                { name: "صفات المتكبرين في القرآن", nameEn: "Traits of the arrogant in the Quran", color: "blue",
                    items: [{ar:"استكبر في الأرض",en:"Was arrogant on earth"},{ar:"أنا خير منه",en:"I am better than him (Iblis)"},{ar:"أنا ربكم الأعلى",en:"I am your most exalted lord (Fir'awn)"},{ar:"ما علمت لكم من إله غيري",en:"I know no god for you other than me"}],
                    verse: {ayah:"قَالَ أَنَا خَيْرٌ مِّنْهُ خَلَقْتَنِي مِن نَّارٍ وَخَلَقْتَهُ مِن طِينٍ", en:"He said: I am better than him. You created me from fire and created him from clay.", ref:"7:12"}},
                { name: "سور سُمّيت بحروف", nameEn: "Surahs named after letters", color: "purple",
                    items: [{ar:"طه",en:"Ta-Ha (20)"},{ar:"يس",en:"Ya-Sin (36)"},{ar:"ص",en:"Sad (38)"},{ar:"ق",en:"Qaf (50)"}],
                    verse: {ayah:"يس ۝ وَالْقُرْآنِ الْحَكِيمِ", en:"Ya-Sin. By the wise Quran.", ref:"36:1-2"}}
            ]
        },
        {
            id: 27,
            categories: [
                { name: "أدعية من سورة البقرة", nameEn: "Duas from Surah Al-Baqarah", color: "yellow",
                    items: [{ar:"ربنا آتنا في الدنيا حسنة",en:"Our Lord, give us good in this world (2:201)"},{ar:"ربنا أفرغ علينا صبرا",en:"Our Lord, pour patience upon us (2:250)"},{ar:"ربنا لا تؤاخذنا إن نسينا",en:"Our Lord, do not blame us if we forget (2:286)"},{ar:"ربنا وابعث فيهم رسولا",en:"Our Lord, send among them a messenger (2:129)"}],
                    verse: {ayah:"رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", en:"Our Lord, give us good in this world and good in the Hereafter, and protect us from the Fire.", ref:"2:201"}},
                { name: "أسماء الله (الخلق والتدبير)", nameEn: "Names of Allah (Creation & Sovereignty)", color: "green",
                    items: [{ar:"الخالق",en:"The Creator"},{ar:"المصور",en:"The Fashioner"},{ar:"البارئ",en:"The Originator"},{ar:"الرزاق",en:"The Provider"}],
                    verse: {ayah:"هُوَ اللَّهُ الْخَالِقُ الْبَارِئُ الْمُصَوِّرُ لَهُ الْأَسْمَاءُ الْحُسْنَىٰ", en:"He is Allah, the Creator, the Originator, the Fashioner. To Him belong the best names.", ref:"59:24"}},
                { name: "قصص سورة القصص", nameEn: "Stories in Surah Al-Qasas", color: "blue",
                    items: [{ar:"ولادة موسى",en:"Birth of Musa"},{ar:"قارون وكنوزه",en:"Qarun and his treasures"},{ar:"موسى في مدين",en:"Musa in Madyan"},{ar:"الشجرة المباركة",en:"The blessed tree (burning bush)"}],
                    verse: {ayah:"وَأَوْحَيْنَا إِلَىٰ أُمِّ مُوسَىٰ أَنْ أَرْضِعِيهِ", en:"And We inspired the mother of Musa: Suckle him.", ref:"28:7"}},
                { name: "أوصاف الجنة في القرآن", nameEn: "Descriptions of Paradise", color: "purple",
                    items: [{ar:"جنات تجري من تحتها الأنهار",en:"Gardens with rivers flowing"},{ar:"فيها ما تشتهيه الأنفس",en:"Whatever the souls desire"},{ar:"خالدين فيها أبدا",en:"Dwelling therein forever"},{ar:"رضوان من الله أكبر",en:"Allah's pleasure is greater (9:72)"}],
                    verse: {ayah:"جَنَّاتٍ تَجْرِي مِن تَحْتِهَا الْأَنْهَارُ خَالِدِينَ فِيهَا أَبَدًا", en:"Gardens beneath which rivers flow, wherein they abide eternally.", ref:"9:100"}}
            ]
        },
        {
            id: 28,
            categories: [
                { name: "مشاهد من قصة آدم", nameEn: "Scenes from Adam's story", color: "yellow",
                    items: [{ar:"سجود الملائكة",en:"Angels' prostration"},{ar:"الشجرة المحرمة",en:"The forbidden tree"},{ar:"وسوسة إبليس",en:"Iblis's whisper"},{ar:"الهبوط إلى الأرض",en:"Descent to earth"}],
                    verse: {ayah:"وَإِذْ قُلْنَا لِلْمَلَائِكَةِ اسْجُدُوا لِآدَمَ فَسَجَدُوا إِلَّا إِبْلِيسَ", en:"And when We said to the angels: Prostrate to Adam, and they prostrated, except Iblis.", ref:"2:34"}},
                { name: "أوصاف القيامة في سورة التكوير", nameEn: "Events in Surah At-Takwir (81)", color: "green",
                    items: [{ar:"إذا الشمس كورت",en:"When the sun is wrapped up"},{ar:"وإذا النجوم انكدرت",en:"When the stars fall"},{ar:"وإذا البحار سجرت",en:"When the seas are set ablaze"},{ar:"وإذا الموءودة سئلت",en:"When the infant girl is asked"}],
                    verse: {ayah:"إِذَا الشَّمْسُ كُوِّرَتْ ۝ وَإِذَا النُّجُومُ انكَدَرَتْ", en:"When the sun is wrapped up, and when the stars fall.", ref:"81:1-2"}},
                { name: "أنبياء كانوا ملوكا", nameEn: "Prophets who were kings", color: "blue",
                    items: [{ar:"داود",en:"Dawud"},{ar:"سليمان",en:"Sulayman"},{ar:"ذو القرنين",en:"Dhul-Qarnayn"},{ar:"طالوت",en:"Talut (Saul)"}],
                    verse: {ayah:"وَلَقَدْ آتَيْنَا دَاوُودَ مِنَّا فَضْلًا يَا جِبَالُ أَوِّبِي مَعَهُ", en:"And We certainly gave Dawud from Us bounty. O mountains, repeat with him.", ref:"34:10"}},
                { name: "كلمات عن الرزق في القرآن", nameEn: "Words about provision in the Quran", color: "purple",
                    items: [{ar:"الرزاق",en:"The Provider (51:58)"},{ar:"يرزق من يشاء",en:"He provides whom He wills"},{ar:"وفي السماء رزقكم",en:"In the heaven is your provision (51:22)"},{ar:"نحن نرزقكم",en:"We provide for you (6:151)"}],
                    verse: {ayah:"وَفِي السَّمَاءِ رِزْقُكُمْ وَمَا تُوعَدُونَ", en:"And in the heaven is your provision and whatever you are promised.", ref:"51:22"}}
            ]
        },
        {
            id: 29,
            categories: [
                { name: "آيات عن الصبر", nameEn: "Verses about patience in the Quran", color: "yellow",
                    items: [{ar:"فصبر جميل",en:"Beautiful patience (12:18)"},{ar:"إن الله مع الصابرين",en:"Allah is with the patient (2:153)"},{ar:"واصبر وما صبرك إلا بالله",en:"Be patient, for Allah (16:127)"},{ar:"إنما يوفى الصابرون أجرهم",en:"The patient are given reward (39:10)"}],
                    verse: {ayah:"يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", en:"O you who believe, seek help through patience and prayer. Indeed, Allah is with the patient.", ref:"2:153"}},
                { name: "مخلوقات سخّرها الله لسليمان", nameEn: "Creatures subjected to Sulayman", color: "green",
                    items: [{ar:"الجن",en:"Jinn"},{ar:"الريح",en:"The Wind"},{ar:"الطير",en:"Birds"},{ar:"النمل",en:"Ants"}],
                    verse: {ayah:"وَلِسُلَيْمَانَ الرِّيحَ غُدُوُّهَا شَهْرٌ وَرَوَاحُهَا شَهْرٌ", en:"And to Sulayman the wind — its morning course was a month's journey and its evening course a month.", ref:"34:12"}},
                { name: "أسباب دخول الجنة", nameEn: "Causes of entering Paradise in the Quran", color: "blue",
                    items: [{ar:"الإيمان والعمل الصالح",en:"Faith and good deeds"},{ar:"التقوى",en:"God-consciousness"},{ar:"الصبر والصلاة",en:"Patience and prayer"},{ar:"الإنفاق في سبيل الله",en:"Spending in Allah's cause"}],
                    verse: {ayah:"إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ لَهُمْ جَنَّاتُ النَّعِيمِ", en:"Indeed, those who believe and do righteous deeds — for them are the Gardens of Pleasure.", ref:"31:8"}},
                { name: "كلمات عن القدر في القرآن", nameEn: "Words about divine decree", color: "purple",
                    items: [{ar:"قدر",en:"Decree/Measure"},{ar:"اللوح المحفوظ",en:"The Preserved Tablet"},{ar:"كن فيكون",en:"Be, and it is"},{ar:"ما أصاب من مصيبة إلا بإذن الله",en:"No calamity except by Allah's will"}],
                    verse: {ayah:"إِنَّا كُلَّ شَيْءٍ خَلَقْنَاهُ بِقَدَرٍ", en:"Indeed, all things We created with predestination.", ref:"54:49"}}
            ]
        },
        {
            id: 30,
            categories: [
                { name: "آيات عن ليلة القدر", nameEn: "Verses about Laylat al-Qadr (97)", color: "yellow",
                    items: [{ar:"إنا أنزلناه في ليلة القدر",en:"We sent it down on the Night of Qadr"},{ar:"ليلة القدر خير من ألف شهر",en:"Better than a thousand months"},{ar:"تنزل الملائكة والروح فيها",en:"Angels and Spirit descend"},{ar:"سلام هي حتى مطلع الفجر",en:"Peace until the rise of dawn"}],
                    verse: {ayah:"إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ ۝ وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ ۝ لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ", en:"Indeed, We sent it down during the Night of Decree. And what can make you know what the Night of Decree is? The Night of Decree is better than a thousand months.", ref:"97:1-3"}},
                { name: "آيات عن الذكر والقرآن", nameEn: "Verses about remembrance and the Quran", color: "green",
                    items: [{ar:"ولقد يسرنا القرآن للذكر",en:"We made the Quran easy to remember (54:17)"},{ar:"فاذكروني أذكركم",en:"Remember Me, I will remember you (2:152)"},{ar:"ألا بذكر الله تطمئن القلوب",en:"Hearts find rest in Allah's remembrance (13:28)"},{ar:"إنا نحن نزلنا الذكر",en:"We sent down the Reminder (15:9)"}],
                    verse: {ayah:"أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", en:"Verily, in the remembrance of Allah do hearts find rest.", ref:"13:28"}},
                { name: "صفات عباد الرحمن", nameEn: "Qualities of servants of Ar-Rahman (25:63-74)", color: "blue",
                    items: [{ar:"يمشون على الأرض هونا",en:"Walk on earth humbly"},{ar:"إذا خاطبهم الجاهلون قالوا سلاما",en:"Say 'peace' to the ignorant"},{ar:"يبيتون لربهم سجدا وقياما",en:"Spend nights in worship"},{ar:"إذا أنفقوا لم يسرفوا",en:"Spend without extravagance"}],
                    verse: {ayah:"وَعِبَادُ الرَّحْمَٰنِ الَّذِينَ يَمْشُونَ عَلَى الْأَرْضِ هَوْنًا", en:"And the servants of the Most Merciful are those who walk upon the earth humbly.", ref:"25:63"}},
                { name: "دروس من سورة الكهف", nameEn: "Lessons from Surah Al-Kahf", color: "purple",
                    items: [{ar:"الإيمان والثبات",en:"Faith and steadfastness (Cave)"},{ar:"فتنة المال",en:"Trial of wealth (Gardens)"},{ar:"التواضع في العلم",en:"Humility in knowledge (Khidr)"},{ar:"القوة والعدل",en:"Power and justice (Dhul-Qarnayn)"}],
                    verse: {ayah:"وَاصْبِرْ نَفْسَكَ مَعَ الَّذِينَ يَدْعُونَ رَبَّهُم بِالْغَدَاةِ وَالْعَشِيِّ يُرِيدُونَ وَجْهَهُ", en:"And keep yourself patient with those who call upon their Lord in the morning and evening, seeking His countenance.", ref:"18:28"}}
            ]
        }

    ],

        // ==================== VERSE WORDLE PUZZLES (ARABIC) ====================
    // Words are stored WITHOUT diacritics for matching. Display word shown after solving.
    wordle: [
        { id: 1, word: "رحمة", display: "رَحْمَة", hint: "Allah's attribute most mentioned - mercy", verse: "Surah Al-A'raf 7:156 — My mercy encompasses all things.", arabicVerse: "وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ" },
        { id: 2, word: "نور", display: "نُور", hint: "Allah is the ___ of the heavens and earth", verse: "Surah An-Nur 24:35 — Allah is the Light of the heavens and the earth.", arabicVerse: "اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ" },
        { id: 3, word: "قلب", display: "قَلْب", hint: "What Allah looks at - the heart", verse: "Surah Ar-Ra'd 13:28 — Indeed in the remembrance of Allah do hearts find rest.", arabicVerse: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ" },
        { id: 4, word: "سلام", display: "سَلَام", hint: "Greeting of the people of Jannah - peace", verse: "Surah Yunus 10:25 — And Allah invites to the Home of Peace.", arabicVerse: "وَاللَّهُ يَدْعُو إِلَىٰ دَارِ السَّلَامِ" },
        { id: 5, word: "صبر", display: "صَبْر", hint: "What Yaqub (AS) had - patience", verse: "Surah Yusuf 12:18 — So patience is most fitting.", arabicVerse: "فَصَبْرٌ جَمِيلٌ" },
        { id: 6, word: "علم", display: "عِلْم", hint: "The Prophet (SAW) was told to ask for more of this - knowledge", verse: "Surah Taha 20:114 — And say: My Lord, increase me in knowledge.", arabicVerse: "وَقُل رَّبِّ زِدْنِي عِلْمًا" },
        { id: 7, word: "ماء", display: "مَاء", hint: "Every living thing was made from this", verse: "Surah Al-Anbiya 21:30 — And We made from water every living thing.", arabicVerse: "وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ" },
        { id: 8, word: "ارض", display: "أَرْض", hint: "Allah created the heavens and the ___", verse: "Surah Al-A'raf 7:54 — It is He who created the heavens and earth in six days.", arabicVerse: "إِنَّ رَبَّكُمُ اللَّهُ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ فِي سِتَّةِ أَيَّامٍ" },
        { id: 9, word: "كتاب", display: "كِتَاب", hint: "The Quran is also called Al-___", verse: "Surah Al-Baqarah 2:2 — This is the Book about which there is no doubt.", arabicVerse: "ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ" },
        { id: 10, word: "توبة", display: "تَوْبَة", hint: "Repentance - a door that is always open", verse: "Surah Al-Baqarah 2:222 — Indeed, Allah loves those who are constantly repentant.", arabicVerse: "إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ وَيُحِبُّ الْمُتَطَهِّرِينَ" },
        { id: 11, word: "جنة", display: "جَنَّة", hint: "Paradise - the ultimate reward", verse: "Surah Al-Baqarah 2:25 — Gardens beneath which rivers flow, wherein they abide eternally.", arabicVerse: "لَهُمْ جَنَّاتٌ تَجْرِي مِن تَحْتِهَا الْأَنْهَارُ خَالِدِينَ فِيهَا" },
        { id: 12, word: "صلاة", display: "صَلَاة", hint: "The second pillar of Islam", verse: "Surah Al-Ankabut 29:45 — Indeed, prayer prohibits immorality and wrongdoing.", arabicVerse: "إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ" },
        { id: 13, word: "ذكر", display: "ذِكْر", hint: "Remembrance of Allah", verse: "Surah Ar-Ra'd 13:28 — Verily in the remembrance of Allah do hearts find rest.", arabicVerse: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ" },
        { id: 14, word: "حق", display: "حَقّ", hint: "Truth - one of Allah's names is Al-___", verse: "Surah Al-Isra 17:81 — Truth has come, and falsehood has departed.", arabicVerse: "جَاءَ الْحَقُّ وَزَهَقَ الْبَاطِلُ إِنَّ الْبَاطِلَ كَانَ زَهُوقًا" },
        { id: 15, word: "هدى", display: "هُدًى", hint: "Guidance - what the Quran provides", verse: "Surah Al-Baqarah 2:185 — A guidance for the people.", arabicVerse: "هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ مِّنَ الْهُدَىٰ وَالْفُرْقَانِ" },
        { id: 16, word: "ملك", display: "مَلِك", hint: "King/Sovereign - one of Allah's names", verse: "Surah Al-Fatiha 1:4 — The Sovereign of the Day of Recompense.", arabicVerse: "مَالِكِ يَوْمِ الدِّينِ" },
        { id: 17, word: "نار", display: "نَار", hint: "The fire - opposite of Jannah", verse: "Surah Al-Baqarah 2:24 — Fear the Fire, whose fuel is people and stones.", arabicVerse: "فَاتَّقُوا النَّارَ الَّتِي وَقُودُهَا النَّاسُ وَالْحِجَارَةُ" },
        { id: 18, word: "روح", display: "رُوح", hint: "The spirit/soul that Allah breathed into Adam", verse: "Surah Al-Hijr 15:29 — And I breathed into him of My spirit.", arabicVerse: "وَنَفَخْتُ فِيهِ مِن رُّوحِي" },
        { id: 19, word: "شمس", display: "شَمْس", hint: "A celestial body Allah swears by - the sun", verse: "Surah Ash-Shams 91:1 — By the sun and its brightness.", arabicVerse: "وَالشَّمْسِ وَضُحَاهَا" },
        { id: 20, word: "قمر", display: "قَمَر", hint: "A celestial body - the moon, a surah is named after it", verse: "Surah Al-Qamar 54:1 — The Hour has come near, and the moon has split.", arabicVerse: "اقْتَرَبَتِ السَّاعَةُ وَانشَقَّ الْقَمَرُ" },
        { id: 21, word: "ليل", display: "لَيْل", hint: "The opposite of day - Laylat al-Qadr is a blessed ___", verse: "Surah Al-Qadr 97:3 — The Night of Decree is better than a thousand months.", arabicVerse: "لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ" },
        { id: 22, word: "امن", display: "أَمْن", hint: "Safety/security - what Makkah was made a place of", verse: "Surah Al-Baqarah 2:125 — And when We made the House a place of return and security.", arabicVerse: "وَإِذْ جَعَلْنَا الْبَيْتَ مَثَابَةً لِّلنَّاسِ وَأَمْنًا" },
        { id: 23, word: "شكر", display: "شُكْر", hint: "Gratitude - Allah rewards those who show it", verse: "Surah Ibrahim 14:7 — If you are grateful, I will surely increase you.", arabicVerse: "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ" },
        { id: 24, word: "دعاء", display: "دُعَاء", hint: "Supplication - calling upon Allah", verse: "Surah Ghafir 40:60 — Call upon Me; I will respond to you.", arabicVerse: "ادْعُونِي أَسْتَجِبْ لَكُمْ" },
        { id: 25, word: "عدل", display: "عَدْل", hint: "Justice - Allah commands this", verse: "Surah An-Nahl 16:90 — Indeed, Allah orders justice and good conduct.", arabicVerse: "إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ" },
        { id: 26, word: "حكم", display: "حُكْم", hint: "Judgment/wisdom - given to prophets", verse: "Surah Sad 38:20 — And We gave him wisdom and decisive speech.", arabicVerse: "وَآتَيْنَاهُ الْحِكْمَةَ وَفَصْلَ الْخِطَابِ" },
        { id: 27, word: "نفس", display: "نَفْس", hint: "The soul - every one shall taste death", verse: "Surah Aal-Imran 3:185 — Every soul will taste death.", arabicVerse: "كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ" },
        { id: 28, word: "رزق", display: "رِزْق", hint: "Provision/sustenance - from Allah alone", verse: "Surah Adh-Dhariyat 51:22 — And in the heaven is your provision and whatever you are promised.", arabicVerse: "وَفِي السَّمَاءِ رِزْقُكُمْ وَمَا تُوعَدُونَ" },
        { id: 29, word: "تقوى", display: "تَقْوَى", hint: "God-consciousness - the best provision", verse: "Surah Al-Baqarah 2:197 — And take provisions, but indeed, the best provision is Taqwa.", arabicVerse: "وَتَزَوَّدُوا فَإِنَّ خَيْرَ الزَّادِ التَّقْوَىٰ" },
        { id: 30, word: "امانة", display: "أَمَانَة", hint: "The trust offered to heavens, earth, and mountains", verse: "Surah Al-Ahzab 33:72 — Indeed, We offered the trust to the heavens and the earth.", arabicVerse: "إِنَّا عَرَضْنَا الْأَمَانَةَ عَلَى السَّمَاوَاتِ وَالْأَرْضِ وَالْجِبَالِ" }
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

// Valid Arabic words for Wordle validation (Quranic vocabulary)
// Expanded list: answer words + common Quranic terms + verb forms + additional nouns
const VALID_WORDS = new Set([
    // ===== Answer words =====
    "رحمة","نور","قلب","سلام","صبر","علم","ماء","ارض","كتاب","توبة",
    "جنة","صلاة","ذكر","حق","هدى","ملك","نار","روح","شمس","قمر",
    "ليل","امن","شكر","دعاء","عدل","حكم","نفس","رزق","تقوى","امانة",

    // ===== Core Quranic vocabulary =====
    "الله","رب","دين","يوم","خير","شر","حمد","عبد","ايمان","اسلام",
    "زكاة","صوم","حج","جهاد","سبيل","حياة","موت","بعث","حساب","جزاء",
    "ثواب","عقاب","ظلم","كفر","شرك","نفاق","فسق","غفر","رحم","هدي",
    "ضلال","صراط","سنة","بدعة","فتنة","بلاء","نعمة","شفاء","بركة","خلق",

    // ===== Nature & creation =====
    "سماء","نجم","بحر","نهر","جبل","شجر","ثمر","زرع","حبة","نحل",
    "عنكب","نمل","بقر","فيل","حوت","كلب","طير","ابل","ذئب","غراب",
    "ريح","مطر","سحاب","برق","رعد","ظل","فلك","كوكب","بدر","هلال",
    "ورد","حديقة","بستان","واد","صحراء","تراب","طين","حجر","رمل","غبار",
    "دابة","غنم","بعير","حمار","ثعبان","جراد","ضفدع","قرد","خنزير","ناقة",
    "نخل","تمر","عنب","رمان","تين","زيتون","سدر","طلح","اثل","خردل",

    // ===== Prophets & figures =====
    "ادم","نوح","هود","صالح","لوط","يوسف","موسى","عيسى","مريم","داود",
    "يونس","ايوب","يعقوب","اسحق","زكريا","يحيى","الياس","ادريس","شعيب",
    "هارون","سليمان","اسماعيل","ابراهيم","محمد","خضر","لقمان","ذوالقرنين",
    "فرعون","هامان","قارون","جالوت","طالوت","ابولهب","اليسع","ذوالكفل",

    // ===== Angels & unseen =====
    "ملائك","جبريل","ميكال","عرش","كرسي","لوح","قلم","ميزان","صحف",
    "ملك","جن","شيطان","ابليس","وسوسة","سحر","عفريت","قرين","حور","ولدان",

    // ===== Quran & worship =====
    "قران","سورة","اية","وحي","تنزيل","حفظ","تلاوة","تدبر","تفسير",
    "مسجد","قبلة","محراب","منبر","اذان","وضوء","ركوع","سجود","خشوع",
    "طهارة","غسل","تيمم","قيام","تهجد","سحور","افطار","اعتكاف","طواف",
    "سعي","منى","عرفة","مزدلفة","جمرة","هدي","اضحية","عقيقة","نذر",

    // ===== Places =====
    "مكة","مدينة","بدر","احد","خندق","حنين","تبوك","خيبر","طائف",
    "مصر","شام","يمن","بابل","سبا","مدين","ايلة","طور","سينا","حراء",
    "كعبة","صفا","مروة","زمزم","عرفات","حجر","مقام","بيت","غار","ثور",

    // ===== Covenants, promises, and social =====
    "عهد","ميثاق","وعد","وعيد","بشرى","نذير","رسول","نبي","خليفة",
    "قوم","امة","قبيلة","اهل","ولي","عدو","كافر","مؤمن","مسلم","منافق",
    "صدق","كذب","خيانة","وفاء","عفو","انتقام","كبر","تواضع","حسد","غيبة",
    "شهيد","صديق","حبيب","اخ","اخت","ابن","بنت","ام","اب","زوج",
    "يتيم","مسكين","فقير","غني","اسير","عبد","حر","سيد","خادم","جار",

    // ===== Prayer times & time =====
    "فجر","ظهر","عصر","مغرب","عشاء","صبح","ضحى",
    "ساعة","لحظة","غد","امس","ابد","ازل","دهر","عام","شهر","اسبوع",

    // ===== Materials & valuables =====
    "ذهب","فضة","حديد","نحاس","لؤلؤ","مرجان","ياقوت","زبرجد","استبرق",
    "حرير","صوف","قطن","جلد","عسل","لبن","خمر","زيت","ملح","خبز",

    // ===== Afterlife & eschatology =====
    "جنة","نار","جهنم","سعير","حطمة","فردوس","عدن","كوثر","تسنيم","سلسبيل",
    "صراط","حوض","شفاعة","حشر","نشور","قيامة","ساعة","صور","نفخة","بعث",
    "حساب","كتاب","ميزان","اعراف","برزخ","قبر","عذاب","نعيم","خلود","فوز",

    // ===== Common Quranic verbs (root forms) =====
    "قال","جعل","جاء","كان","علم","عمل","امن","كفر","صبر","شكر",
    "ذكر","غفر","رحم","خلق","رزق","هدى","ضل","نصر","فتح","حكم",
    "سمع","بصر","نظر","فكر","عقل","فقه","تاب","دعا","سال","اجاب",
    "حمد","سبح","كبر","وحد","صلى","صام","زكى","حج","جاهد","انفق",
    "قرا","كتب","حفظ","بلغ","بين","فسر","وعظ","نصح","امر","نهى",
    "صدق","كذب","وعد","اوفى","خان","ظلم","عدل","احسن","اساء","اصلح",
    "افسد","بنى","هدم","زرع","حصد","اكل","شرب","لبس","سكن","سافر",
    "دخل","خرج","صعد","نزل","مشى","ركب","طار","سبح","غرق","نجا",
    "ولد","مات","عاش","نام","صحا","مرض","شفى","بكى","ضحك","فرح",
    "حزن","خاف","رجا","احب","كره","غضب","رضي","صبر","جزع","ندم",

    // ===== Attributes & descriptions =====
    "عظيم","كريم","رحيم","حكيم","عليم","قدير","سميع","بصير","لطيف","خبير",
    "غفور","شكور","حليم","ودود","مجيد","حميد","واحد","احد","صمد","قيوم",
    "حي","باقي","اول","اخر","ظاهر","باطن","عال","متعال","كبير","جليل",
    "جميل","طيب","طاهر","صالح","بر","تقي","زاهد","عابد","خاشع","صابر",
    "شاكر","ذاكر","مخلص","صادق","امين","وفي","عفيف","حيي","متواضع","رفيق",

    // ===== Warfare & events =====
    "غزوة","جيش","سيف","رمح","درع","خيل","نصر","فتح","هجرة","بيعة",
    "صلح","عقد","غنيمة","فداء","شورى","خلافة","امارة","ولاية","قضاء","فتوى",

    // ===== Body & senses =====
    "قلب","عين","اذن","لسان","يد","رجل","راس","وجه","صدر","بطن",
    "ظهر","جلد","عظم","دم","لحم","شعر","اصبع","كف","ذراع","ركبة",

    // ===== Miscellaneous common words =====
    "باب","دار","بيت","قصر","مدينة","قرية","سوق","طريق","جسر","سور",
    "كنز","مال","تجارة","ربح","خسارة","دين","قرض","صدقة","هبة","ميراث",
    "حكمة","موعظة","عبرة","مثل","قصة","خبر","نبا","رسالة","كلمة","حرف",
    "نعم","لا","كل","بعض","غير","مثل","اكبر","اصغر","احسن","اسوا",
    "فوق","تحت","يمين","شمال","امام","خلف","قريب","بعيد","داخل","خارج"
]);
