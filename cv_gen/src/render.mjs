import fs from "fs/promises";
import path from "path";
import Handlebars from "handlebars";
import sanitizeHtml from "sanitize-html";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";

/**
 | CLI args:
 | --personal <path>    JSON with personal data (required)
 | --style <path>       JSON with style config (required)
 | --template <path>    Handlebars template file (default: src/template.hbs)
 | --out <path>         Output PDF path (default: output/cv.pdf)
 | --html <path>        Optional: write intermediate HTML here
 | --no-sandbox         Add --no-sandbox to Chromium args
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.replace(/^--/, "");
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function resolveMaybe(projectRoot, p, fallback) {
  if (p) return path.resolve(projectRoot, p);
  return fallback;
}

function mm(val) {
  return `${val}mm`;
}

function buildCss(style) {
  const s = {
    fontFamily: style.fontFamily || "Inter, Roboto, Arial, sans-serif",
    baseFontSize: style.baseFontSize || 11,
    textColor: style.textColor || "#222",
    accentColor: style.accentColor || "#1f5fbf",
    bgAccent: style.bgAccent || "#f5f8ff",
    sectionSpacing: style.sectionSpacing || 8,
    lineHeight: style.lineHeight || 1.45,
    pageMargin: style.pageMargin || {
      top: 15,
      right: 15,
      bottom: 15,
      left: 15,
    },
    columnGap: style.columnGap || 8,
    showSidebar: style.showSidebar !== false,
    sidebarWidth: style.sidebarWidth || 64,
    dividerColor: style.dividerColor || "#ddd",
    headingTransform: style.headingTransform || "uppercase",
    headingLetterSpacing: style.headingLetterSpacing || "0.06em",
    bulletChar: style.bulletChar || "•",
    header: {
      enable: style.header?.enable || false,
      photoInHeader: style.header?.photoInHeader || false,
      height: style.header?.height || 42, // mm
      showDivider: style.header?.showDivider ?? true,
      gradient: style.header?.gradient || [
        "linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.05) 100%)",
      ],
      bg: style.header?.bg || null,
      variant: style.header?.variant || "hero--classic", // classic | slanted
    },
    circlePortrait: {
      enable: style.circlePortrait?.enable || false,
      gap: style.circlePortrait?.gap || 4, // mm padding ring
      ringColor: style.circlePortrait?.ringColor || null,
      blobColor: style.circlePortrait?.blobColor || "#eef2ff",
    },
    brutalism: {
      enable: style.brutalism?.enable || false,
      borderColor: style.brutalism?.borderColor || "#000",
      borderWidth: style.brutalism?.borderWidth || 2, // px
      shadow: style.brutalism?.shadow || "6px 6px 0 #000",
      accentBg: style.brutalism?.accentBg || "#ffef5a",
    },
  };

  function mm(v) {
    return `${v}mm`;
  }
  const pageMargins = `${mm(s.pageMargin.top)} ${mm(s.pageMargin.right)} ${mm(
    s.pageMargin.bottom,
  )} ${mm(s.pageMargin.left)}`;

  return `
  @page { size: A4; margin: ${pageMargins}; }
  html, body {
    padding: 0; margin: 0;
    color: ${s.textColor};
    font-family: ${s.fontFamily};
    font-size: ${s.baseFontSize}pt;
    line-height: ${s.lineHeight};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Hero header */
  ${
    s.header.enable
      ? `
  .hero {
    position: relative;
    min-height: ${mm(s.header.height)};
    display: grid;
    align-items: center;
    padding: ${mm(6)} ${mm(8)};
    ${s.header.bg ? `background: ${s.header.bg};` : ""}
    ${
      s.header.gradient?.length
        ? `background-image: ${s.header.gradient.join(", ")};`
        : ""
    }
    border-radius: 4mm;
    margin-bottom: ${mm(8)};
  }
  .hero.with-photo {
    grid-template-columns: 1fr auto;
    gap: ${mm(8)};
  }
  .hero .name { font-size: ${s.baseFontSize + 7}pt; font-weight: 800; letter-spacing: .01em; }
  .hero .role { color: ${s.accentColor}; font-weight: 700; margin-top: 2mm; }
  .hero .desc { margin-top: 3mm; max-width: 170mm; }
  .hero .hero-photo-wrap {
    width: ${mm(40)}; height: ${mm(40)};
    border-radius: 50%;
    background: ${s.bgAccent};
    display: grid; place-items: center;
    overflow: hidden;
    box-shadow: 0 1mm 4mm rgba(0,0,0,.08);
  }
  .hero .hero-photo { width: 100%; height: 100%; object-fit: cover; }
  .hero-divider { height: 1px; background: ${s.dividerColor}; margin-top: ${mm(4)}; }
  .hero.hero--slanted {
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10mm), 0 100%);
  }
  `
      : ""
  }

  .page {
    display: grid;
    grid-template-columns: ${
      s.showSidebar ? `${mm(s.sidebarWidth)} ${mm(s.columnGap)} 1fr` : "1fr"
    };
    grid-auto-rows: min-content;
  }
  .sidebar { grid-column: 1; }
  .gap { grid-column: 2; }
  .main { grid-column: ${s.showSidebar ? 3 : 1}; }
  ${!s.showSidebar ? ".gap, .sidebar { display: none; }" : ""}

  .name { font-size: ${s.baseFontSize + 5}pt; font-weight: 700; letter-spacing: 0.02em; }
  .role { color: ${s.accentColor}; font-weight: 600; margin-top: 2mm; }
  .section { margin-top: ${mm(s.sectionSpacing)}; page-break-inside: avoid; }
  .section-title {
    font-weight: 700; text-transform: ${s.headingTransform};
    letter-spacing: ${s.headingLetterSpacing};
    color: ${s.accentColor};
    border-bottom: 1px solid ${s.dividerColor};
    padding-bottom: 2mm; margin-bottom: 3mm;
  }
  .muted { color: #666; }
  .badge {
    background: ${s.bgAccent}; color: ${s.accentColor};
    padding: 1mm 2.5mm; border-radius: 3mm;
    margin: 1mm 1.5mm 0 0; display: inline-block;
    font-size: ${Math.max(9, s.baseFontSize - 2)}pt;
  }
  .item { margin-bottom: 4mm; }
  .item .title { font-weight: 600; }
  .item .meta {
    display: flex; gap: 4mm; flex-wrap: wrap;
    color: #555; font-size: ${Math.max(9, s.baseFontSize - 1)}pt;
  }
  .item .desc { margin-top: 1.5mm; }
  .list { margin: 0; padding-left: 0; list-style: none; }
  .list li::before { content: "${s.bulletChar}"; color: ${s.accentColor}; margin-right: 2.5mm; }
  .contact { display: grid; gap: 2mm; font-size: ${Math.max(9, s.baseFontSize - 1)}pt; }
  .contact .label { font-weight: 600; }

  /* Default rectangular photo in sidebar */
  .photo-frame { margin-bottom: 4mm; }
  .photo { width: 100%; border-radius: 2mm; object-fit: cover; display: block; }

  /* Circle portrait with organic cutouts */
  ${
    s.circlePortrait.enable
      ? `
  .circle-portrait .photo-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    display: grid;
    place-items: center;
    margin-bottom: ${mm(6)};
  }
  .circle-portrait .photo-frame .photo {
    width: calc(100% - ${mm(s.circlePortrait.gap * 2)});
    height: calc(100% - ${mm(s.circlePortrait.gap * 2)});
    border-radius: 50%;
    object-fit: cover;
    display: block;
    z-index: 2;
    ${
      s.circlePortrait.ringColor
        ? `box-shadow: 0 0 0 ${mm(
            s.circlePortrait.gap,
          )} ${s.circlePortrait.ringColor} inset;`
        : ""
    }
  }
  /* Organic blob behind circle */
  .circle-portrait .photo-frame::before {
    content: "";
    position: absolute;
    inset: ${mm(2)};
    background: ${s.circlePortrait.blobColor};
    z-index: 1;
    border-radius: 40% 60% 55% 45% / 55% 45% 55% 45%;
    filter: blur(.2mm);
  }
  /* Curved cutouts that intrude into adjacent blocks */
  .circle-portrait .photo-frame::after {
    content: "";
    position: absolute;
    right: -${mm(4)};
    top: ${mm(12)};
    width: ${mm(10)};
    height: ${mm(22)};
    background: white; /* page background to carve the shape */
    border-top-left-radius: ${mm(12)};
    border-bottom-left-radius: ${mm(12)};
    box-shadow: 0 0 0 1px ${s.dividerColor} inset;
  }
  `
      : ""
  }

  /* Cards, can be used by brutalism and fancy */
  .card {
    border-radius: 3mm;
    background: white;
  }

  /* Brutalism theme */
  ${
    s.brutalism.enable
      ? `
  body.is-brutalism {
    background: white;
  }
  .section-title {
    border: ${s.brutalism.borderWidth}px solid ${s.brutalism.borderColor};
    padding: 2mm 3mm;
    background: ${s.brutalism.accentBg};
    margin-bottom: 4mm;
  }
  .card {
    border: ${s.brutalism.borderWidth}px solid ${s.brutalism.borderColor};
    box-shadow: ${s.brutalism.shadow};
    border-radius: 0;
    padding: 3mm;
    margin-bottom: 4mm;
  }
  .badge {
    border: ${s.brutalism.borderWidth}px solid ${s.brutalism.borderColor};
    background: #fff;
    border-radius: 0;
  }
  .sidebar, .main {
    padding: 0;
  }
  .list li::before {
    content: "■";
    color: ${s.textColor};
    margin-right: 2.5mm;
  }
  .hero {
    border: ${s.brutalism.borderWidth}px solid ${s.brutalism.borderColor};
    background: ${s.brutalism.accentBg};
    box-shadow: ${s.brutalism.shadow};
    border-radius: 0;
  }
  `
      : ""
  }
  `;
}

function sanitizeRich(text) {
  if (!text) return "";
  return sanitizeHtml(text, {
    allowedTags: ["b", "i", "em", "strong", "u", "br"],
    allowedAttributes: {},
  });
}

function registerHelpers() {
  Handlebars.registerHelper("join", function (arr, sep) {
    if (!Array.isArray(arr)) return "";
    return arr.join(sep ?? ", ");
  });
  Handlebars.registerHelper("safe", function (str) {
    return new Handlebars.SafeString(sanitizeRich(str));
  });
  Handlebars.registerHelper("ifAny", function (...args) {
    const options = args.pop();
    return args.some(Boolean) ? options.fn(this) : options.inverse(this);
  });
}

async function readJson(p) {
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw);
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const args = parseArgs(process.argv);

  const personalPath = resolveMaybe(
    projectRoot,
    args.personal,
    path.join(projectRoot, "configs", "personal.json"),
  );
  const stylePath = resolveMaybe(
    projectRoot,
    args.style,
    path.join(projectRoot, "configs", "style.json"),
  );
  const templatePath = resolveMaybe(
    projectRoot,
    args.template,
    path.join(__dirname, "template.hbs"),
  );
  const pdfPath = resolveMaybe(
    projectRoot,
    args.out,
    path.join(projectRoot, "output", "cv.pdf"),
  );
  const htmlPath = args.html
    ? resolveMaybe(projectRoot, args.html, args.html)
    : path.join(path.dirname(pdfPath), "cv.html");

  const [personal, style, templateSrc] = await Promise.all([
    readJson(personalPath),
    readJson(stylePath),
    fs.readFile(templatePath, "utf-8"),
  ]);

  registerHelpers();

  const css = buildCss(style);
  const template = Handlebars.compile(templateSrc, { noEscape: true });

  const html = template({
    personal,
    style,
    css,
    now: new Date().toISOString().slice(0, 10),
  });

  await fs.mkdir(path.dirname(pdfPath), { recursive: true });
  await fs.writeFile(htmlPath, html, "utf-8");

  const extraArgs = ["--font-render-hinting=none"];
  if (args["no-sandbox"]) extraArgs.push("--no-sandbox");

  const browser = await puppeteer.launch({
    headless: "new",
    args: extraArgs,
  });

  try {
    const page = await browser.newPage();
    const url =
      htmlPath.startsWith("http://") || htmlPath.startsWith("https://")
        ? htmlPath
        : "file://" + htmlPath;

    await page.goto(url, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    console.log("Generated PDF:", pdfPath);
    if (args.html) {
      console.log("Kept HTML at:", htmlPath);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
