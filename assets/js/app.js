/* =========================================================================
   app.js — renders every string from content.js so the language toggle
   can never leave a stale fragment behind. No dependencies.
   ========================================================================= */
(() => {
  "use strict";

  const C = CONTENT;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const LANGS = ["en", "fa"];
  const STORE = "fm-lang";

  let lang = (() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (LANGS.includes(saved)) return saved;
    } catch { /* private mode — fall through */ }
    return navigator.language?.startsWith("fa") ? "fa" : "en";
  })();

  /* Pick the current language out of a {en, fa} pair. Plain strings pass through. */
  const t = (v) => (v && typeof v === "object" && !Array.isArray(v)) ? (v[lang] ?? v.en ?? "") : (v ?? "");

  /* Source files live in images/ and many contain spaces and parentheses. */
  const src = (file) => "images/" + encodeURIComponent(file);

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]
  ));

  /* ---------------------------------------------------------------- media ---
     tools/optimize-media.sh writes assets/js/media.js, which defines
     window.MEDIA. When it is absent the site simply serves the originals,
     so the page works before the optimizer has ever been run. */
  const MEDIA = (typeof window !== "undefined" && window.MEDIA) || null;

  /* Look names up exactly first, then ignoring letter case: "IMG_3771.JPG" in
     content.js still finds the optimized "IMG_3771.jpg". Web hosts are
     case-sensitive, so an exact-only lookup would break those photos there. */
  const lookup = (table, name) => {
    if (!table || !name) return null;
    if (table[name]) return table[name];
    const want = String(name).toLowerCase();
    const key = Object.keys(table).find((k) => k.toLowerCase() === want);
    return key ? table[key] : null;
  };
  const imgEntry = (file) => lookup(MEDIA?.images, file);
  const vidEntry = (file) => lookup(MEDIA?.videos, file);

  /* The optimizer records each photo's true, upright size. Prefer it over the
     w/h typed into content.js, which are only a fallback. */
  const dimsOf = (file, meta = {}) => {
    const m = imgEntry(file);
    return m?.w && m?.h ? { w: m.w, h: m.h } : { w: meta.w || 3, h: meta.h || 2 };
  };

  /* Video poster frames that tools/optimize-media.sh has also saved as AVIF +
     WebP. Only these get <picture> sources; anything else stays a plain JPEG,
     so a newly added poster can never point at a file that doesn't exist. */
  const posterFiles = new Map((MEDIA?.posters || []).map((p) => [p.toLowerCase(), p]));
  function posterPicture(path, cls = "") {
    if (!path) return "";
    const c = cls ? ` class="${cls}"` : "";
    const known = posterFiles.get(String(path).toLowerCase());
    const img = `<img${c} src="${esc(known || path)}" alt="" loading="lazy" decoding="async">`;
    if (!known) return img;
    const stem = known.replace(/\.jpe?g$/i, "");
    return `<picture><source type="image/avif" srcset="${esc(stem)}.avif">` +
           `<source type="image/webp" srcset="${esc(stem)}.webp">${img}</picture>`;
  }

  const srcset = (m, ext) =>
    m.widths.map((w) => `${m.base}-${w}.${ext} ${w}w`).join(", ");

  const biggest = (m, ext = "jpg") => `${m.base}-${m.widths[m.widths.length - 1]}.${ext}`;

  /* Best format this browser decodes, for the few places an <img> can't use
     <picture> fallbacks (the lightbox and its preloads). Starts at WebP, which
     every current browser has, and upgrades once an AVIF test image decodes. */
  let bestExt = "webp";
  (() => {
    const probe = new Image();
    probe.onload = () => { if (probe.width > 0) bestExt = "avif"; };
    probe.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUEAAADrbWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAAAAAAAOcGl0bQAAAAAAAQAAAB5pbG9jAAAAAEQAAAEAAQAAAAEAAAETAAAAHAAAAChpaW5mAAAAAAABAAAAGmluZmUCAAAAAAEAAGF2MDFDb2xvcgAAAABqaXBycAAAAEtpcGNvAAAAFGlzcGUAAAAAAAAAAQAAAAEAAAAQcGl4aQAAAAADCAgIAAAADGF2MUOBIAAAAAAAE2NvbHJuY2x4AAEAAgAGgAAAABdpcG1hAAAAAAAAAAEAAQQBAoMEAAAAJG1kYXQSAAoHOAAGkBAgaTIPF4JjBMJJJJ8ghACQPnHI";
  })();

  /* A <picture> when optimized assets exist, a plain <img> when they don't. */
  function picture(file, meta, o = {}) {
    const alt     = esc(o.alt || "");
    const loading = o.loading || "lazy";
    const sizes   = o.sizes || "100vw";
    const cls     = o.cls ? ` class="${o.cls}"` : "";
    const pos     = o.position ? `object-position:${esc(o.position)};` : "";
    const prio    = loading === "eager" ? ' fetchpriority="high"' : "";
    const { w, h } = dimsOf(file, meta);
    const dims    = `width="${w}" height="${h}"`;
    const m       = imgEntry(file);

    if (!m) {
      return `<img${cls} src="${src(file)}" ${dims} loading="${loading}"` +
             `${prio} decoding="async" alt="${alt}"${pos ? ` style="${pos}"` : ""}>`;
    }
    // The blurred placeholder sits behind the image until it paints.
    const bg = (m.lqip || pos)
      ? ` style="${pos}${m.lqip ? `background:url('${m.lqip}') center/cover no-repeat` : ""}"` : "";
    return `<picture>` +
      (m.avif ? `<source type="image/avif" srcset="${srcset(m, "avif")}" sizes="${sizes}">` : "") +
      `<source type="image/webp" srcset="${srcset(m, "webp")}" sizes="${sizes}">` +
      `<img${cls} src="${biggest(m)}" srcset="${srcset(m, "jpg")}" sizes="${sizes}" ` +
      `${dims} loading="${loading}"${prio} decoding="async" alt="${alt}"${bg}>` +
      `</picture>`;
  }

  /* Same idea for the two <img> elements that live in index.html. */
  function applyImg(img, file, meta, sizes) {
    const m = imgEntry(file);
    const { w, h } = dimsOf(file, meta);
    img.width = w;
    img.height = h;
    const sources = img.parentElement?.tagName === "PICTURE"
      ? [...img.parentElement.querySelectorAll("source")] : [];

    if (!m) {
      img.removeAttribute("srcset");
      sources.forEach((sEl) => sEl.removeAttribute("srcset"));
      img.src = src(file);
      return;
    }
    sources.forEach((sEl) => {
      const ext = sEl.type === "image/avif" ? "avif" : "webp";
      if (ext === "avif" && !m.avif) { sEl.removeAttribute("srcset"); return; }
      sEl.srcset = srcset(m, ext);
      sEl.sizes  = sizes;
    });
    img.srcset = srcset(m, "jpg");
    img.sizes  = sizes;
    img.src    = biggest(m);
    if (m.lqip) img.style.background = `url('${m.lqip}') center/cover no-repeat`;
  }


  const reduceMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===================================================== gallery rhythm ===
     A repeating pattern of 12-column spans. Each line sums to 12, so rows
     stay full while the widths keep changing as you scroll. */
  const RHYTHM = [
    7, 5,
    4, 4, 4,
    5, 7,
    6, 6,
    8, 4,
    4, 4, 4,
    7, 5,
    6, 6
  ];

  /* ============================================================= render === */

  function renderHead() {
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === "fa" ? "rtl" : "ltr";
    document.title = t(C.site.title);
    $('meta[name="description"]')?.setAttribute("content", t(C.site.metaDesc));
  }

  function renderNav() {
    $("#navName").textContent = t(C.site.name);
    $("#navAbout").textContent   = t(C.nav.about);
    $("#navWork").textContent    = t(C.nav.work);
    $("#navReel").textContent    = t(C.nav.reel);
    $("#navPress").textContent   = t(C.nav.press);
    $("#navContact").textContent = t(C.nav.contact);

    const btn = $("#langBtn");
    btn.textContent = t(C.ui.langToggle);
    // The button offers the OTHER language, so label it in that language.
    btn.setAttribute("lang", lang === "en" ? "fa" : "en");
    btn.setAttribute("aria-label",
      lang === "en" ? "نمایش به فارسی" : "Switch to English");
  }

  function renderHero() {
    const h = C.hero;
    const img = $("#heroImg");
    // A "cover" crop on a screen narrower than the photo's own shape shows only
    // its middle, so the file must be as wide as 100vh × the photo's ratio.
    const hd = dimsOf(h.image.file, h.image);
    applyImg(img, h.image.file, h.image,
      `(max-aspect-ratio: ${hd.w}/${hd.h}) ${Math.round(hd.w / hd.h * 100)}vh, 100vw`);
    img.alt = "";
    // Keeps the subject in frame when the hero is cropped to a phone screen.
    img.style.objectPosition = h.image.focus || "center 32%";

    // Split the name so the surname can sit on its own line in italic gold.
    const full = t(C.site.name).trim();
    const bits = full.split(/\s+/);
    const last = bits.length > 1 ? bits.pop() : "";
    $("#heroName").innerHTML =
      esc(bits.join(" ")) + (last ? `<em>${esc(last)}</em>` : "");

    $("#hero").classList.toggle("hero--text-right", h.textSide === "right");
    $("#heroRole").textContent = t(C.site.role);
    $("#heroLine").textContent = t(h.line);
    $("#heroScrollTxt").textContent = t(h.scroll);
  }

  function renderBio() {
    const b = C.bio;
    $("#bioEyebrow").textContent = t(b.heading);

    const p = $("#bioPortrait");
    applyImg(p, b.portrait.file, b.portrait, "(max-width: 860px) 100vw, 40vw");
    p.alt = t(b.portrait.alt);
    p.style.objectPosition = b.portrait.focus || "center";

    // Paragraphs carry inline <em>, so they are authored HTML, not user input.
    $("#bioText").innerHTML = t(b.paragraphs).map((x) => `<p>${x}</p>`).join("");

    $("#bioFacts").innerHTML = t(b.facts).map(([k, v]) => `
      <div class="facts__row">
        <div class="facts__key">${esc(k)}</div>
        <div>${esc(v)}</div>
      </div>`).join("");
  }

  function renderCredits() {
    const c = C.credits;
    $("#creditsEyebrow").textContent = t(c.heading);

    const [pCol, rCol, dCol, yCol] = t(c.cols);
    $("#creditsHead").innerHTML = `
      <div></div><div>${esc(pCol)}</div><div>${esc(rCol)}</div>
      <div>${esc(dCol)}</div><div style="text-align:end">${esc(yCol)}</div>`;

    $("#creditsList").innerHTML = c.rows.map((row) => {
      const art = row.artwork ? `
        <div class="credit__art">${picture(row.artwork.file, row.artwork, {
          alt: `${t(row.production)} poster`, sizes: "72px"
        })}</div>` : `<div></div>`;

      const note = t(row.note)
        ? `<span class="credit__note">${t(row.note)}</span>` : "";

      const award = row.award
        ? `<div class="credit__award">${esc(t(row.award))}</div>` : "";

      return `
        <div class="credit">
          ${art}
          <div>
            <div class="credit__title">${esc(t(row.production))}</div>
            ${note}
          </div>
          <div class="credit__cell">${esc(t(row.role))}</div>
          <div class="credit__cell">${esc(t(row.director))}</div>
          <div class="credit__cell credit__year">${esc(t(row.year))}</div>
          ${award}
        </div>`;
    }).join("");
  }

  /* Photos marked hide: true stay in content.js but not on the page. */
  const galleryItems = () => C.gallery.items.filter((it) => !it.hide);

  /* "4/5", "4:5" or "4 / 5" → "4 / 5"; anything else → null. */
  function parseRatio(r) {
    const m = String(r ?? "").match(/^\s*(\d+(?:\.\d+)?)\s*[/:x]\s*(\d+(?:\.\d+)?)\s*$/);
    return m ? `${m[1]} / ${m[2]}` : null;
  }

  function renderGallery() {
    const g = C.gallery;
    $("#workEyebrow").textContent = t(g.heading);
    $("#workIntro").textContent   = t(g.intro);

    $("#gallery").innerHTML = galleryItems().map((it, i) => {
      const band = it.band === true;
      const span = it.span ?? (band ? 12 : RHYTHM[i % RHYTHM.length]);
      // A photo keeps its true proportions unless it asks for a crop, so no
      // performance gets cropped by accident.
      const real = dimsOf(it.file, it);
      const ar = parseRatio(it.ratio) || (band ? "21 / 9" : `${real.w} / ${real.h}`);
      const cap = t(it.caption) || t(g.fallbackCaption);
      const alt = t(it.alt) || cap;
      const offset = (!band && i % 3 === 2) ? " shot--offset" : "";

      return `
        <figure class="shot${offset}" data-band="${band}" data-i="${i}"
                style="--span:${span}; --ar:${ar}">
          <div class="shot__frame">${picture(it.file, it, {
            alt,
            position: it.focus,
            loading: i < 4 ? "eager" : "lazy",
            sizes: `(max-width: 560px) 100vw, (max-width: 900px) 50vw, ${Math.round(span / 12 * 100)}vw`
          })}</div>
          <span class="shot__num">${String(i + 1).padStart(2, "0")}</span>
          <figcaption class="visually-hidden">${esc(cap)}</figcaption>
        </figure>`;
    }).join("");
  }

  const PLAY_ICON =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  function renderReel() {
    const r = C.reel;
    $("#reelEyebrow").textContent = t(r.heading);
    $("#reelIntro").textContent   = t(r.intro);

    $("#reelGrid").innerHTML = r.items.map((v, i) => {
      const ar = `${v.w} / ${v.h}`;
      // Width out of 4 columns: landscape clips take half the row, upright
      // ones a quarter. `span: 1–4` on an item overrides it.
      const span = Math.min(4, Math.max(1, Math.round(+v.span) || (v.w > v.h ? 2 : 1)));
      // Once optimize-media.sh has produced an MP4, the warning is obsolete.
      const warn = (v.needsTranscode && !vidEntry(v.src))
        ? `<div class="clip__warn" title="HEVC .MOV — run tools/optimize-media.sh so this plays in Chrome and Firefox">HEVC</div>`
        : "";
      return `
        <figure class="clip" data-i="${i}" data-span="${span}" style="--ar:${ar}">
          ${warn}
          <div class="clip__frame">
            ${posterPicture(v.poster || vidEntry(v.src)?.poster, "clip__poster")}
            <button class="clip__play" type="button"
                    aria-label="${esc(t(r.play))}: ${esc(t(v.title))}">
              <span>${PLAY_ICON}</span>
            </button>
          </div>
          <figcaption class="clip__cap">
            <span>${esc(t(v.title))}</span>
            <span class="clip__dur">${esc(v.duration || "")}</span>
          </figcaption>
        </figure>`;
    }).join("");

    // Nothing is fetched until the viewer actually presses play.
    $$("#reelGrid .clip").forEach((fig) => {
      $(".clip__play", fig).addEventListener("click", () => {
        const item = r.items[+fig.dataset.i];
        const frame = $(".clip__frame", fig);
        const vm = vidEntry(item.src);
        const video = document.createElement("video");
        if (vm) {
          // WebM first, then MP4 — the browser takes the first it can decode.
          video.innerHTML =
            `<source src="${vm.webm}" type="video/webm">` +
            `<source src="${vm.mp4}" type="video/mp4">`;
        } else {
          video.src = src(item.src);
        }
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        video.preload = "metadata";
        // Reuse the frame the card already downloaded (AVIF/WebP) — no second request.
        video.setAttribute("poster", $(".clip__poster", fig)?.currentSrc || item.poster || vm?.poster || "");
        frame.appendChild(video);
        fig.classList.add("is-playing");
        video.play().catch(() => { /* user gesture already given; ignore */ });
      });
    });
  }

  const IG_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<rect x="3" y="3" width="18" height="18" rx="5"/>' +
    '<circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>';

  /* ================================================================ press === */

  const ARROW_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<path d="M7 17L17 7M9 7h8v8"/></svg>';

  const pressItems = () => (C.press?.items || []).filter((it) => !it.hide);

  /* Only real web links become clickable; anything else renders as plain text. */
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "");

  /* "2025-03-14" | "2025-03" | "2025" → formatted for the page language.
     A full date in Persian is converted to the Solar Hijri calendar. A month
     or a year alone can't be — March 2025 straddles Esfand 1403 and Farvardin
     1404 — so those stay Gregorian, written with Persian digits. */
  function pressDate(str) {
    const m = String(str || "").match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
    if (!m) return esc(str || "");
    const [, y, mo, d] = m;
    const date = new Date(Date.UTC(+y, mo ? +mo - 1 : 0, d ? +d : 1, 12));
    const opts = { timeZone: "UTC", year: "numeric" };
    if (mo) opts.month = d ? "short" : "long";
    if (d) opts.day = "numeric";
    try {
      const locale = lang !== "fa" ? "en-GB" : d ? "fa-IR" : "fa-IR-u-ca-gregory";
      return esc(new Intl.DateTimeFormat(locale, opts).format(date));
    } catch { return esc(str); }
  }

  /* Direction and font follow the text itself, not the entry's lang: an
     English translation of a Persian headline must still read left-to-right. */
  const textAttrs = (text) => {
    const str = String(text || "");
    if (/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(str)) return ' lang="fa" dir="rtl"';
    if (/[A-Za-z]/.test(str)) return ' lang="en" dir="ltr"';
    return ' dir="auto"';
  };

  const clock = (sec) => {
    const s = Math.round(+sec || 0);
    return s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "";
  };

  /* video: "interview.mp4"  or  { file, w, h, poster } — the file lives in images/
     and is picked up by tools/optimize-media.sh like the reel videos. */
  function pressVideo(it) {
    if (!it.video) return null;
    const v = typeof it.video === "string" ? { file: it.video } : it.video;
    if (!v.file) return null;
    const m = vidEntry(v.file);
    return {
      sources: m
        ? `<source src="${esc(m.webm)}" type="video/webm"><source src="${esc(m.mp4)}" type="video/mp4">`
        : `<source src="${src(v.file)}">`,
      poster: v.poster || m?.poster || "",
      ar: v.w && v.h ? `${v.w} / ${v.h}` : "16 / 9",
      duration: clock(m?.seconds)
    };
  }

  let openPlayer = null;   // only one interview clip plays at a time

  function closePressVideo() {
    if (!openPlayer) return;
    const { item, player, thumb } = openPlayer;
    player.querySelector("video")?.pause();
    player.innerHTML = "";
    player.hidden = true;
    item.classList.remove("is-playing");
    $$('[aria-controls="' + player.id + '"]', item).forEach((b) => b.setAttribute("aria-expanded", "false"));
    openPlayer = null;
    return thumb;
  }

  function openPressVideo(item) {
    const it = pressItems()[+item.dataset.i];
    const vid = pressVideo(it);
    const player = $(".press__player", item);
    if (!vid || !player) return;
    if (openPlayer?.item === item) { closePressVideo()?.focus(); return; }
    closePressVideo();

    player.innerHTML = `
      <video controls autoplay playsinline preload="metadata"${(() => {
        const shown = $(".press__thumb img", item)?.currentSrc || vid.poster;
        return shown ? ` poster="${esc(shown)}"` : "";
      })()}
             style="aspect-ratio:${vid.ar}">${vid.sources}</video>`;
    player.hidden = false;
    item.classList.add("is-playing");
    $$('[aria-controls="' + player.id + '"]', item).forEach((b) => b.setAttribute("aria-expanded", "true"));
    openPlayer = { item, player, thumb: $(".press__thumb", item) };
    const video = $("video", player);
    video.play().catch(() => { /* the click already counts as a gesture */ });
    player.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function renderPress() {
    const P = C.press;
    const section = $("#press");
    const items = P ? pressItems() : [];
    openPlayer = null;

    // No entries → no section and no menu link.
    section.hidden = items.length === 0;
    $("#navPress").hidden = items.length === 0;
    if (!items.length) return;

    $("#pressEyebrow").textContent = t(P.heading);
    $("#pressIntro").textContent   = t(P.intro);

    const kindOf = (it) => String(it.kind || "").toLowerCase();

    const feat = items.find((it) => it.featured && it.quote);
    const fig = $("#pressFeature");
    fig.hidden = !feat;
    if (feat) {
      const url = safeUrl(feat.url);
      const source = esc(t(feat.outlet)) + (feat.by ? ` · <span${textAttrs(t(feat.by))}>${esc(t(feat.by))}</span>` : "");
      fig.innerHTML = `
        <blockquote class="press__quote"${textAttrs(t(feat.quote))}>${esc(t(feat.quote))}</blockquote>
        <figcaption class="press__cite">
          ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${source}</a>` : source}
        </figcaption>`;
    }

    $("#pressList").innerHTML = items.map((it, i) => {
      const url = safeUrl(it.url);
      const k = kindOf(it);
      const kind = P.kinds?.[k] ? t(P.kinds[k]) : "";
      const action = t(P.actions?.[k === "video" ? "watch" : k === "podcast" ? "listen" : "read"]);
      const other = it.lang && it.lang !== lang && P.inLang?.[it.lang] ? t(P.inLang[it.lang]) : "";
      const title = t(it.title);
      const vid = pressVideo(it);

      const parts = [];
      if (kind)    parts.push(esc(kind));
      if (it.date) parts.push(`<time datetime="${esc(it.date)}">${pressDate(it.date)}</time>`);
      if (other)   parts.push(esc(other));
      if (it.by)   parts.push(`<span class="press__by">${esc(t(P.by))} <span${textAttrs(t(it.by))}>${esc(t(it.by))}</span></span>`);
      const meta = parts.join('<span class="press__dot" aria-hidden="true">·</span>');

      // Rows without a clip stay a single link, as before.
      if (!vid) {
        const body = `
          <span class="press__outlet">${esc(t(it.outlet))}</span>
          <span class="press__main">
            <span class="press__title"${textAttrs(title)}>${esc(title)}</span>
            <span class="press__meta">${meta}</span>
          </span>
          ${url ? `<span class="press__go">${esc(action)}${ARROW_ICON}</span>` : `<span class="press__go" aria-hidden="true"></span>`}`;
        return `<li class="press__item" data-i="${i}">${
          url
            ? `<a class="press__row" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${body}</a>`
            : `<div class="press__row">${body}</div>`
        }</li>`;
      }

      // A row with a clip can't be one big link (it holds buttons), so the
      // poster and "Watch clip" open the player and the headline links out.
      const pid = `pressPlayer${i}`;
      const label = `${t(P.actions?.clip)}: ${title}`;
      return `<li class="press__item press__item--video" data-i="${i}">
        <div class="press__row press__row--video">
          <button class="press__thumb" type="button" aria-expanded="false" aria-controls="${pid}"
                  aria-label="${esc(label)}" style="--ar:${vid.ar}">
            ${posterPicture(vid.poster)}
            <span class="press__play">${PLAY_ICON}</span>
            ${vid.duration ? `<span class="press__dur">${esc(vid.duration)}</span>` : ""}
          </button>
          <span class="press__outlet">${esc(t(it.outlet))}</span>
          <span class="press__main">
            ${url
              ? `<a class="press__title press__title--link" href="${esc(url)}" target="_blank" rel="noopener noreferrer"${textAttrs(title)}>${esc(title)}</a>`
              : `<span class="press__title"${textAttrs(title)}>${esc(title)}</span>`}
            <span class="press__meta">${meta}</span>
          </span>
          <span class="press__actions">
            <button class="press__go press__watch" type="button" aria-expanded="false" aria-controls="${pid}">${esc(t(P.actions?.clip))}${PLAY_ICON}</button>
            ${url ? `<a class="press__go" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(action)}${ARROW_ICON}</a>` : ""}
          </span>
        </div>
        <div class="press__player" id="${pid}" hidden></div>
      </li>`;
    }).join("");

    // Assigned, not added, so re-rendering on a language switch never stacks handlers.
    $("#pressList").onclick = (e) => {
      const btn = e.target.closest(".press__thumb, .press__watch");
      if (btn) openPressVideo(btn.closest(".press__item"));
    };
  }

  function renderInstagram() {
    const ig = C.instagram;
    $("#igEyebrow").textContent = t(ig.heading);
    $("#igHandle").textContent  = ig.handle;

    $("#igStrip").innerHTML = ig.picks.map((p) => `
      <a class="ig__cell" href="${esc(ig.url)}" target="_blank" rel="noopener noreferrer"
         aria-label="${esc(t(ig.cta))}">
        ${picture(p.file, p, { alt: "", sizes: "(max-width: 720px) 33vw, 17vw" })}
      </a>`).join("");

    const cta = $("#igCta");
    cta.href = ig.url;
    cta.innerHTML = IG_ICON + `<span>${esc(t(ig.cta))}</span>`;
  }

  function renderContact() {
    const c = C.contact;
    $("#contactEyebrow").textContent = t(c.heading);
    $("#contactLead").textContent    = t(c.lead);
    $("#emailLabel").textContent     = t(c.emailLabel);
    $("#agencyLabel").textContent    = t(c.agencyLabel);
    $("#agencyVal").textContent      = t(c.agency);
    $("#photoCredit").textContent    = t(c.credit);

    const mail = $("#emailLink");
    mail.textContent = c.email;
    mail.href = "mailto:" + c.email;

    $("#footRights").textContent =
      `© ${new Date().getFullYear()} ${t(C.site.name)}. ${t(C.footer.rights)}`;
    $("#footTop").textContent = t(C.footer.top);
  }

  /* =========================================================== lightbox === */
  const LB = {
    el: null, img: null, cap: null, count: null,
    idx: 0, lastFocus: null,

    init() {
      this.el    = $("#lb");
      this.img   = $("#lbImg");
      this.cap   = $("#lbCap");
      this.count = $("#lbCount");

      $("#lbClose").addEventListener("click", () => this.close());
      $("#lbPrev").addEventListener("click",  () => this.step(-1));
      $("#lbNext").addEventListener("click",  () => this.step(1));

      // Clicking the dark surround closes; clicking the photo does not.
      $("#lbStage").addEventListener("click", (e) => {
        if (e.target.id === "lbStage") this.close();
      });

      document.addEventListener("keydown", (e) => {
        if (!this.el.classList.contains("is-open")) return;
        if (e.key === "Escape")     { this.close(); }
        if (e.key === "ArrowRight") { this.step(document.dir === "rtl" ? -1 : 1); }
        if (e.key === "ArrowLeft")  { this.step(document.dir === "rtl" ? 1 : -1); }
        if (e.key === "Tab")        { this.trap(e); }
      });

      // Swipe on touch.
      let x0 = null;
      this.el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      this.el.addEventListener("touchend", (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 55) this.step(dx < 0 ? 1 : -1);
        x0 = null;
      }, { passive: true });
    },

    /* Keep Tab inside the dialog while it is open. */
    trap(e) {
      const f = $$("button", this.el).filter((b) => b.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    },

    open(i) {
      this.lastFocus = document.activeElement;
      this.idx = i;
      this.show();
      this.el.classList.add("is-open");
      this.el.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
      $("#lbClose").focus();
    },

    close() {
      this.el.classList.remove("is-open");
      this.el.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-locked");
      this.lastFocus?.focus();
    },

    step(d) {
      const n = galleryItems().length;
      this.idx = (this.idx + d + n) % n;
      this.show();
    },

    show() {
      const items = galleryItems();
      const it = items[this.idx];
      this.img.classList.remove("is-ready");
      this.img.onload = () => this.img.classList.add("is-ready");
      const m = imgEntry(it.file);
      const ext = m && (bestExt !== "avif" || m.avif) ? bestExt : "jpg";
      this.img.srcset = m ? srcset(m, ext) : "";
      this.img.sizes  = "100vw";
      this.img.src    = m ? biggest(m, ext) : src(it.file);
      this.img.alt = t(it.alt) || t(C.gallery.fallbackCaption);
      this.cap.textContent = t(it.caption) || t(C.gallery.fallbackCaption);
      this.count.textContent =
        `${this.idx + 1} ${t(C.ui.of)} ${items.length}`;

      // Warm the neighbours so arrowing through feels instant.
      [1, -1].forEach((d) => {
        const nx = items[(this.idx + d + items.length) % items.length];
        const nm = imgEntry(nx.file);
        // Warm the size the lightbox will actually pick, not the largest JPEG.
        if (nm) {
          const pre = new Image();
          pre.sizes = "100vw";
          pre.srcset = srcset(nm, bestExt !== "avif" || nm.avif ? bestExt : "jpg");
        } else {
          new Image().src = src(nx.file);
        }
      });
    },

    labels() {
      $("#lbClose").textContent = t(C.ui.close);
      $("#lbPrev").setAttribute("aria-label", t(C.ui.prev));
      $("#lbNext").setAttribute("aria-label", t(C.ui.next));
    }
  };

  /* ====================================================== scroll reveal === */
  let revealObserver = null;

  function bindReveal() {
    const targets = $$(".shot, .clip, .press__item, .press__feature");

    if (reduceMotion() || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }

    revealObserver?.disconnect();
    revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        // Slight stagger across a row so items don't all pop at once.
        const delay = (en.target.dataset.i % 3) * 90;
        setTimeout(() => en.target.classList.add("is-in"), delay);
        obs.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.06 });

    targets.forEach((el) => revealObserver.observe(el));
  }

  /* ============================================================ nav state === */
  function bindNav() {
    const nav  = $("#nav");
    const hero = $("#hero");

    // The bar appears once the hero has mostly scrolled past.
    new IntersectionObserver(([e]) => {
      nav.classList.toggle("is-visible", !e.isIntersecting);
    }, { rootMargin: "-70% 0px 0px 0px" }).observe(hero);

    // Highlight whichever section is in view.
    const links = $$(".nav__link");
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) =>
          l.classList.toggle("is-active", l.hash === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    ["about", "work", "reel", "press", "contact"].forEach((id) => {
      const s = document.getElementById(id);
      if (s) spy.observe(s);
    });
  }

  /* ============================================================== boot === */
  function renderAll() {
    renderHead();
    renderNav();
    renderHero();
    renderBio();
    renderCredits();
    renderGallery();
    renderReel();
    renderPress();
    renderInstagram();
    renderContact();
    LB.labels();

    // Gallery and reel markup is rebuilt on every language switch,
    // so their listeners have to be rebound each time.
    $$("#gallery .shot").forEach((fig) => {
      fig.addEventListener("click", () => LB.open(+fig.dataset.i));
    });
    bindReveal();
  }

  function setLang(next) {
    lang = next;
    try { localStorage.setItem(STORE, lang); } catch { /* private mode */ }
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", () => {
    LB.init();
    renderAll();
    bindNav();
    $("#langBtn").addEventListener("click",
      () => setLang(lang === "en" ? "fa" : "en"));
  });
})();
