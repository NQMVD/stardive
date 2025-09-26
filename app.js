/**
 * Stardive Landing App Shell
 * - Minimal, modern layout with tasteful animations and layered depth.
 * - Highlights: Terminal tools, Discord bot (Pueue/Minecraft), Love2D GUI + MacBook touchpad.
 * - Smooth transitions, elegant microinteractions, keyboard-accessible navigation.
 *
 * This script hydrates the HTML in public/index.html:
 *   - Builds a non-templatey layout with clear sections and layered depth.
 *   - Creates navigation with active section highlighting and smooth scroll.
 *   - Adds tasteful reveal animations and motion-reduced fallbacks.
 *   - Light state management to switch "project focus" cards.
 */

(function () {
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }
  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const child of [].concat(children)) {
      if (child == null) continue;
      if (typeof child === "string")
        node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function mountApp() {
    const mount = qs("#mount");
    if (!mount) return;

    const nav = buildNavigation();
    const sections = buildSections();
    const footerCTA = buildFooterCTA();

    mount.appendChild(nav);
    for (const s of sections) mount.appendChild(s);
    mount.appendChild(footerCTA);

    setupScrollSpy(nav);
    setupSmoothScroll(nav);
    if (!prefersReduced) setupSectionReveals(sections);
    if (!prefersReduced) setupMagneticHover();
  }

  function buildNavigation() {
    const nav = el("nav", {
      className: "sd-nav",
      role: "navigation",
      ariaLabel: "Stardive sections",
    });

    const links = [
      { href: "#projects", text: "Projects" },
      { href: "#philosophy", text: "Philosophy" },
      { href: "#showcase", text: "Showcase" },
      { href: "#contact", text: "Contact" },
    ];

    const list = el(
      "ul",
      { className: "sd-nav__list" },
      links.map((l, i) =>
        el("li", { className: "sd-nav__item" }, [
          el("a", {
            className: "sd-nav__link",
            href: l.href,
            textContent: l.text,
            "data-index": i,
          }),
        ]),
      ),
    );

    const styles = el("style", {
      textContent: `
      .sd-nav {
        position: sticky;
        top: 64px;
        max-width: 1200px;
        margin: 0 auto 4vh;
        padding: 12px clamp(16px, 4vw, 24px);
        border-radius: 16px;
        border: 1px solid rgba(122,167,255,0.08);
        background: linear-gradient(180deg, rgba(11,15,23,0.55), rgba(11,15,23,0.25));
        backdrop-filter: blur(10px) saturate(120%);
        z-index: 4;
      }
      .sd-nav__list {
        display: grid;
        grid-auto-flow: column;
        align-items: center;
        justify-content: start;
        gap: clamp(10px, 3vw, 28px);
        padding: 0;
        margin: 0;
        list-style: none;
      }
      .sd-nav__item { display: contents; }
      .sd-nav__link {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        color: var(--muted);
        text-decoration: none;
        letter-spacing: 0.2px;
        border-radius: 10px;
        transition: color 200ms ease;
      }
      .sd-nav__link::before {
        content: "";
        position: absolute;
        inset: -2px -4px;
        border-radius: 12px;
        background: radial-gradient(120px 60px at var(--x, 50%) 50%,
          rgba(122,167,255,0.18), rgba(90,240,211,0.10), transparent 65%);
        opacity: 0;
        transform: translateZ(0);
        transition: opacity 220ms ease;
        pointer-events: none;
      }
      .sd-nav__link:hover {
        color: #eaf2ff;
      }
      .sd-nav__link:hover::before { opacity: 1; }
      .sd-nav__link.is-active {
        color: #eaf2ff;
        text-shadow: 0 0 16px rgba(122,167,255,0.25);
      }
    `,
    });

    nav.appendChild(styles);
    nav.appendChild(list);

    // cursor lighting
    nav.addEventListener("mousemove", (e) => {
      const link = e.target.closest(".sd-nav__link");
      if (!link) return;
      const rect = link.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      link.style.setProperty("--x", `${x}%`);
    });

    return nav;
  }

  function buildSections() {
    const sections = [];

    sections.push(sectionProjects());
    sections.push(sectionPhilosophy());
    sections.push(sectionShowcase());
    sections.push(sectionContact());

    const css = el("style", {
      textContent: `
      .sd-section {
        position: relative;
        max-width: 1200px;
        margin: 8vh auto 6vh;
        padding: clamp(16px, 3vw, 28px);
        border-radius: 18px;
        border: 1px solid rgba(122,167,255,0.08);
        background:
          linear-gradient(180deg, rgba(11,15,23,0.45), rgba(11,15,23,0.15));
        backdrop-filter: blur(8px) saturate(115%);
        overflow: clip;
      }
      .sd-section__eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: var(--muted);
        font-size: 12px;
        letter-spacing: 1.4px;
        text-transform: uppercase;
        opacity: 0.9;
      }
      .sd-dot {
        width: 6px; height: 6px; border-radius: 999px;
        background: radial-gradient(circle at 35% 35%, #d6f9ff, #7aa7ff 55%, rgba(122,167,255,0) 75%);
        box-shadow: 0 0 12px 2px rgba(122,167,255,0.45), 0 0 28px 8px rgba(90,240,211,0.18);
      }
      .sd-section__title {
        margin: 12px 0 6px;
        font-size: clamp(26px, 3.8vw, 42px);
        line-height: 1.15;
        letter-spacing: -0.01em;
        font-weight: 800;
        color: #eaf2ff;
        text-shadow: 0 0 14px rgba(165,123,255,0.10);
      }
      .sd-section__lead {
        margin: 8px 0 18px;
        max-width: 68ch;
        color: var(--muted);
        font-size: clamp(15px, 2.2vw, 18px);
        line-height: 1.7;
      }
      .grid {
        display: grid;
        gap: clamp(14px, 2.4vw, 22px);
      }
      @media (min-width: 880px) {
        .grid.grid-2 { grid-template-columns: 1.2fr 0.8fr; }
        .grid.grid-3 { grid-template-columns: repeat(3, 1fr); }
      }

      /* Cards */
      .sd-card {
        position: relative;
        border-radius: 16px;
        border: 1px solid rgba(122,167,255,0.10);
        background: linear-gradient(180deg, rgba(13,20,33,0.55), rgba(13,20,33,0.18));
        padding: clamp(18px, 2.6vw, 24px);
        overflow: hidden;
        transition: transform 320ms cubic-bezier(.2,.8,.2,1), border-color 220ms ease, background 220ms ease, box-shadow 220ms ease;
      }
      .sd-card:hover {
        transform: translateY(-2px);
        border-color: rgba(122,167,255,0.22);
        background: linear-gradient(180deg, rgba(13,20,33,0.70), rgba(13,20,33,0.22));
      }
      .sd-card__title {
        font-weight: 700;
        color: #eaf2ff;
        margin: 2px 0 4px;
        letter-spacing: 0.2px;
      }
      .sd-card__meta {
        color: var(--muted);
        font-size: 13px;
        letter-spacing: 0.2px;
        margin-bottom: 10px;
      }
      .sd-card__desc {
        color: var(--muted);
        line-height: 1.7;
      }
      .sd-card__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 14px;
        align-items: center;
      }
      .sd-btn {
        appearance: none;
        border: 1px solid rgba(122,167,255,0.25);
        background: linear-gradient(180deg, rgba(14,21,35,0.8), rgba(10,16,27,0.55));
        color: #eaf2ff;
        padding: 8px 12px;
        border-radius: 12px;
        cursor: pointer;
        font: inherit;
        letter-spacing: 0.2px;
        transition: transform 140ms ease, border-color 200ms ease, background 200ms ease, box-shadow 200ms ease;
      }
      .sd-btn:hover {
        border-color: rgba(122,167,255,0.45);
        background: linear-gradient(180deg, rgba(18,28,46,0.9), rgba(12,19,33,0.65));
        box-shadow: 0 6px 24px rgba(122,167,255,0.12), inset 0 0 22px rgba(165,123,255,0.08);
      }
      .sd-btn:active { transform: translateY(1px) scale(0.99); }

      /* Tag pills */
      .sd-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
      .sd-tag {
        font-size: 12px;
        letter-spacing: 0.3px;
        padding: 6px 8px;
        border-radius: 999px;
        color: #dbe7ff;
        border: 1px solid rgba(122,167,255,0.20);
        background: linear-gradient(180deg, rgba(13,20,33,0.7), rgba(13,20,33,0.25));
      }

      /* Feature rows */
      .sd-feature {
        display: grid;
        gap: 14px;
      }
      @media (min-width: 880px) { .sd-feature { grid-template-columns: 48px 1fr; } }
      .sd-feature__icon {
        width: 48px; height: 48px; border-radius: 12px;
        background: conic-gradient(from 210deg, var(--brand), var(--accent), var(--brand-2), var(--brand));
        filter: drop-shadow(0 0 16px rgba(122,167,255,0.25));
      }
      .sd-feature__title {
        color: #eaf2ff;
        margin: 0 0 4px;
        letter-spacing: 0.2px;
      }
      .sd-feature__desc { color: var(--muted); line-height: 1.7; }

      /* Reveal animation */
      .reveal { opacity: 0; transform: translateY(14px); }
      .reveal.in {
        opacity: 1; transform: translateY(0);
        transition: opacity 700ms cubic-bezier(.2,.8,.2,1), transform 700ms cubic-bezier(.2,.8,.2,1);
      }
      .reveal.in .sd-card {
        box-shadow: 0 20px 60px rgba(10, 20, 40, 0.35);
      }

      /* Footer CTA */
      .sd-cta {
        position: relative;
        max-width: 1200px;
        margin: 8vh auto 10vh;
        padding: clamp(16px, 4vw, 28px);
        border-radius: 18px;
        border: 1px solid rgba(122,167,255,0.08);
        background:
          linear-gradient(180deg, rgba(11,15,23,0.55), rgba(11,15,23,0.18));
        backdrop-filter: blur(8px) saturate(115%);
        overflow: hidden;
      }
      .sd-cta__title {
        font-size: clamp(22px, 3.2vw, 34px);
        margin: 6px 0 8px;
        color: #eaf2ff;
        font-weight: 800;
        letter-spacing: 0.2px;
      }
      .sd-cta__desc { color: var(--muted); max-width: 70ch; }

      /* Focus switcher */
      .focus {
        display: grid;
        gap: 12px;
      }
      @media (min-width: 880px) { .focus { grid-template-columns: 280px 1fr; } }
      .focus__tabs {
        display: grid;
        gap: 10px;
      }
      .focus__tab {
        appearance: none;
        text-align: left;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(122,167,255,0.18);
        background: linear-gradient(180deg, rgba(13,20,33,0.5), rgba(13,20,33,0.2));
        color: var(--muted);
        letter-spacing: 0.2px;
        cursor: pointer;
      }
      .focus__tab[aria-selected="true"] {
        color: #eaf2ff;
        border-color: rgba(122,167,255,0.38);
        box-shadow: inset 0 0 24px rgba(122,167,255,0.10);
      }
      .focus__panel {
        border-radius: 16px;
        border: 1px solid rgba(122,167,255,0.10);
        background: linear-gradient(180deg, rgba(13,20,33,0.55), rgba(13,20,33,0.18));
        padding: clamp(14px, 2.2vw, 20px);
        min-height: 200px;
      }
    `,
    });
    sections[0].appendChild(css);
    return sections;
  }

  function sectionProjects() {
    const root = el(
      "section",
      { className: "sd-section reveal", id: "projects" },
      [
        eyebrow("Projects"),
        el(
          "h2",
          { className: "sd-section__title" },
          "Open-source tools with cosmic caliber",
        ),
        el(
          "p",
          { className: "sd-section__lead" },
          "From hand-polished terminal utilities to orchestration bots and experimental UIs, each project is designed to feel inevitable—minimal surface, deep craft.",
        ),
        projectsGrid(),
        focusSwitcher(),
      ],
    );
    return root;
  }

  function projectsGrid() {
    const cards = [
      {
        title: "Terminal Utilities",
        meta: "Fast • Ergonomic • Composable",
        desc: "Small, sharp tools that do one thing beautifully. Thoughtful UX for the command line: crisp output, sane defaults, and frictionless composition.",
        tags: ["Rust", "POSIX", "CLI UX", "Zero-config"],
        links: [
          { label: "View Repo", href: "#terminal-repo" },
          { label: "Docs", href: "#terminal-docs" },
        ],
      },
      {
        title: "Discord Bot — Pueue + Minecraft",
        meta: "Task orchestration • Community-first",
        desc: "A Discord-native control plane for Minecraft servers using Pueue under the hood. Queue tasks, watch logs, coordinate mods, and keep worlds thriving.",
        tags: ["Discord", "Pueue", "Minecraft", "Task Runner"],
        links: [
          { label: "Bot Repo", href: "#discord-repo" },
          { label: "Pueue", href: "https://github.com/Nukesor/pueue" },
        ],
      },
      {
        title: "Love2D GUI • MacBook Touchpad",
        meta: "Playful • Tactile • Precise",
        desc: "A custom UI library for Love2D with native-feeling MacBook touchpad gestures. Smooth kinetic interactions that translate creative intent into motion.",
        tags: ["Lua", "Love2D", "Touchpad", "Gestures"],
        links: [
          { label: "Library Repo", href: "#love2d-repo" },
          { label: "Examples", href: "#love2d-examples" },
        ],
      },
    ];

    const grid = el("div", { className: "grid grid-3" });
    for (const c of cards) {
      grid.appendChild(
        el("article", { className: "sd-card" }, [
          el("h3", { className: "sd-card__title" }, c.title),
          el("div", { className: "sd-card__meta" }, c.meta),
          el("p", { className: "sd-card__desc" }, c.desc),
          el(
            "div",
            { className: "sd-tags" },
            c.tags.map((t) => el("span", { className: "sd-tag" }, t)),
          ),
          el(
            "div",
            { className: "sd-card__actions" },
            c.links.map((l) =>
              el(
                "a",
                {
                  className: "sd-btn",
                  href: l.href,
                  target: l.href.startsWith("http") ? "_blank" : "_self",
                  rel: "noopener noreferrer",
                },
                l.label,
              ),
            ),
          ),
        ]),
      );
    }
    return grid;
  }

  function focusSwitcher() {
    const root = el("div", {
      className: "focus",
      role: "tablist",
      ariaLabel: "Project focus",
    });
    const tabsWrap = el("div", { className: "focus__tabs" });
    const panel = el("div", { className: "focus__panel" });

    const modes = [
      {
        id: "focus-cli",
        label: "Terminal Philosophy",
        content: `
          • Clarity over ceremony. • Latency is UX. • Output that reads like design.
          Compose without thinking about it—flags that feel guessed right the first time.
        `,
      },
      {
        id: "focus-bot",
        label: "Discord + Pueue",
        content: `
          Discord as command surface: issue tasks, watch tails, and coordinate modpacks.
          Pueue ensures resilient orchestration so play never blocks on ops.
        `,
      },
      {
        id: "focus-love2d",
        label: "Love2D Touch UI",
        content: `
          Tactile gestures with fidelity to native trackpad feel—momentum, friction,
          and spring tuned for expressiveness. UI that responds like an instrument.
        `,
      },
    ];

    function setActive(id) {
      for (const b of qsa(".focus__tab", tabsWrap)) {
        const on = b.id === id;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
      }
      const m = modes.find((m) => m.id === id) || modes[0];
      panel.innerHTML = "";
      panel.appendChild(el("h4", { className: "sd-card__title" }, m.label));
      panel.appendChild(
        el("p", { className: "sd-card__desc" }, m.content.trim()),
      );
    }

    for (const m of modes) {
      const btn = el("button", {
        className: "focus__tab",
        id: m.id,
        role: "tab",
        ariaSelected: "false",
        textContent: m.label,
      });
      btn.addEventListener("click", () => setActive(m.id));
      btn.addEventListener("keydown", (e) => {
        const idx = modes.findIndex((x) => x.id === m.id);
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          const next = modes[(idx + 1) % modes.length];
          setActive(next.id);
          qs(`#${next.id}`, tabsWrap).focus();
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          const prev = modes[(idx - 1 + modes.length) % modes.length];
          setActive(prev.id);
          qs(`#${prev.id}`, tabsWrap).focus();
        }
      });
      tabsWrap.appendChild(btn);
    }

    setActive(modes[0].id);
    root.appendChild(tabsWrap);
    root.appendChild(panel);
    return root;
  }

  function sectionPhilosophy() {
    const root = el(
      "section",
      { className: "sd-section reveal", id: "philosophy" },
      [
        eyebrow("Philosophy"),
        el(
          "h2",
          { className: "sd-section__title" },
          "Minimal surface, deep craft",
        ),
        el(
          "p",
          { className: "sd-section__lead" },
          "We are allergic to noise. Every choice must earn its place. The result is software that disappears until you need it—and delights when you do.",
        ),
        el("div", { className: "grid grid-3" }, [
          feature(
            "Latency is UX",
            "Microseconds matter when they add up to flow. We optimize tight loops and tight feedback.",
          ),
          feature(
            "Legibility at speed",
            "Interfaces should be learnable at a glance and expressive at depth. Defaults feel obvious in hindsight.",
          ),
          feature(
            "Harmony with the system",
            "Tools that feel native to their environment—terminal, Discord, or touchpad.",
          ),
        ]),
      ],
    );
    return root;
  }

  function sectionShowcase() {
    const root = el(
      "section",
      { className: "sd-section reveal", id: "showcase" },
      [
        eyebrow("Showcase"),
        el(
          "h2",
          { className: "sd-section__title" },
          "Project showcase: crafted and connected",
        ),
        el(
          "p",
          { className: "sd-section__lead" },
          "Scroll to explore Stardive’s projects with layered visuals, concise descriptions, and clear calls to action.",
        ),
        showcaseDeck(),
      ],
    );
    return root;
  }

  function showcaseDeck() {
    const deck = el("div", { className: "grid" });
    deck.appendChild(
      showcaseRow({
        title: "Terminal Utilities",
        meta: "Fast • Ergonomic • Composable",
        desc: "Small, sharp tools that do one thing beautifully. Output that reads like design, latency that respects flow.",
        tags: ["Rust", "CLI UX", "Zero-config", "Pipelines"],
        links: [
          { label: "View Repo", href: "#terminal-repo" },
          { label: "Docs", href: "#terminal-docs" },
        ],
        mediaKind: "terminal",
      }),
    );

    deck.appendChild(
      showcaseRow({
        title: "Discord Bot — Pueue + Minecraft",
        meta: "Task orchestration • Community-first",
        desc: "A Discord-native control plane for Minecraft servers. Queue tasks, watch logs, and coordinate modpacks through Pueue.",
        tags: ["Discord", "Pueue", "Minecraft", "Task Runner"],
        links: [
          { label: "Bot Repo", href: "#discord-repo" },
          { label: "Pueue", href: "https://github.com/Nukesor/pueue" },
        ],
        mediaKind: "discord",
        flipped: true,
      }),
    );

    deck.appendChild(
      showcaseRow({
        title: "Love2D GUI • MacBook Touchpad",
        meta: "Playful • Tactile • Precise",
        desc: "A custom UI library for Love2D with native-feeling MacBook touchpad gestures. Kinetic motion tuned like an instrument.",
        tags: ["Lua", "Love2D", "Touchpad", "Gestures"],
        links: [
          { label: "Library Repo", href: "#love2d-repo" },
          { label: "Examples", href: "#love2d-examples" },
        ],
        mediaKind: "love2d",
      }),
    );

    // Styles for the showcase rows and media placeholders
    const css = el("style", {
      textContent: `
      .sd-showcase {
        display: grid;
        gap: clamp(14px, 2.4vw, 22px);
        grid-template-columns: 1.1fr 0.9fr;
        align-items: stretch;
      }
      .sd-showcase.flipped {
        grid-template-columns: 0.9fr 1.1fr;
      }
      @media (max-width: 880px) {
        .sd-showcase, .sd-showcase.flipped { grid-template-columns: 1fr; }
      }
      .sd-media {
        position: relative;
        border-radius: 16px;
        border: 1px solid rgba(122,167,255,0.10);
        background: radial-gradient(120% 140% at 20% 0%,
                    rgba(122,167,255,0.10), rgba(165,123,255,0.08), rgba(13,20,33,0.35));
        overflow: hidden;
        min-height: clamp(220px, 36vh, 420px);
        box-shadow: inset 0 0 40px rgba(122,167,255,0.10);
        transform: translateZ(0);
      }
      .sd-media__glow {
        position: absolute; inset: -20% -20%;
        background:
          radial-gradient(40% 30% at 20% 10%, rgba(122,167,255,0.25), transparent 70%),
          radial-gradient(45% 35% at 80% 60%, rgba(90,240,211,0.18), transparent 70%),
          radial-gradient(65% 55% at 60% -10%, rgba(165,123,255,0.20), transparent 75%);
        mix-blend-mode: screen;
        filter: blur(10px);
        opacity: 0.75;
        will-change: transform;
      }
      .sd-media__frame {
        position: absolute;
        inset: 18px;
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(6,10,18,0.8), rgba(10,16,27,0.65));
        border: 1px solid rgba(122,167,255,0.15);
        overflow: hidden;
      }
      .sd-media__terminal,
      .sd-media__discord,
      .sd-media__canvas {
        position: absolute; inset: 0;
        padding: 14px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 13px;
        color: #cfe0ff;
        line-height: 1.5;
        opacity: 0.95;
        white-space: pre-wrap;
      }
      .sd-media__terminal code,
      .sd-media__discord code { color: #a6c8ff; }
      .sd-media__header {
        position: absolute; top: 0; left: 0; right: 0;
        height: 34px;
        background: linear-gradient(180deg, rgba(18,26,41,0.85), rgba(8,14,25,0.7));
        border-bottom: 1px solid rgba(122,167,255,0.15);
        display: grid; grid-auto-flow: column; gap: 10px; align-items: center;
        padding: 0 10px;
        color: #9fb0d1; font-size: 12px; letter-spacing: 0.4px;
      }
      .sd-media__dots {
        display: inline-grid; grid-auto-flow: column; gap: 6px;
      }
      .sd-media__dot {
        width: 8px; height: 8px; border-radius: 999px;
        background: radial-gradient(circle at 30% 30%, #fff, #9fc7ff 60%, rgba(122,167,255,0));
        box-shadow: 0 0 10px rgba(122,167,255,0.4);
      }
      .sd-media__content {
        position: absolute; inset: 38px 6px 6px 6px;
        overflow: auto;
      }
      .sd-showcase .sd-card {
        height: 100%;
        display: grid; align-content: start;
      }
      .sd-showcase .sd-card .sd-tags { margin-top: 10px; }
      .sd-showcase .sd-card .sd-card__actions { margin-top: auto; padding-top: 6px; }
    `,
    });
    deck.appendChild(css);

    return deck;
  }

  function showcaseRow({
    title,
    meta,
    desc,
    tags,
    links,
    mediaKind,
    flipped = false,
  }) {
    const row = el("div", {
      className: `sd-showcase ${flipped ? "flipped" : ""}`,
    });

    const media = el("div", { className: "sd-media" }, [
      el("div", { className: "sd-media__glow", ariaHidden: "true" }),
      el("div", { className: "sd-media__frame" }, [
        el("div", { className: "sd-media__header" }, [
          el("div", { className: "sd-media__dots" }, [
            el("span", { className: "sd-media__dot", ariaHidden: "true" }),
            el("span", { className: "sd-media__dot", ariaHidden: "true" }),
            el("span", { className: "sd-media__dot", ariaHidden: "true" }),
          ]),
          el(
            "div",
            null,
            mediaKind === "terminal"
              ? "Terminal"
              : mediaKind === "discord"
                ? "Discord"
                : "Canvas",
          ),
          el("div"),
        ]),
        el("div", { className: "sd-media__content" }, [
          mediaKind === "terminal"
            ? terminalDemo()
            : mediaKind === "discord"
              ? discordDemo()
              : love2dDemo(),
        ]),
      ]),
    ]);

    const card = el("article", { className: "sd-card" }, [
      el("h3", { className: "sd-card__title" }, title),
      el("div", { className: "sd-card__meta" }, meta),
      el("p", { className: "sd-card__desc" }, desc),
      el(
        "div",
        { className: "sd-tags" },
        tags.map((t) => el("span", { className: "sd-tag" }, t)),
      ),
      el(
        "div",
        { className: "sd-card__actions" },
        links.map((l) =>
          el(
            "a",
            {
              className: "sd-btn",
              href: l.href,
              target: l.href.startsWith("http") ? "_blank" : "_self",
              rel: "noopener noreferrer",
            },
            l.label,
          ),
        ),
      ),
    ]);

    if (flipped) {
      row.appendChild(card);
      row.appendChild(media);
    } else {
      row.appendChild(media);
      row.appendChild(card);
    }

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Gentle hover parallax
      const glow = media.querySelector(".sd-media__glow");
      media.addEventListener("pointermove", (e) => {
        const r = media.getBoundingClientRect();
        const xr = ((e.clientX - r.left) / r.width) * 2 - 1;
        const yr = ((e.clientY - r.top) / r.height) * 2 - 1;
        glow.style.transform = `translate(${xr * 8}px, ${yr * 6}px)`;
      });
      media.addEventListener("pointerleave", () => {
        glow.style.transform = "";
      });
    }

    return row;
  }

  function terminalDemo() {
    const wrap = el("div", { className: "sd-media__terminal" });
    const lines = [
      "$ stardive find --type bot --fast",
      "  ▸ discord-bot    ✓ healthy   tasks: 12   queue: 2",
      "  ▸ minecraft-node ✓ synced    players: 5   mods: 22",
      "",
      '$ stardive exec --on minecraft-node "pueue add ./backup_world.sh"',
      "  queued  job#248  ./backup_world.sh",
      "",
      "$ stardive tail --job 248",
      "  [00:01] compressing region files... 42%",
      "  [00:04] archiving...  100%  ✓ done",
    ];
    wrap.textContent = lines.join("\n");
    return wrap;
  }

  function discordDemo() {
    const wrap = el("div", { className: "sd-media__discord" });
    const lines = [
      '[#ops] /queue add --server survival --task "modpack update"',
      "↳ Pueue: enqueued task#512 (modpack update)",
      "",
      "[#ops] /queue status",
      "• task#509 backup_world.sh    running   00:04",
      "• task#510 restart_server.sh  queued",
      "• task#511 rotate_logs.sh     queued",
      "",
      "[#ops] /tail 509",
      "  [00:02] writing snapshot...",
    ];
    wrap.textContent = lines.join("\n");
    return wrap;
  }

  function love2dDemo() {
    const wrap = el("div", { className: "sd-media__canvas" });
    const lines = [
      '-- touchpad.gesture("swipe", dx, dy) → spring:scroll',
      '-- touchpad.gesture("pinch", scale)  → zoom:canvas',
      "",
      'ui:panel("Navigator")',
      "  :scrollY(ease.outSpring)",
      '  :onGesture("swipe", function(dx, dy) scrollY:add(dy) end)',
      '  :onGesture("pinch", function(s) zoom:set(zoom:get() * s) end)',
    ];
    wrap.textContent = lines.join("\n");
    return wrap;
  }

  function sectionContact() {
    const root = el(
      "section",
      { className: "sd-section reveal", id: "contact" },
      [
        eyebrow("Contact"),
        el(
          "h2",
          { className: "sd-section__title" },
          "Open-source, open cosmos",
        ),
        el(
          "p",
          { className: "sd-section__lead" },
          "Have a project that wants to feel inevitable? Let’s talk about how to align craft, performance, and play.",
        ),
        el("div", { className: "grid" }, [
          el(
            "form",
            {
              className: "sd-card",
              onsubmit: (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(e.currentTarget));
                // In a real app, post to your endpoint here.
                alert(
                  `Thanks! We’ll reach out.\n\n${JSON.stringify(data, null, 2)}`,
                );
                e.currentTarget.reset();
              },
            },
            [
              field("Your name", "name", "text", { required: true }),
              field("Email", "email", "email", { required: true }),
              field("Message", "message", "textarea", {
                required: true,
                rows: 5,
              }),
              el("div", { className: "sd-card__actions" }, [
                el(
                  "button",
                  { type: "submit", className: "sd-btn" },
                  "Send message",
                ),
                el(
                  "a",
                  {
                    className: "sd-btn",
                    href: "#",
                    onclick: (e) => {
                      e.preventDefault();
                      window.scrollTo({
                        top: 0,
                        behavior: prefersReduced ? "auto" : "smooth",
                      });
                    },
                  },
                  "Back to top",
                ),
              ]),
            ],
          ),
        ]),
      ],
    );
    return root;
  }

  function buildFooterCTA() {
    return el(
      "section",
      { className: "sd-cta reveal", "aria-label": "Call to action" },
      [
        el(
          "h3",
          { className: "sd-cta__title" },
          "Stardive is a doorway—step through.",
        ),
        el(
          "p",
          { className: "sd-cta__desc" },
          "Explore repositories, try the tools, or start a conversation. The cosmos rewards curiosity.",
        ),
        el(
          "div",
          { className: "sd-card__actions", style: "margin-top:14px;" },
          [
            el(
              "a",
              { className: "sd-btn", href: "#projects" },
              "Explore Projects",
            ),
            el("a", { className: "sd-btn", href: "#contact" }, "Get in Touch"),
          ],
        ),
      ],
    );
  }

  function eyebrow(text) {
    return el("span", { className: "sd-section__eyebrow" }, [
      el("span", { className: "sd-dot", ariaHidden: "true" }),
      text,
    ]);
  }

  function feature(title, desc) {
    return el("div", { className: "sd-card sd-feature" }, [
      el("div", { className: "sd-feature__icon", ariaHidden: "true" }),
      el("div", null, [
        el("h3", { className: "sd-feature__title" }, title),
        el("p", { className: "sd-feature__desc" }, desc),
      ]),
    ]);
  }

  function miniScene(title, desc) {
    const card = el("div", { className: "sd-card" }, [
      el("h3", { className: "sd-card__title" }, title),
      el("p", { className: "sd-card__desc" }, desc),
    ]);
    if (!prefersReduced) {
      card.style.setProperty("transform", "translateZ(0)");
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const xr = ((e.clientX - r.left) / r.width) * 2 - 1;
        const yr = ((e.clientY - r.top) / r.height) * 2 - 1;
        card.style.transform = `rotateX(${yr * -2}deg) rotateY(${xr * 2}deg) translateZ(0)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transform = "translateZ(0)";
      });
    }
    return card;
  }

  function field(label, name, type = "text", options = {}) {
    const id = `f_${name}_${Math.random().toString(36).slice(2, 7)}`;
    const wrap = el("label", { className: "sd-field", htmlFor: id });
    const labelNode = el("div", {
      className: "sd-card__meta",
      textContent: label,
    });
    let input;

    if (type === "textarea") {
      input = el("textarea", {
        id,
        name,
        rows: options.rows || 4,
        required: !!options.required,
        className: "sd-input",
      });
    } else {
      input = el("input", {
        id,
        name,
        type,
        required: !!options.required,
        className: "sd-input",
      });
    }

    const styles = el("style", {
      textContent: `
      .sd-field { display: grid; gap: 6px; margin-bottom: 12px; }
      .sd-input {
        appearance: none;
        width: 100%;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(122,167,255,0.18);
        background: linear-gradient(180deg, rgba(13,20,33,0.6), rgba(13,20,33,0.2));
        color: #eaf2ff;
        font: inherit;
        letter-spacing: 0.2px;
        outline: none;
        transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;
      }
      .sd-input:focus {
        border-color: rgba(122,167,255,0.40);
        box-shadow: 0 0 0 4px rgba(122,167,255,0.12);
        background: linear-gradient(180deg, rgba(16,25,40,0.75), rgba(13,20,33,0.30));
      }
      textarea.sd-input { resize: vertical; }
    `,
    });

    wrap.appendChild(styles);
    wrap.appendChild(labelNode);
    wrap.appendChild(input);
    return wrap;
  }

  function setupSmoothScroll(nav) {
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a.sd-nav__link");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      const target = qs(href);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 90;
      if (
        "scrollBehavior" in document.documentElement.style &&
        !prefersReduced
      ) {
        window.scrollTo({ top: y, behavior: "smooth" });
      } else {
        window.scrollTo(0, y);
      }
    });
  }

  function setupScrollSpy(nav) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = "#" + entry.target.id;
            for (const a of qsa(".sd-nav__link", nav)) {
              a.classList.toggle("is-active", a.getAttribute("href") === id);
            }
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0.06 },
    );

    for (const s of qsa(".sd-section")) observer.observe(s);
  }

  function setupSectionReveals(sections) {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12 },
    );

    for (const s of sections) obs.observe(s);
  }

  function setupMagneticHover() {
    // Subtle magnetic pull for buttons
    document.addEventListener(
      "mousemove",
      (e) => {
        const target = e.target.closest(".sd-btn");
        if (!target) return;
        const r = target.getBoundingClientRect();
        const xr = ((e.clientX - r.left) / r.width) * 2 - 1;
        const yr = ((e.clientY - r.top) / r.height) * 2 - 1;
        target.style.transform = `translate(${xr * 2}px, ${yr * 2}px)`;
      },
      { passive: true },
    );

    document.addEventListener(
      "mouseleave",
      () => {
        for (const b of qsa(".sd-btn")) b.style.transform = "";
      },
      { passive: true },
    );
  }

  // Boot
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountApp);
  } else {
    mountApp();
  }
})();
