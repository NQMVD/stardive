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
    textColor: style.textColor || "#222222",
    accentColor: style.accentColor || "#1f5fbf",
    bgAccent: style.bgAccent || "#f5f8ff",
    sectionSpacing: style.sectionSpacing || 8,
    lineHeight: style.lineHeight || 1.4,
    pageMargin: style.pageMargin || { top: 15, right: 15, bottom: 15, left: 15 },
    columnGap: style.columnGap || 8,
    showSidebar: style.showSidebar !== false,
    sidebarWidth: style.sidebarWidth || 64,
    dividerColor: style.dividerColor || "#dddddd",
    headingTransform: style.headingTransform || "uppercase",
    headingLetterSpacing: style.headingLetterSpacing || "0.06em",
    bulletChar: style.bulletChar || "•"
  };

  const pageMargins = `${mm(s.pageMargin.top)} ${mm(s.pageMargin.right)} ${mm(
    s.pageMargin.bottom
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
  .photo { width: 100%; border-radius: 2mm; margin-bottom: 4mm; object-fit: cover; }
  .sidebar .block + .block { margin-top: ${mm(s.sectionSpacing)}; }
  .no-break { page-break-inside: avoid; }
  `;
}

function sanitizeRich(text) {
  if (!text) return "";
  return sanitizeHtml(text, {
    allowedTags: ["b", "i", "em", "strong", "u", "br"],
    allowedAttributes: {}
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
    path.join(projectRoot, "configs", "personal.json")
  );
  const stylePath = resolveMaybe(
    projectRoot,
    args.style,
    path.join(projectRoot, "configs", "style.json")
  );
  const templatePath = resolveMaybe(
    projectRoot,
    args.template,
    path.join(__dirname, "template.hbs")
  );
  const pdfPath = resolveMaybe(
    projectRoot,
    args.out,
    path.join(projectRoot, "output", "cv.pdf")
  );
  const htmlPath = args.html
    ? resolveMaybe(projectRoot, args.html, args.html)
    : path.join(path.dirname(pdfPath), "cv.html");

  const [personal, style, templateSrc] = await Promise.all([
    readJson(personalPath),
    readJson(stylePath),
    fs.readFile(templatePath, "utf-8")
  ]);

  registerHelpers();

  const css = buildCss(style);
  const template = Handlebars.compile(templateSrc, { noEscape: true });

  const html = template({
    personal,
    style,
    css,
    now: new Date().toISOString().slice(0, 10)
  });

  await fs.mkdir(path.dirname(pdfPath), { recursive: true });
  await fs.writeFile(htmlPath, html, "utf-8");

  const extraArgs = ["--font-render-hinting=none"];
  if (args["no-sandbox"]) extraArgs.push("--no-sandbox");

  const browser = await puppeteer.launch({
    headless: "new",
    args: extraArgs
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
      displayHeaderFooter: false
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