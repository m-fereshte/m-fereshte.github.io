/* =========================================================================
   hero3d.js — turns the hero photograph into a slow, living 3D stage.

   It needs two things from content.js → hero:
     image  the photograph (already on the page as #heroImg)
     depth  a greyscale depth map, white = near  (tools/depth-from-colormap.py)

   What it does, all in one fragment shader:
     • parallax   the camera drifts on its own and leans toward the cursor;
                  pixels move by their depth, pivoting around the actress
     • dolly      scrolling pushes the camera in — near things grow faster
     • snow       a few layers of drifting flakes, each at its own depth, that
                  pass BEHIND her when their depth says they should
     • focus      on arrival the lens racks focus from the snow onto her
     • light      a warm follow-spot that tracks the cursor and models her
                  shape using a surface-normal map (hero.light; optional)

   If WebGL is missing, the depth map fails to load, or the visitor prefers
   reduced motion, none of this runs and the still photograph stays.
   ========================================================================= */
(() => {
  "use strict";

  const cfg = (typeof CONTENT !== "undefined" && CONTENT.hero) || {};
  if (!cfg.depth) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const M = Object.assign({
    strength: 1,       // parallax amount — 0.5 subtle, 1.5 dramatic
    pivot: 0.75,       // depth that stays still (0 far … 1 near)
    snow: true,        // procedural drifting snow
    focusPull: true    // rack focus on arrival
  }, cfg.motion || {});

  const SPOT = Object.assign({
    enabled: false,
    normals: null,     // surface-normal map (tools/prepare-normals.py)
    intensity: 1,
    dim: 0.62,         // brightness of the rest of the stage while the spot is on
    color: "#ffdcae",
    size: 0.55,        // radius of the pool, as a fraction of screen height
    home: "34% 30%"    // where the spot rests when nobody is steering it
  }, cfg.light || {});
  const spotOn = !!(SPOT.enabled && SPOT.normals);

  /* ------------------------------------------------------------ shaders */
  const VERT = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;

  const FRAG = `
    precision highp float;
    varying vec2 vUv;

    uniform sampler2D uColor;
    uniform sampler2D uDepth;
    uniform vec2  uCanvas;      // drawing-buffer size, px
    uniform float uImgAspect;   // photo width / height
    uniform vec2  uFocus;       // photo uv to keep in frame when cropping
    uniform vec2  uCam;         // camera offset, about -1..1
    uniform float uStrength;
    uniform float uPivot;
    uniform float uDolly;       // 0..1 scroll push-in
    uniform float uTime;
    uniform float uBlur;        // 0..1 focus-pull amount
    uniform float uFocusDepth;
    uniform float uSnow;        // 0..1
    uniform float uFade;        // 0..1 brightness
    uniform float uGrain;

    uniform sampler2D uNormals;
    uniform float uSpot;        // 0..1 follow-spot fade (0 = off)
    uniform float uSpotGain;    // light.intensity
    uniform vec2  uSpotPos;     // screen uv of the spot
    uniform vec3  uSpotColor;
    uniform float uSpotDim;     // brightness of the unlit stage
    uniform float uHouse;       // 0..1 how far the stage is dimmed toward uSpotDim
    uniform float uSpotSize;

    // Leaves everything below 0.8 untouched and rolls highlights off toward
    // 1.0, so a lit face brightens without burning out.
    vec3 softClip(vec3 x) {
      vec3 over = max(x - 0.8, 0.0);
      return min(x, 0.8) + over / (1.0 + over * 5.0);
    }

    const float SHIFT = 0.028;  // max parallax, in photo widths

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    // Visible fraction of the photo for a "cover" crop, with 10% overscan so
    // the parallax never reveals an edge.
    vec2 visibleSize() {
      float ca = uCanvas.x / uCanvas.y;
      vec2 v = ca > uImgAspect ? vec2(1.0, uImgAspect / ca) : vec2(ca / uImgAspect, 1.0);
      return v * 0.9;
    }

    vec2 toPhoto(vec2 s, float d, vec2 vis, vec2 center) {
      float zoom = 1.0 + uDolly * (0.05 + 0.2 * d);         // near grows faster
      vec2 uv = center + (s - 0.5) * vis / zoom;
      uv += uCam * (d - uPivot) * uStrength * SHIFT * vec2(1.0, uImgAspect);
      return clamp(uv, 0.001, 0.999);
    }

    vec3 snowLayer(vec2 s, float ld, float idx, float sceneD) {
      float cells = mix(10.0, 3.0, ld);                     // near: fewer, bigger
      // Square cells measured across the SHORT side, so flakes are the same
      // size on a tall phone as on a wide monitor.
      vec2 p = s * uCanvas / min(uCanvas.x, uCanvas.y);
      p.y += uTime * mix(0.010, 0.045, ld) + idx * 3.7;     // fall
      p.x += sin(uTime * 0.13 + idx * 1.9) * 0.04;          // sway
      p -= uCam * (ld - uPivot) * uStrength * SHIFT * 1.4;  // same parallax as the scene
      p *= cells;

      vec2 cell = floor(p);
      vec2 f = fract(p);
      float h = hash(cell + idx * 17.0);
      if (h > mix(0.30, 0.14, ld)) return vec3(0.0);        // keep it sparse

      vec2  c    = vec2(hash(cell + 3.1 + idx), hash(cell + 7.7 + idx)) * 0.5 + 0.25;
      float size = mix(0.035, 0.17, ld) * (0.6 + 0.6 * hash(cell + 11.0));
      float soft = mix(0.3, 0.92, ld);                      // near flakes out of focus
      float disc = 1.0 - smoothstep(size * (1.0 - soft), size, length(f - c));
      float twinkle = 0.75 + 0.25 * sin(uTime * 1.1 + h * 50.0);

      // Hidden wherever the scene is nearer than the flake: snow behind her
      // disappears behind her.
      float visible = 1.0 - smoothstep(ld - 0.03, ld + 0.05, sceneD);

      return vec3(0.80, 0.88, 1.0) * disc * twinkle * visible * mix(0.5, 0.2, ld);
    }

    void main() {
      vec2 vis = visibleSize();
      vec2 center = clamp(uFocus, vis * 0.5, 1.0 - vis * 0.5);

      // Ray-march the depth from near to far and take the first surface the
      // ray meets, so a near arm correctly hides what is behind it. A binary
      // search then refines the hit between the last two steps.
      const int STEPS = 20;
      float hi = 1.0;                       // last layer known to be in front of the surface
      float lo = 0.0;
      for (int i = 0; i < STEPS; i++) {
        float layer = 1.0 - float(i) / float(STEPS - 1);
        float scene = texture2D(uDepth, toPhoto(vUv, layer, vis, center)).r;
        if (scene >= layer) { lo = layer; break; }
        hi = layer;
      }
      for (int i = 0; i < 5; i++) {
        float mid = 0.5 * (hi + lo);
        float scene = texture2D(uDepth, toPhoto(vUv, mid, vis, center)).r;
        if (scene >= mid) lo = mid; else hi = mid;
      }
      float d = 0.5 * (hi + lo);
      vec2 uv = toPhoto(vUv, d, vis, center);
      vec3 col = texture2D(uColor, uv).rgb;

      if (uBlur > 0.001) {
        float r = uBlur * abs(d - uFocusDepth) * 0.014;
        vec3 acc = col;
        for (int i = 0; i < 16; i++) {
          float fi = float(i);
          float a  = fi * 2.39996;                          // golden-angle disc
          float rr = sqrt((fi + 0.5) / 16.0) * r;
          acc += texture2D(uColor, uv + vec2(cos(a), sin(a)) * rr * vec2(1.0, uImgAspect)).rgb;
        }
        col = acc / 17.0;
      }

      if (uHouse > 0.001 || uSpot > 0.001) {
        vec3 n = normalize(texture2D(uNormals, uv).rgb * 2.0 - 1.0);   // x right, y up, z toward us
        vec2 toSpot = (uSpotPos - vUv) * vec2(uCanvas.x / uCanvas.y, 1.0);
        vec3 L = normalize(vec3(toSpot, 0.35));   // the lamp hangs a little in front of the stage
        float diffuse = max(dot(n, L), 0.0);
        float sheen = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 28.0);  // embroidery, jewellery
        float pool = 1.0 - smoothstep(uSpotSize * 0.15, uSpotSize, length(toSpot));
        float catchLight = mix(0.25, 1.0, smoothstep(0.2, 0.6, d));  // she catches it; the far backdrop barely does

        // The stage sits at its dimmed level from the very first frame; only the
        // spot's own light fades in. (Dimming used to wait for the spot, so the
        // photo showed at full brightness while loading, then darkened.)
        vec3 house = col * mix(1.0, uSpotDim, uHouse);
        vec3 lit = house
                 + col * uSpotColor * diffuse * pool * catchLight * 0.95 * uSpotGain * uSpot
                 + uSpotColor * sheen * pool * catchLight * 0.18 * uSpotGain * uSpot;
        col = mix(house, softClip(lit), uSpot);
      }

      if (uSnow > 0.001) {
        vec3 snow = vec3(0.0);
        snow += snowLayer(vUv, 0.20, 0.0, d);
        snow += snowLayer(vUv, 0.42, 1.0, d);
        snow += snowLayer(vUv, 0.62, 2.0, d);
        snow += snowLayer(vUv, 0.93, 3.0, d);
        snow += snowLayer(vUv, 1.00, 4.0, d);
        col += snow * uSnow;
      }

      col *= uFade;
      col += (hash(vUv * uCanvas + fract(uTime) * 91.0) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`;

  /* ------------------------------------------------------------- helpers */
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function parseFocus(str) {
    const m = String(str || "").match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);
    // CSS measures y from the top; texture space measures it from the bottom.
    return m ? [m[1] / 100, 1 - m[2] / 100] : [0.5, 0.5];
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
  }

  function whenLoaded(img) {
    if (img.complete && img.naturalWidth) return Promise.resolve(img);
    return new Promise((resolve, reject) => {
      img.addEventListener("load", () => resolve(img), { once: true });
      img.addEventListener("error", reject, { once: true });
    });
  }

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s) || "shader compile failed");
    }
    return s;
  }

  function texture(gl, unit, source, format) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, source);
    // Non-power-of-two textures in WebGL 1 need exactly these settings.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /* ---------------------------------------------------------------- main */
  function start() {
    const hero  = document.getElementById("hero");
    const media = hero?.querySelector(".hero__media");
    const img   = document.getElementById("heroImg");
    const inner = hero?.querySelector(".hero__inner");
    if (!hero || !media || !img) return;

    const canvas = document.createElement("canvas");
    canvas.className = "hero__canvas";
    canvas.setAttribute("aria-hidden", "true");

    const gl = canvas.getContext("webgl", {
      antialias: false, alpha: false, depth: false, stencil: false,
      premultipliedAlpha: false, powerPreference: "high-performance"
    });
    if (!gl) return;

    // Hide the still photo now so the stage can "light up" — and put it
    // straight back if anything below fails.
    hero.classList.add("has-3d");
    let dead = false;
    const fallback = (why) => {
      if (dead) return;
      dead = true;
      if (why) console.warn("[hero3d] falling back to still image:", why);
      hero.classList.remove("has-3d");
      canvas.remove();
      if (inner) inner.style.transform = "";
    };
    const safety = setTimeout(() => fallback("timed out loading"), 8000);

    const normalsLoad = spotOn
      ? loadImage(SPOT.normals).catch(() => { console.warn("[hero3d] normal map failed to load; light disabled"); return null; })
      : Promise.resolve(null);

    Promise.all([whenLoaded(img), loadImage(cfg.depth), normalsLoad]).then(([photo, depthImg, normalsImg]) => {
      if (dead) return;
      clearTimeout(safety);

      let prog;
      try {
        prog = gl.createProgram();
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      } catch (e) { fallback(e.message); return; }

      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // The browser already chose the right-sized file for #heroImg via
      // srcset, so upload that element directly — no second download.
      try {
        texture(gl, 0, photo, gl.RGB);
        texture(gl, 1, depthImg, gl.LUMINANCE);
        if (normalsImg) texture(gl, 2, normalsImg, gl.RGB);
      } catch (e) { fallback("texture upload: " + e.message); return; }

      const U = {};
      ["uNormals", "uSpot", "uHouse", "uSpotGain", "uSpotPos", "uSpotColor", "uSpotDim", "uSpotSize",
       "uColor", "uDepth", "uCanvas", "uImgAspect", "uFocus", "uCam", "uStrength", "uPivot",
       "uDolly", "uTime", "uBlur", "uFocusDepth", "uSnow", "uFade", "uGrain"]
        .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

      gl.uniform1i(U.uColor, 0);
      gl.uniform1i(U.uDepth, 1);
      gl.uniform1f(U.uImgAspect, photo.naturalWidth / photo.naturalHeight);
      gl.uniform2fv(U.uFocus, parseFocus(cfg.image?.focus));
      gl.uniform1f(U.uStrength, M.strength);
      gl.uniform1f(U.uPivot, M.pivot);
      gl.uniform1f(U.uGrain, 0.018);

      const hasSpot = !!normalsImg;
      if (hasSpot) {
        const hex = String(SPOT.color).replace("#", "");
        const rgb = [0, 2, 4].map((i) => {
          const v = parseInt(hex.slice(i, i + 2), 16);
          return Number.isNaN(v) ? 1 : v / 255;
        });
        gl.uniform1i(U.uNormals, 2);
        gl.uniform3fv(U.uSpotColor, rgb);
        gl.uniform1f(U.uSpotDim, SPOT.dim);
        gl.uniform1f(U.uSpotSize, SPOT.size);
        gl.uniform1f(U.uSpotGain, Math.max(0, SPOT.intensity));
        gl.uniform1f(U.uHouse, 1);   // dimmed from the start; the scene still fades up from black
      }
      const imgAspect = photo.naturalWidth / photo.naturalHeight;
      const focusUV = parseFocus(cfg.image?.focus);
      const homeUV = parseFocus(SPOT.home);

      media.appendChild(canvas);

      /* ---- sizing ---- */
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      // Render scale drops automatically if the GPU can't keep up (see frame()).
      let quality = 1;
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5) * quality;
        const r = media.getBoundingClientRect();
        const w = Math.max(1, Math.round(r.width * dpr));
        const h = Math.max(1, Math.round(r.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w; canvas.height = h;
          gl.viewport(0, 0, w, h);
          gl.uniform2f(U.uCanvas, w, h);
        }
      };
      resize();
      new ResizeObserver(resize).observe(media);

      /* ---- input ---- */
      const target = { x: 0, y: 0 };
      const cam = { x: 0, y: 0 };
      let lastInput = -1e9;

      // The spot follows a mouse over the hero, or a tap on a touch screen.
      const spotTarget = { x: 0.5, y: 0.5 };
      let lastSpotInput = -1e9;
      const aimSpot = (e) => {
        const r = hero.getBoundingClientRect();
        const u = (e.clientX - r.left) / r.width;
        const v = 1 - (e.clientY - r.top) / r.height;
        if (u < 0 || u > 1 || v < 0 || v > 1) return false;
        spotTarget.x = u; spotTarget.y = v;
        lastSpotInput = performance.now();
        return true;
      };
      if (hasSpot) {
        window.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") aimSpot(e); }, { passive: true });
        document.documentElement.addEventListener("mouseleave", () => { lastSpotInput = -1e9; });
      }

      window.addEventListener("pointermove", (e) => {
        if (hasSpot && e.pointerType !== "touch" && !aimSpot(e)) lastSpotInput = -1e9;  // off the hero → spot goes home
        if (e.pointerType === "touch") return;          // touch scrolls; don't fight it
        target.x = (e.clientX / window.innerWidth) * 2 - 1;
        target.y = -((e.clientY / window.innerHeight) * 2 - 1);
        lastInput = performance.now();
      }, { passive: true });

      // Phones that expose tilt without a permission prompt (most Android).
      window.addEventListener("deviceorientation", (e) => {
        if (e.gamma == null || e.beta == null) return;
        target.x = Math.max(-1, Math.min(1, e.gamma / 25));
        target.y = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
        lastInput = performance.now();
      }, { passive: true });

      canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); fallback("context lost"); });

      /* ---- only draw while it can be seen ---- */
      let onScreen = true;
      new IntersectionObserver(([en]) => {
        onScreen = en.isIntersecting;
        if (onScreen) kick();
      }).observe(hero);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });

      /* ---- loop ---- */
      // The clock starts at the first frame actually drawn, not at page load,
      // so a visitor who opened the site in a background tab still gets the
      // focus pull when they switch to it.
      let t0 = null, prev = 0, idleW = 1, raf = 0, firstFrame = true;
      let slowFrames = 0, frames = 0;
      const spot = { x: 0.5, y: 0.6 };
      let spotHomeW = 1;

      // Photo uv (y up) → screen uv, using the same cover crop as the shader.
      const photoToScreen = ([px, py]) => {
        const ca = canvas.width / canvas.height;
        let vx = ca > imgAspect ? 1 : ca / imgAspect;
        let vy = ca > imgAspect ? imgAspect / ca : 1;
        vx *= 0.9; vy *= 0.9;
        const cxp = Math.min(Math.max(focusUV[0], vx / 2), 1 - vx / 2);
        const cyp = Math.min(Math.max(focusUV[1], vy / 2), 1 - vy / 2);
        return [(px - cxp) / vx + 0.5, (py - cyp) / vy + 0.5];
      };
      const INTRO = M.focusPull ? 3.2 : 1.2;             // seconds

      function frame(now) {
        raf = 0;
        if (dead) return;
        if (t0 === null) { t0 = now; prev = now; }
        const rawDt = (now - prev) / 1000;
        const dt = Math.min(0.05, rawDt);
        prev = now;

        // Below ~40fps for a sustained stretch, render fewer pixels. The
        // photo is soft-focus stage light, so a lower scale is hard to spot.
        if (++frames > 30 && rawDt < 0.25) {
          slowFrames = rawDt > 1 / 40 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
          if (slowFrames > 20 && quality > 0.55) {
            quality *= 0.8;
            slowFrames = 0;
            resize();
          }
        }
        const t = (now - t0) / 1000;

        // Ease toward the pointer; drift on our own when nobody is steering.
        const k = 1 - Math.exp(-dt * 3.2);
        cam.x += (target.x - cam.x) * k;
        cam.y += (target.y - cam.y) * k;
        const idle = now - lastInput > 2500;
        idleW += ((idle ? 1 : 0.3) - idleW) * (1 - Math.exp(-dt * 0.8));
        const cx = cam.x * 0.8 + Math.sin(t * 0.21) * 0.45 * idleW;
        const cy = cam.y * 0.6 + Math.sin(t * 0.16 + 1.3) * 0.28 * idleW;

        const heroH = hero.offsetHeight || 1;
        const dolly = clamp01(window.scrollY / heroH);

        const intro = easeOut(clamp01(t / INTRO));
        const light = easeOut(clamp01(t / 1.6));

        gl.uniform2f(U.uCam, cx, cy);
        gl.uniform1f(U.uDolly, dolly);
        gl.uniform1f(U.uTime, t);
        gl.uniform1f(U.uBlur, M.focusPull ? 1 - intro : 0);
        gl.uniform1f(U.uFocusDepth, 1.0 + (M.pivot - 1.0) * intro);
        gl.uniform1f(U.uSnow, M.snow ? intro : 0);
        gl.uniform1f(U.uFade, light * (1 - dolly * 0.55));

        if (hasSpot) {
          // With nobody steering, the spot rests on her face and circles
          // slowly; a hand on the mouse takes over, with a little lag, like
          // an operator panning a real follow-spot.
          const steering = now - lastSpotInput < 2500;
          spotHomeW += ((steering ? 0 : 1) - spotHomeW) * (1 - Math.exp(-dt * 1.5));
          const [hx, hy] = photoToScreen(homeUV);
          const gx = hx + Math.sin(t * 0.37) * 0.06, gy = hy + Math.sin(t * 0.29 + 0.8) * 0.05;
          const tx = spotTarget.x + (gx - spotTarget.x) * spotHomeW;
          const ty = spotTarget.y + (gy - spotTarget.y) * spotHomeW;
          const ks = 1 - Math.exp(-dt * 5);
          spot.x += (tx - spot.x) * ks;
          spot.y += (ty - spot.y) * ks;
          gl.uniform2f(U.uSpotPos, spot.x, spot.y);
          // The spot comes up once the focus pull is nearly done.
          gl.uniform1f(U.uSpot, easeOut(clamp01((t - INTRO * 0.55) / 1.8)));
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (firstFrame) { firstFrame = false; canvas.classList.add("is-ready"); }

        // The title is the nearest layer of all, so it leans the most.
        if (inner) {
          const lift = dolly * heroH * 0.18;
          inner.style.transform =
            `translate3d(${(-cx * 12).toFixed(2)}px, ${(cy * 8 - lift).toFixed(2)}px, 0)`;
          inner.style.opacity = String(1 - dolly * 0.9);
        }

        kick();
      }

      function kick() {
        if (!raf && !dead && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
      }
      kick();
    }).catch((e) => fallback(e && e.message ? e.message : "load failed"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
