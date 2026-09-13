/* =========================================================================
   content.js — ALL editable text and media lives here.
   Edit this file to change the site. You never need to touch the HTML.

   Anything marked  ⚠️ PLACEHOLDER  is a guess or a stand-in. Replace it.
   Everything else was read directly off the production poster in images/.
   ========================================================================= */

const CONTENT = {

  /* ---------------------------------------------------------------- site */
  site: {
    name:     { en: "Fereshte Mohammadi", fa: "فرشته محمدی" },
    role:     { en: "Actress · Theatre & Screen", fa: "بازیگر تئاتر و سینما" },
    // Shown in the browser tab.
    title:    { en: "Fereshte Mohammadi — Actress", fa: "فرشته محمدی — بازیگر" },
    // Used for search results and link previews.
    metaDesc: {
      en: "Selected work of Fereshte Mohammadi, stage and screen actress. Nominated for Best Actress at the Fajr International Theater Festival.",
      fa: "برگزیده ای از کارهای فرشته محمدی، بازیگر تئاتر و سینما. نامزد بهترین بازیگر زن جشنواره بین المللی تئاتر فجر."
    }
  },

  /* ----------------------------------------------------------------- nav */
  nav: {
    about:     { en: "About",   fa: "درباره" },
    work:      { en: "Work",    fa: "آثار" },
    reel:      { en: "Reel",    fa: "ویدیو" },
    press:     { en: "Press",   fa: "رسانه" },
    contact:   { en: "Contact", fa: "تماس" }
  },

  /* ---------------------------------------------------------------- hero */
  hero: {
    // focus: which point of the photo must stay in frame when it's cropped
    // (e.g. on a phone). "x% y%" — raise x to favour the right, y the bottom.
    image: { file: "hero-snow.jpg", w: 2048, h: 1365, focus: "34% 40%" },

    // Greyscale depth map (white = near). Makes the hero move in 3D.
    // Set to null to use the still photograph instead.
    // Made from a colour depth export with tools/depth-from-colormap.py
    depth: "assets/depth/hero-snow.png",

    motion: {
      strength: .7,      // how far things move — try 0.6 for subtle, 1.6 for bold
      pivot: 0.75,      // depth that stays still; 0.75 is where she stands
      snow: true,       // extra drifting snow that passes behind and in front of her
      focusPull: true   // on arrival the focus racks from the snow onto her
    },

    // Follow-spot: a warm stage light that follows the mouse (or a tap on a
    // phone) and lights her in 3D using the surface-normal map.
    //   enabled: false   ← turn the light off
    light: {
      enabled: true,
      normals: "assets/depth/hero-snow.normals.jpg",  // made with tools/prepare-normals.py
      intensity: .5,     // brightness of the spot — 1 gentle, 1.4 theatrical, 1.8 strong
      dim: 0.42,          // how bright the rest of the stage stays — 0.62 softer, 1 = no dimming
      color: "#c5952d",   // warm tungsten; "#cfe0ff" for cold moonlight
      size: 0.45,         // radius of the pool of light (fraction of screen height)
      home: "34% 30%"     // where it rests when nobody steers it — her face
    },

    // Which side the name sits on. She stands left of centre in this photo,
    // so the name goes right, over the dark part of the frame.
    textSide: "right",

    // A short line under the name. Keep it very short.
    line:  { en: "Selected work — 2020 to present", fa: "برگزیدهٔ آثار — از ۱۳۹۹ تاکنون" },
    scroll:{ en: "Scroll", fa: "بچرخانید" }
  },

  /* ----------------------------------------------------------------- bio */
  bio: {
    heading:  { en: "About", fa: "درباره" },
    portrait: { file: "bio_img.jpg", w: 2986, h: 4480, focus: "45% 62%",
                alt: { en: "Fereshte Mohammadi on stage, lit against a black backdrop",
                       fa: "فرشته محمدی روی صحنه، در برابر پس‌زمینهٔ سیاه" } },

    // ⚠️ PLACEHOLDER — this is a draft built only from what the poster confirms.
    // Rewrite it in her own voice. Keep each paragraph short.
    paragraphs: {
      en: [
        "I, Fereshte Mohammadi, am a stage and screen actress working in Afghan and Persian-language theatre.",
        "My performance in <em>Death of Ashraf Ghani</em> — Ebrahim Beheshtkooh's adaptation staged on the edge of Bahram Beyzai's <em>Death of Yazdgerd</em> — earned me a nomination for Best Actress at the Fajr International Theater Festival in Tehran, Iran.",
        "I have had the privilege to perform in movies such as No Lastname, Parachute, Offering and The Whale.",
        "I work both in Dari and Persian, and I'm drawn to roles that carry the weight of a place and the people displaced from it."
      ],
      fa: [
        "من، فرشته محمدی بازیگر تئاتر و سینما و در تئاتر افغانستان و فارسی‌زبان فعالیت می‌کنم.",
        "بازی من در نمایش <em>مرگ اشرف غنی</em> — اثر ابراهیم بهشت‌کوه، بر لبهٔ روایت <em>مرگ یزدگرد</em> بهرام بیضایی — نامزدی بهترین بازیگر زن جشنوارهٔ بین‌المللی تئاتر فجر را برای من به همراه داشت.",
        "من همچنین افتخار بازی در فیلم های بدون نام‌خوانوادگی، پاراشوت، پیشکش و نهنگ‌ها را داشته‌ام.",
        "من به دری و فارسی صحبت می‌کنم و به نقش‌هایی علاقه‌مندم که بار یک سرزمین و مردمِ آواره‌شده از آن را بر دوش می‌کشند."
      ]
    },

    // Small facts printed beside the bio. Delete any row you don't want.
    facts: {
      en: [
        ["Languages", "Dari · Persian"],
        ["Based in",  "Tehran and Esfahan, Iran"],
        ["Training",  "Farhang Ava & Smile Theatre / Navid Mahmoodi & Vahid Jalilvand"]
      ],
      fa: [
        ["زبان‌ها",   "دری · فارسی"],
        ["ساکن",      "تهران و اصفهان، ایران"],
        ["تحصیلات",   "آموزشگاه فرهنگ آوا و تئاتر لبخند / استادها نوید محمودی و وحید جلیلوند"]
      ]
    }
  },

  /* ------------------------------------------------------------- credits */
  credits: {
    heading: { en: "Selected Credits", fa: "برگزیدهٔ کارنامه" },
    cols: {
      en: ["Production", "Role", "Director", "Year"],
      fa: ["نمایش", "نقش", "کارگردان", "سال"]
    },
    // artwork: optional poster image shown beside the row.
    // award:   optional highlighted line under the row.
    rows: [
      {
        production: { en: "Death of Ashraf Ghani", fa: "مرگ اشرف غنی" },
        note:       { en: "after Bahram Beyzai's <em>Death of Yazdgerd</em>",
                      fa: "بر لبهٔ روایت <em>مرگ یزدگرد</em> بهرام بیضایی" },
        role:       { en: "Firouze", fa: "فیروزه" },
        director:   { en: "Ebrahim Beheshtkooh", fa: "ابراهیم بهشت‌کوه" },
        year:       { en: "2026", fa: "۱۴۰۵" },
        award:      { en: "Nominated — Best Actress, Fajr International Theater Festival",
                      fa: "نامزد بهترین بازیگر زن — جشنوارهٔ بین‌المللی تئاتر فجر" },
        artwork:    { file: "ashraf_ghani_poster.JPG", w: 3851, h: 6000 }
      },
      // ⚠️ PLACEHOLDER — the colourful, snow-lit production in the photos.
      // Fill in its real title and details, or delete this row.
      {
        production: { en: "No Lastname", fa: "بدون نشان" },
        note:       { en: "", fa: "" },
        role:       { en: "Fereshte", fa: "فرشته" },
        director:   { en: "Mohammad Reza Sattari", fa: "محمدرضا ستاری" },
        year:       { en: "2026", fa: "۱۴۰۵" },
        award:      { en: "Awarded — Best International Feature Nominee, Raindance, London, UK",
                      fa: "برنده بهترین فیلم بلند سینمایی، جشنواره Raindance، انگلیس" },
        artwork:    { file: "no_lastname.jpg", w: 1254, h: 1254 }
      },
      {
        production: { en: "Parachute", fa: "پاراشوت" },
        note:       { en: "", fa: "" },
        role:       { en: "Fereshte", fa: "فرشته" },
        director:   { en: "Yaser Parsa", fa: "یاسر پارسا" },
        year:       { en: "2025", fa: "۱۴۰۴" },
        award:      null,
        artwork:    { file: "Parachute.jpg", w: 1254, h: 1254 }
      },
      {
        production: { en: "Offering", fa: "پیشکش" },
        note:       { en: "", fa: "" },
        role:       { en: "Samine", fa: "ثمینه" },
        director:   { en: "Gholam reza Jafari", fa: "غلام‌رضا جعفری" },
        year:       { en: "2021", fa: "۱۴۰۰" },
        award:      null,
        artwork:    { file: "pishkesh.jpg", w: 1254, h: 1254 }
      },
      {
        production: { en: "The Whales", fa: "نهنگ‌ها" },
        note:       { en: "", fa: "" },
        role:       { en: "Fereshte", fa: "فرشته" },
        director:   { en: "Noorina Ahmadi", fa: "نورینا احمدی" },
        year:       { en: "2020", fa: "۱۳۹۹" },
        award:      null,
        artwork:    { file: "nahang_ha.jpg", w: 1254, h: 1254 }
      }
    ]
  },

  /* ------------------------------------------------------------- gallery */
  gallery: {
    heading: { en: "Work", fa: "آثار" },
    intro:   { en: "Production stills from stage.", fa: "تصاویری از صحنه." },
    // Default caption used when an image has no caption of its own.
    fallbackCaption: { en: "Production still", fa: "تصویری از صحنه" },

    /* One line per photo, shown in this order. Move a line to reorder.

       Options you can add inside the { } of any line:

         hide: true         leave it out of the site (keeps the line for later)
         ratio: "4/5"       crop to a shape: "1/1" square, "4/5" or "2/3" portrait,
                            "16/9" or "21/9" wide. Left out = the photo's own shape.
         focus: "50% 30%"   what to keep when cropping (x% y% from top-left)
         span: 4            width on desktop, out of 12 (4 = a third, 6 = half,
                            12 = full). Left out = an automatic rhythm.
         band: true         shortcut for span 12 + ratio "21/9"
         caption: { en: "…", fa: "…" }

       Examples:
         { file: "7 (32).jpg", w: 2000, h: 1333, hide: true },
         { file: "IMG_3926.JPG", w: 5908, h: 3939, ratio: "4/5", focus: "40% 50%", span: 4 },

       The lightbox always shows the whole, uncropped photo. */
    items: [
      // { file: "IMG_3715.JPG", w: 4802, h: 3202 },
      // { file: "1 (35).JPG",   w: 2000, h: 1333 },
      { file: "IMG_3933.JPG", w: 2000, h: 1333 },
      { file: "1 (26).JPG",   w: 2000, h: 1333 },
      { file: "7 (32).jpg",   w: 2000, h: 1333 },
      { file: "7 (29).jpg",   w: 2000, h: 1333 },
      { file: "IMG_3771.JPG", w: 5247, h: 3499, band: true },
      { file: "7 (64).jpg",   w: 2000, h: 1333 },
      { file: "243A4960.jpg", w: 2986, h: 4480, span: 4 },
      
      { file: "IMG_3684.JPG", w: 5848, h: 3899 },
      { file: "IMG_3799.JPG", w: 5428, h: 3619 },
      
      { file: "IMG_3825.JPG", w: 5780, h: 3854 },
      { file: "7 (36).jpg",   w: 2000, h: 1333 },
      { file: "7 (30).jpg",   w: 2000, h: 1333 },
      // { file: "7 (31).jpg",   w: 2000, h: 1333 },
      // { file: "IMG_3594.JPG", w: 4880, h: 3253, band: true },
      { file: "IMG_3926.JPG", w: 2000, h: 1333 },
      { file: "IMG_3969.JPG", w: 2000, h: 1333 },
      // { file: "7 (34).jpg",   w: 2000, h: 1333 },
      { file: "IMG_1018.JPG", w: 2000, h: 1333 },
      { file: "7 (37).jpg",   w: 2000, h: 1333 },
      { file: "IMG_3800.JPG", w: 2000, h: 1333 },
      { file: "4 (49).jpg",   w: 2000, h: 1333 },
      { file: "IMG_3889.JPG", w: 2000, h: 1333 },
      { file: "_fereshtemohammadi_-14.JPG", w: 4969, h: 3314 },
      { file: "IMG_1047.HEIC", w: 2000, h: 1333 },
      { file: "IMG_1038.HEIC", w: 5968, h: 3979 },
      { file: "IMG_1110.PNG", w: 5430, h: 3620 },

      { file: "IMG-20210717-WA0243.jpg", w: 5430, h: 3620 },
      { file: "IMG-20210717-WA0250.jpg", w: 5430, h: 3620 },
      { file: "IMG-20210717-WA0256.jpg", w: 5430, h: 3620 },
      { file: "IMG-20210717-WA0258.jpg", w: 5430, h: 3620 },
      { file: "IMG-20210924-WA0023.jpg", w: 5430, h: 3620 },
      { file: "IMG-20210924-WA00231.jpeg", h: 5430, w: 3620 },

      { file: "IMG_1746.jpg", h: 2000, w: 1333 },
      { file: "IMG_1760.jpg", h: 2000, w: 1333 },
      // { file: "IMG_1110.PNG", w: 5430, h: 3620 },
      // { file: "IMG_1110.PNG", w: 5430, h: 3620 },
    ]
  },

  /* ---------------------------------------------------------------- reel */
  reel: {
    heading: { en: "Reel", fa: "ویدیو" },
    intro:   { en: "Scenes and moments from rehearsal and performance.",
               fa: "صحنه‌هایی از تمرین و اجرا." },
    play:    { en: "Play", fa: "پخش" },
    /* Width follows each clip's w and h: landscape (w > h) takes half the row,
       upright a quarter. To override one, add span: 1–4 (quarters of the row),
       e.g. span: 4 for a full-width trailer. */
    items: [
      // {
      //   // ⚠️ PLACEHOLDER titles — rename these to what they actually are.
      //   title:  { en: "Scene - Death of Ashraf Ghani", fa: "صحنه — مرگ اشرف غنی" },
      //   src:    "img-5559.mp4",
      //   poster: "assets/posters/img-5559.jpg",
      //   w: 1080, h: 1920, duration: "1:04",   // shot on a phone, held upright
      //   // HEVC .MOV — will not play in Chrome or Firefox until transcoded.
      //   needsTranscode: true
      // },
      {
        title:  { en: "Short clip", fa: "کلیپ کوتاه" },
        src:    "_fereshtemohammadi_6.mp4",
        poster: "assets/posters/fereshtemohammadi-6.jpg",
        h: 1280, w: 720, duration: "0:25",
        needsTranscode: true,
        band: true
      },
      {
        title:  { en: "Scene - Death of Ashraf Ghani", fa: "صحنه — مرگ اشرف غنی" },
        src:    "img-8083.mp4",
        poster: "assets/posters/img-8083.jpg",
        w: 1080, h: 1920, duration: "0:20",
        needsTranscode: true
      },
      {
        title:  { en: "Scene - Death of Ashraf Ghani", fa: "صحنه — مرگ اشرف غنی" },
        src:    "img-2155.mp4",
        poster: "assets/posters/img-2155.jpg",
        w: 1080, h: 1920, duration: "2:31",
        needsTranscode: false
      },
      {
        title:  { en: "Short clip", fa: "کلیپ کوتاه" },
        src:    "_fereshtemohammadi_-2.mp4",
        poster: "assets/posters/fereshtemohammadi-2.jpg",
        h: 1280, w: 720, duration: "0:25",
        needsTranscode: false
      },
      {
        title:  { en: "Trailer", fa: "تیزر" },
        src:    "no_lastname.mp4",
        poster: "assets/posters/no-lastname.jpg",
        w: 1280, h: 720, duration: "1:32",
        needsTranscode: true,
        band: true
      },
      {
        title:  { en: "Short clip", fa: "کلیپ کوتاه" },
        src:    "little_girl.mp4",
        poster: "assets/posters/little_girl.jpg",
        w: 1280, h: 720, duration: "0:15",
        needsTranscode: false
      },
      {
        title:  { en: "Practice", fa: "تمرین" },
        src:    "fereshte-dialouge.mp4",
        poster: "assets/posters/fereshte-dialouge.jpg",
        w: 1280, h: 720, duration: "0:25",
        needsTranscode: true,
        band: true
      },
      {
        title:  { en: "Short clip", fa: "کلیپ کوتاه" },
        src:    "_fereshtemohammadi_-4.mp4",
        poster: "assets/posters/fereshtemohammadi-4.jpg",
        w: 1280, h: 720, duration: "0:25",
        needsTranscode: true,
        band: true
      },
      {
        title:  { en: "Short clip", fa: "کلیپ کوتاه" },
        src:    "_fereshtemohammadi_-3.mp4",
        poster: "assets/posters/fereshtemohammadi-3.jpg",
        h: 1280, w: 720, duration: "0:25",
        needsTranscode: true
      },
      {
        title:  { en: "Short clip", fa: "کلیپ کوتاه" },
        src:    "preparation.mp4",
        poster: "assets/posters/preparation.jpg",
        h: 1280, w: 720, duration: "0:32",
        needsTranscode: true
      },
      
    ]
  },

  /* --------------------------------------------------------------- press */
  press: {
    heading: { en: "Press", fa: "رسانه" },
    intro:   { en: "Interviews, reviews and conversations.",
               fa: "گفت‌وگوها، نقدها و گزارش‌ها." },

    /* One entry per article, interview or broadcast. Newest first is best —
       they are shown in the order you list them.

         outlet:   "Name of the publication or channel"
         title:    "Headline exactly as published, in its own language"
         lang:     "fa" or "en" — the language of the piece. Persian headlines
                   and quotes then read right-to-left even on the English site.
         kind:     "interview" | "review" | "feature" | "report" | "festival"
                   | "video" | "podcast"
         date:     "2025-03-14"  (or "2025-03", or just "2025")
         url:      "https://…"   leave out if there's no link
         by:       "Interviewer or critic"            (optional)
         quote:    "A line from the piece, in its own language"   (optional)
         featured: true   shows this entry's quote large above the list
                          (use it on one entry)
         video:    "interview.mp4"   a clip of the piece, played right on the page.
                   Put the file in images/ and run tools/optimize-media.sh.

       Delete an entry, or add hide: true, to take it off the site.
       With no entries left, the Press section and its menu link disappear. */
    items: [
      // ⚠️ PLACEHOLDERS — replace with the real interviews.
      {
        outlet:   "Khabar Online",
        title:    "A story of the stifling of art and music under the heavy shadow of the Taliban - told by an Afghan actress",
        lang:     "fa",
        kind:     "interview",
        date:     "2026-08",
        url:      "https://khabaronline.ir/xqcvh",
        video:    "interview.mp4",   // clip of the interview — the file is in images/
        // by:       "خبرآنلاین",
        // quote:    "«هیچ‌کس، هیچ‌وقت به ما پناه نداد»",
      },
      {
        outlet:   "Fajr International Film Festival",
        title:    "Nominees for the 44th Fajr Theater Festival",
        lang:     "fa",
        kind:     "Festival",
        date:     "2026-02",
        url:      "https://theater.ir/ci/fa/195129"
      },
      {
        outlet:   "Fararu",
        title:    "A visual report on the Death of Ashraf Ghani",
        lang:     "fa",
        kind:     "report",
        date:     "2026-08",
        url:      "https://fararu.com/fa/tiny/news-992690"
      },
      {
        outlet:   "No Lastname",
        title:    "A film about an Iranian father's desperate struggle to obtain identity cards for his family and protect them from poverty and social exclusion.",
        lang:     "fa",
        kind:     "feature",
        date:     "2026",
        url:      "https://www.imdb.com/title/tt42496927/",
        video:    "no_lastname.mp4",   // clip of the interview — the file is in images/
        // by:       "خبرآنلاین",
        // quote:    "«هیچ‌کس، هیچ‌وقت به ما پناه نداد»",
      },
      {
        outlet:   "Ilna",
        title:    "Death of Ashraf Ghani",
        lang:     "fa",
        kind:     "report",
        date:     "2026-08",
        url:      "https://www.ilna.ir/fa/tiny/news-1823167"
      },
      {
        outlet:   "Tiwall",
        title:    "Fereshte Mohammadi, Twall page",
        lang:     "fa",
        kind:     "feature",
        // date:     "2026-08",
        url:      "https://www.tiwall.com/fereshtemohammadi"
      },
      {
        outlet:   "IRIB",
        title:    "Parachute, a featured movie IRIB",
        lang:     "fa",
        kind:     "feature",
        date:     "2025",
        url:      "https://iribtv.ir/news/453507",
        video:    "Parachute_video.mp4",   // clip of the interview — the file is in images/
        // by:       "خبرآنلاین",
        // quote:    "«هیچ‌کس، هیچ‌وقت به ما پناه نداد»",
      },
    ],

    kinds: {
      interview: { en: "Interview", fa: "گفت‌وگو" },
      review:    { en: "Review",    fa: "نقد" },
      feature:   { en: "Feature",   fa: "گزارش" },
      video:     { en: "Video",     fa: "ویدیو" },
      podcast:   { en: "Podcast",   fa: "پادکست" },
      report:    { en: "Report",    fa: "گزارش" },
      festival:  { en: "Festival",  fa: "جشنواره" }
    },
    // The link label depends on the kind of piece.
    actions: {
      read:   { en: "Read",   fa: "خواندن" },
      watch:  { en: "Watch",  fa: "تماشا" },
      listen: { en: "Listen", fa: "شنیدن" },
      clip:   { en: "Watch clip", fa: "تماشای ویدیو" }
    },
    // Shown when a piece is in a different language from the page.
    inLang: {
      fa: { en: "in Persian", fa: "به فارسی" },
      en: { en: "in English", fa: "به انگلیسی" }
    },
    by: { en: "by", fa: "از" }
  },

  /* ----------------------------------------------------------- instagram */
  instagram: {
    heading: { en: "Elsewhere", fa: "جاهای دیگر" },
    // ⚠️ PLACEHOLDER — put the real handle here.
    handle: "_fereshte.mohammadi_",
    url:    "https://www.instagram.com/_fereshte.mohammadi_/",
    cta:    { en: "Follow on Instagram", fa: "دنبال کنید در اینستاگرام" },
    // A hand-picked strip. These link out to the profile.
    picks: [
      { file: "_fereshtemohammadi_-3.jpg",   w: 2000, h: 1333 },
      { file: "_fereshtemohammadi_-11.JPG", w: 5463, h: 3643 },
      // { file: "IMG_3715.JPG", w: 4802, h: 3202 },
      { file: "_fereshtemohammadi_.jpg",   w: 2000, h: 1333 },
      // { file: "1 (35).JPG",   w: 2000, h: 1333 },
      { file: "_fereshtemohammadi_6.JPG", w: 4969, h: 3314 },
      // { file: "7 (32).jpg",   w: 2000, h: 1333 },
      { file: "_fereshtemohammadi_-9.jpg",   w: 2000, h: 1333 },
      { file: "_fereshtemohammadi_-2.jpg",   w: 2000, h: 1333 }
    ]
  },

  /* ------------------------------------------------------------- contact */
  contact: {
    heading: { en: "Contact", fa: "تماس" },
    lead:    { en: "For casting, press and enquiries, DM me in instagram. Or use the email below.", fa: "برای انتخاب بازیگر، رسانه و همکاری میتوانید به اینستاگرامم پیام دهید و یا از ایمیل زیر استفاده کنید." },
    // body: {en: "Or simply DM me in Instagram"},
    // ⚠️ PLACEHOLDER — set the real address.
    email:   "fereshte.mohammadi.f@gmail.com",
    // agencyLabel: { en: "Representation", fa: "نمایندگی" },
    // agency:  { en: "⚠️ Agency name — agent@example.com", fa: "⚠️ نام نمایندگی — agent@example.com" },
    emailLabel: { en: "Email", fa: "ایمیل" },
    // credit:  { en: "Stage photography by ⚠️ photographer.", fa: "عکاسی صحنه: ⚠️ نام عکاس." }
  },

  /* -------------------------------------------------------------- footer */
  footer: {
    rights: { en: "All rights reserved.", fa: "تمام حقوق محفوظ است." },
    top:    { en: "Back to top", fa: "بازگشت به بالا" }
  },

  /* ------------------------------------------------------------- a11y/ui */
  ui: {
    langToggle: { en: "فارسی", fa: "English" },
    close:      { en: "Close", fa: "بستن" },
    prev:       { en: "Previous image", fa: "تصویر قبلی" },
    next:       { en: "Next image", fa: "تصویر بعدی" },
    menu:       { en: "Menu", fa: "فهرست" },
    of:         { en: "of", fa: "از" }
  }
};
