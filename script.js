/* ==========================================================================
   Harp Strings for Hope — script.js
   Vanilla JavaScript, no libraries. Works on GitHub Pages as-is.
   ========================================================================== */
"use strict";

/* ==========================================================================
   1. EDIT THIS PART
   Everything you are likely to change is in this section.
   ========================================================================== */

const CONFIG = {
  // Where the "Donate" button goes. Replace with your real donation page.
  donationUrl: "https://example.com/replace-with-your-donation-page",

  // Optional. If you add an email address, an "Ask about a custom campaign"
  // button appears in the Custom Campaigns section. Leave "" to keep it hidden.
  contactEmail: "",

  // Shown on phone lock screens and in media controls while a song plays.
  artist: "Shoshannah Born",
  album: "Harp Strings for Hope",
};

// Your songs. Put the MP3 files in the ./media folder and list them here.
// "note" is an optional short line shown under the song title.
const TRACKS = [
  { title: "Song title one",   src: "./media/audio-1.mp3", note: "A short line about this song." },
  { title: "Song title two",   src: "./media/audio-2.mp3", note: "" },
  { title: "Song title three", src: "./media/audio-3.mp3", note: "" },
];

// Your gallery images. Put the files in ./media and list them here.
// "alt" describes the picture for screen readers (please fill it in).
// "caption" is optional. Images that cannot be found are skipped quietly.
const IMAGES = [
  { src: "./media/image-1.jpg", alt: "Describe image one", caption: "" },
  { src: "./media/image-2.jpg", alt: "Describe image two", caption: "" },
  { src: "./media/image-3.jpg", alt: "Describe image three", caption: "" },
  { src: "./media/image-4.jpg", alt: "Describe image four", caption: "" },
  { src: "./media/image-5.jpg", alt: "Describe image five", caption: "" },
  { src: "./media/image-6.jpg", alt: "Describe image six", caption: "" },
];

/* ==========================================================================
   2. Helpers
   ========================================================================== */

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ==========================================================================
   3. Basics: year, links, mobile menu
   ========================================================================== */

function initBasics() {
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  $$("[data-donate]").forEach((link) => {
    link.href = CONFIG.donationUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });

  const contact = $("[data-contact]");
  if (contact && CONFIG.contactEmail) {
    contact.href = "mailto:" + CONFIG.contactEmail;
    contact.hidden = false;
  }

  const toggle = $(".nav-toggle");
  const nav = $("#site-nav");
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  };
  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });
}

/* ==========================================================================
   4. The harp in the hero
   Strings are drawn with SVG. Move the pointer across them (or tap) to pluck.
   ========================================================================== */

function initHarp() {
  const svg = $("#harp");
  if (!svg) return;

  const NS = "http://www.w3.org/2000/svg";
  // C major pentatonic across two octaves, low (long strings) to high (short).
  const NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
  const COUNT = NOTES.length;

  const make = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs).forEach((key) => node.setAttribute(key, attrs[key]));
    if (parent) parent.appendChild(node);
    return node;
  };

  // Frame: a pillar on the left, a curved neck across the top, a soundboard below.
  const P0 = [58, 50], P1 = [210, 20], P2 = [350, 240];
  const neck = (t) => [
    (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
    (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
  ];
  const soundboardY = (x) => 428 - ((x - 58) / 287) * 36;

  make("path", { class: "harp-body", d: "M58 428 L345 392 L345 410 L58 446 Z" }, svg);
  make("path", {
    class: "harp-frame",
    d: "M58 446 V50 Q210 20 350 240 L345 392 M58 428 L345 392 M58 446 L345 410",
  }, svg);

  const group = make("g", {}, svg);
  const strings = [];
  for (let i = 0; i < COUNT; i++) {
    const t = 0.1 + i * (0.83 / (COUNT - 1));
    const [x, yTop] = neck(t);
    const yBottom = soundboardY(x);
    const path = make("path", { class: "harp-string", d: `M${x} ${yTop} L${x} ${yBottom}` }, group);
    strings.push({ x, yTop, yBottom, freq: NOTES[i], path, amp: 0, start: 0, active: false });
  }

  /* ----- Sound (Web Audio, generated in the browser, no files needed) ----- */
  let audioCtx = null;
  let bus = null;
  let soundOn = true;

  function getAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtx = new AudioContextClass();
      bus = audioCtx.createDynamicsCompressor();
      bus.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playNote(freq, velocity) {
    if (!soundOn) return;
    const ctx = getAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(0.16 * velocity, now + 0.012);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    out.connect(bus);
    [[1, 1], [2, 0.32], [3, 0.12], [4, 0.05]].forEach(([multiple, level]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * multiple, now);
      gain.gain.value = level;
      osc.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 2.5);
    });
  }

  /* ----- Animation: a damped wobble on each plucked string ----- */
  let frameId = null;

  function tick(now) {
    let anyActive = false;
    strings.forEach((s) => {
      if (!s.active) return;
      const elapsed = Math.max(0, (now - s.start) / 1000);
      const offset = s.amp * Math.exp(-3.4 * elapsed) * Math.cos(2 * Math.PI * 6 * elapsed);
      if (elapsed > 0.2 && Math.abs(offset) < 0.15) {
        s.active = false;
        s.path.classList.remove("is-active");
        s.path.setAttribute("d", `M${s.x} ${s.yTop} L${s.x} ${s.yBottom}`);
        return;
      }
      anyActive = true;
      const mid = (s.yTop + s.yBottom) / 2;
      s.path.setAttribute("d", `M${s.x} ${s.yTop} Q${s.x + 2 * offset} ${mid} ${s.x} ${s.yBottom}`);
    });
    frameId = anyActive ? requestAnimationFrame(tick) : null;
  }

  function ripple(x, y) {
    if (!svg.animate) return;
    const ring = make("circle", { class: "harp-ripple", cx: x, cy: y, r: 10 }, svg);
    const animation = ring.animate(
      [{ transform: "scale(0.3)", opacity: 0.7 }, { transform: "scale(2.8)", opacity: 0 }],
      { duration: 1200, easing: "ease-out" }
    );
    animation.onfinish = () => ring.remove();
  }

  function pluck(index, options = {}) {
    const { direction = 1, silent = false, velocity = 1, y } = options;
    const s = strings[index];
    if (!silent) playNote(s.freq, velocity);
    if (prefersReducedMotion.matches) return;
    s.amp = 7 * direction;
    s.start = performance.now();
    s.active = true;
    s.path.classList.add("is-active");
    ripple(s.x, y === undefined ? (s.yTop + s.yBottom) / 2 : y);
    if (!frameId) frameId = requestAnimationFrame(tick);
  }

  function strum(options = {}) {
    strings.forEach((_, i) => {
      setTimeout(() => pluck(i, { ...options, velocity: 0.8 }), i * 85);
    });
  }

  /* ----- Pointer input: pluck strings the pointer crosses ----- */
  const toSvgPoint = (clientX, clientY) => {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  };

  const lastX = new Map();

  svg.addEventListener("pointermove", (event) => {
    const p = toSvgPoint(event.clientX, event.clientY);
    const previous = lastX.get(event.pointerId);
    lastX.set(event.pointerId, p.x);
    if (previous === undefined || previous === p.x) return;

    const low = Math.min(previous, p.x);
    const high = Math.max(previous, p.x);
    const direction = p.x > previous ? 1 : -1;
    const crossed = [];
    strings.forEach((s, i) => {
      if (s.x >= low && s.x <= high && p.y > s.yTop - 12 && p.y < s.yBottom + 12) crossed.push(i);
    });
    if (direction < 0) crossed.reverse();
    crossed.forEach((i, k) => {
      setTimeout(() => pluck(i, { direction, y: Math.min(Math.max(p.y, strings[i].yTop), strings[i].yBottom) }), k * 30);
    });
  });

  ["pointerleave", "pointerup", "pointercancel"].forEach((type) => {
    svg.addEventListener(type, (event) => lastX.delete(event.pointerId));
  });

  // A tap on a touch screen plucks the nearest string.
  svg.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    const p = toSvgPoint(event.clientX, event.clientY);
    let nearest = -1;
    let best = 16;
    strings.forEach((s, i) => {
      const distance = Math.abs(s.x - p.x);
      if (distance < best && p.y > s.yTop - 12 && p.y < s.yBottom + 12) {
        best = distance;
        nearest = i;
      }
    });
    if (nearest >= 0) pluck(nearest, { y: p.y });
  });

  /* ----- Buttons ----- */
  const strumButton = $("#strum");
  if (strumButton) strumButton.addEventListener("click", () => strum());

  const soundButton = $("#sound-toggle");
  if (soundButton) {
    soundButton.addEventListener("click", () => {
      soundOn = !soundOn;
      soundButton.textContent = "Harp sound: " + (soundOn ? "on" : "off");
    });
  }

  // One quiet shimmer when the page opens (no sound, skipped for reduced motion).
  if (!prefersReducedMotion.matches) setTimeout(() => strum({ silent: true }), 700);
}

/* ==========================================================================
   5. Audio player
   ========================================================================== */

function initPlayer() {
  const audio = $("#audio");
  if (!audio || !TRACKS.length) return;

  const ui = {
    title: $("#track-title"),
    note: $("#track-note"),
    play: $("#btn-play"),
    prev: $("#btn-prev"),
    next: $("#btn-next"),
    seek: $("#seek"),
    current: $("#time-current"),
    total: $("#time-total"),
    volume: $("#vol"),
    status: $("#player-status"),
    list: $("#playlist"),
  };
  const iconPlay = $(".icon-play", ui.play);
  const iconPause = $(".icon-pause", ui.play);

  let index = 0;
  let seeking = false;

  const formatTime = (seconds) => {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);
    return minutes + ":" + String(rest).padStart(2, "0");
  };

  const setFill = (input) => {
    const max = Number(input.max) || 1;
    input.style.setProperty("--pct", (Number(input.value) / max) * 100 + "%");
  };

  const say = (message) => { ui.status.textContent = message; };

  /* Playlist */
  const buttons = TRACKS.map((track, i) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const text = document.createElement("span");
    const title = document.createElement("span");
    title.className = "pl-title";
    title.textContent = track.title;
    text.appendChild(title);
    if (track.note) {
      const note = document.createElement("span");
      note.className = "pl-note";
      note.textContent = track.note;
      text.appendChild(note);
    }
    button.type = "button";
    button.appendChild(text);
    button.addEventListener("click", () => {
      if (i === index && audio.src) togglePlay();
      else load(i, true);
    });
    item.appendChild(button);
    ui.list.appendChild(item);
    return button;
  });

  /* Core actions */
  function load(i, autoplay) {
    index = (i + TRACKS.length) % TRACKS.length;
    const track = TRACKS[index];
    audio.src = track.src;
    ui.title.textContent = track.title;
    ui.note.textContent = track.note || "";
    ui.seek.value = 0;
    setFill(ui.seek);
    ui.current.textContent = "0:00";
    ui.total.textContent = "0:00";
    say("");
    buttons.forEach((button, n) => button.setAttribute("aria-current", String(n === index)));
    updateMediaSession();
    if (autoplay) play();
  }

  function play() {
    const promise = audio.play();
    if (promise && promise.catch) {
      promise.catch((error) => {
        if (error && error.name !== "AbortError") say("This song could not be played right now.");
      });
    }
  }

  function togglePlay() {
    if (audio.paused) play();
    else audio.pause();
  }

  /* Audio events */
  audio.addEventListener("play", () => {
    iconPlay.hidden = true;
    iconPause.hidden = false;
    ui.play.setAttribute("aria-label", "Pause");
  });
  audio.addEventListener("pause", () => {
    iconPlay.hidden = false;
    iconPause.hidden = true;
    ui.play.setAttribute("aria-label", "Play");
  });
  audio.addEventListener("loadedmetadata", () => {
    ui.total.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    ui.current.textContent = formatTime(audio.currentTime);
    if (!seeking && audio.duration) {
      ui.seek.value = (audio.currentTime / audio.duration) * 1000;
      setFill(ui.seek);
    }
    ui.seek.setAttribute("aria-valuetext", formatTime(audio.currentTime) + " of " + formatTime(audio.duration));
  });
  audio.addEventListener("ended", () => {
    if (index < TRACKS.length - 1) load(index + 1, true);
    else load(0, false);
  });
  audio.addEventListener("error", () => {
    say("This song could not be loaded right now.");
    console.warn("Audio file could not be loaded:", TRACKS[index].src);
  });

  /* Controls */
  ui.play.addEventListener("click", togglePlay);
  ui.prev.addEventListener("click", () => {
    // Like most players: a few seconds in, "previous" restarts the song.
    if (audio.currentTime > 3) audio.currentTime = 0;
    else load(index - 1, !audio.paused);
  });
  ui.next.addEventListener("click", () => load(index + 1, !audio.paused));

  ui.seek.addEventListener("pointerdown", () => { seeking = true; });
  ["pointerup", "pointercancel"].forEach((type) => {
    ui.seek.addEventListener(type, () => { seeking = false; });
  });
  ui.seek.addEventListener("input", () => {
    setFill(ui.seek);
    if (audio.duration) audio.currentTime = (Number(ui.seek.value) / 1000) * audio.duration;
  });

  ui.volume.addEventListener("input", () => {
    audio.volume = Number(ui.volume.value);
    setFill(ui.volume);
  });
  audio.volume = Number(ui.volume.value);
  setFill(ui.volume);

  /* Lock-screen and headphone controls where the browser supports them */
  function updateMediaSession() {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: TRACKS[index].title,
      artist: CONFIG.artist,
      album: CONFIG.album,
    });
  }
  if ("mediaSession" in navigator) {
    const actions = {
      play: () => play(),
      pause: () => audio.pause(),
      previoustrack: () => load(index - 1, true),
      nexttrack: () => load(index + 1, true),
    };
    Object.keys(actions).forEach((name) => {
      try { navigator.mediaSession.setActionHandler(name, actions[name]); } catch (error) { /* not supported */ }
    });
  }

  load(0, false);
}

/* ==========================================================================
   6. Gallery and image viewer
   ========================================================================== */

function initGallery() {
  const list = $("#gallery-list");
  const empty = $("#gallery-empty");
  const dialog = $("#lightbox");
  if (!list) return;

  const records = IMAGES.map((image) => {
    const item = document.createElement("li");
    const figure = document.createElement("figure");
    const button = document.createElement("button");
    const img = document.createElement("img");

    img.src = image.src;
    img.alt = image.alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    button.type = "button";
    button.setAttribute("aria-label", "View larger: " + (image.alt || "image"));
    button.appendChild(img);
    figure.appendChild(button);

    if (image.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = image.caption;
      figure.appendChild(caption);
    }
    item.appendChild(figure);
    list.appendChild(item);

    const record = { ...image, item, ok: true };
    img.addEventListener("error", () => {
      record.ok = false;
      item.remove();
      console.warn("Gallery image could not be found:", image.src);
      if (empty && records.every((r) => !r.ok)) empty.hidden = false;
    });
    button.addEventListener("click", () => openViewer(record));
    return record;
  });

  if (!dialog) return;
  const viewerImg = $("#lightbox-img");
  const viewerCaption = $("#lightbox-caption");
  const viewerCount = $("#lightbox-count");
  let current = null;

  const visible = () => records.filter((r) => r.ok);

  function show(record) {
    current = record;
    viewerImg.src = record.src;
    viewerImg.alt = record.alt || "";
    viewerCaption.textContent = record.caption || "";
    const shown = visible();
    viewerCount.textContent = shown.indexOf(record) + 1 + " of " + shown.length;
  }

  function openViewer(record) {
    if (typeof dialog.showModal !== "function") {
      window.open(record.src, "_blank", "noopener");
      return;
    }
    show(record);
    if (!dialog.open) dialog.showModal();
  }

  function step(direction) {
    const shown = visible();
    if (shown.length < 2) return;
    const next = (shown.indexOf(current) + direction + shown.length) % shown.length;
    show(shown[next]);
  }

  $("#lightbox-prev").addEventListener("click", () => step(-1));
  $("#lightbox-next").addEventListener("click", () => step(1));
  $("#lightbox-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.classList.contains("lightbox-inner")) dialog.close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  });
}

/* ==========================================================================
   7. Pay-it-forward preview
   ========================================================================== */

function initPayForward() {
  const select = $("#cause");
  const output = $("#cause-output");
  if (!select || !output) return;

  select.addEventListener("change", () => {
    const option = select.selectedOptions[0];
    output.textContent = "";
    if (!option || !option.value) {
      const hint = document.createElement("p");
      hint.textContent = "Your choice will appear here.";
      output.appendChild(hint);
      return;
    }
    const heading = document.createElement("strong");
    heading.textContent = option.textContent;
    const blurb = document.createElement("p");
    blurb.textContent = option.dataset.blurb || "";
    output.append(heading, blurb);
  });
}

/* ==========================================================================
   8. Start
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initBasics();
  initHarp();
  initPlayer();
  initGallery();
  initPayForward();
});
