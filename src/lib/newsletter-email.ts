import { createTranslator } from "next-intl";
import pt from "@/i18n/messages/pt-BR.json";
import en from "@/i18n/messages/en.json";
import type { Locale } from "@/i18n/config";
import { newsletterLinks, oneLine, type Digest, type DigestItem } from "./newsletter";

// Email HTML is built from escaped strings with inline styles and table layout,
// which is what mail clients render consistently. Copy lives in the catalogs.
export type OutgoingEmail = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };
export type DigestLinks = { baseUrl: string; unsubscribePage: string; oneClick: string };

const catalogs = { "pt-BR": pt, en };
const copy = (locale: Locale) => createTranslator({ locale, messages: catalogs[locale], namespace: "Newsletter.email" });
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const ink = "#151115", muted = "#6b6368", line = "#ece6ea", accent = "#8e3a6e";
const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const link = (url: string, label: string, style = `color:${ink};font-weight:600;text-decoration:none;`) => url ? `<a href="${escape(url)}" style="${style}">${escape(label)}</a>` : `<strong>${escape(label)}</strong>`;
const button = (url: string, label: string) => `<a href="${escape(url)}" style="display:inline-block;background:${ink};color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:8px;">${escape(label)}</a>`;
const more = (url: string, label: string) => `<p style="margin:4px 0 0;font-size:13px;">${link(url, `${label} →`, `color:${accent};text-decoration:none;`)}</p>`;
const section = (title: string, body: string) => `<tr><td style="padding:22px 28px 6px;border-top:1px solid ${line};"><h2 style="margin:0 0 14px;font-size:17px;line-height:1.3;color:${ink};">${escape(title)}</h2>${body}</td></tr>`;

function layout(locale: Locale, subject: string, preheader: string, home: string, body: string, footer: string) {
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(subject)}</title></head>`
    + `<body style="margin:0;padding:0;background:#f4f1f3;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preheader)}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1f3;"><tr><td align="center" style="padding:24px 12px;">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:${font};color:${ink};">`
    + `<tr><td style="background:#101010;padding:18px 28px;">${link(home, "emada ✳ radar", "color:#e7b5d4;font-size:18px;font-weight:600;letter-spacing:-.01em;text-decoration:none;")}</td></tr>`
    + body
    + `<tr><td style="padding:20px 28px 26px;border-top:1px solid ${line};font-size:12px;line-height:1.6;color:${muted};">${footer}</td></tr>`
    + `</table></td></tr></table></body></html>`;
}

export function confirmationEmail(to: string, locale: Locale, url: string): OutgoingEmail {
  const t = copy(locale);
  const subject = t("confirmSubject");
  const body = `<tr><td style="padding:28px;"><h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">${escape(t("confirmHeading"))}</h1>`
    + `<p style="margin:0 0 22px;font-size:15px;line-height:1.6;">${escape(t("confirmBody"))}</p>${button(url, t("confirmButton"))}`
    + `<p style="margin:22px 0 6px;font-size:13px;line-height:1.5;color:${muted};">${escape(t("confirmFallback"))}</p><p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;">${link(url, url, `color:${accent};`)}</p></td></tr>`;
  const text = [t("confirmHeading"), "", t("confirmBody"), "", url, "", t("confirmIgnore")].join("\n");
  return { to, subject, html: layout(locale, subject, t("confirmPreheader"), new URL(`/${locale}`, url).toString(), body, escape(t("confirmIgnore"))), text };
}

export function digestSubject(digest: Digest) {
  const headline = oneLine(digest.releases[0]?.title ?? digest.news[0]?.title ?? digest.experiments[0]?.title ?? "");
  const chars = Array.from(headline);
  return copy(digest.locale)("digestSubject", { headline: chars.length > 70 ? `${chars.slice(0, 69).join("").trimEnd()}…` : headline });
}

export function digestEmail(to: string, digest: Digest, links: DigestLinks, options: { test?: boolean } = {}): OutgoingEmail {
  const { locale } = digest;
  const t = copy(locale);
  const site = newsletterLinks(links.baseUrl, locale, digest.issueKey);
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const score = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const usd = (value: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 4 : 2 }).format(value);
  const range = t("digestRange", { start: day.format(new Date(digest.start)), end: day.format(new Date(digest.end)) });
  const meta = (item: DigestItem) => `${item.source} · ${day.format(new Date(item.publishedAt))}`;
  const item = (entry: DigestItem, highlight = false) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.45;${highlight ? `border-left:3px solid #e7b5d4;padding-left:12px;` : ""}">${link(entry.url, entry.title)}<br><span style="font-size:12px;color:${muted};">${escape(meta(entry))}</span></p>`;
  const subject = `${options.test ? `${t("testPrefix")} ` : ""}${digestSubject(digest)}`;
  const preheader = digest.releases.length ? t("digestPreheaderReleases", { releases: digest.releases.length }) : t("digestPreheader");
  const sections: string[] = [];
  const lines: string[] = [`${t("digestHeading")} · ${range}`, "", t("digestIntro")];
  const textItems = (title: string, entries: DigestItem[]) => lines.push("", title.toUpperCase(), ...entries.flatMap(entry => [`- ${entry.title} (${meta(entry)})`, `  ${entry.url}`]));

  if (digest.releases.length) {
    sections.push(section(t("releasesTitle"), digest.releases.map(entry => item(entry, true)).join("") + more(site.news, t("moreNews"))));
    textItems(t("releasesTitle"), digest.releases);
  }
  if (digest.news.length) {
    sections.push(section(t("newsTitle"), digest.news.map(entry => item(entry)).join("") + more(site.news, t("moreNews"))));
    textItems(t("newsTitle"), digest.news);
  }
  if (digest.ranking) {
    const rows = digest.ranking.models.map(model => `<tr><td style="padding:7px 0;width:26px;color:${muted};font-size:13px;vertical-align:top;">${model.rank}</td><td style="padding:7px 0;font-size:14px;">${link(model.url, model.name)} <span style="color:${muted};font-size:12px;">${escape(model.organization)}</span></td><td style="padding:7px 0;text-align:right;font-size:14px;font-weight:600;vertical-align:top;">${score.format(model.score)}</td></tr>`).join("");
    const value = digest.bestValue && t(digest.bestValue.costKey === "costPerTask" ? "bestValueCostPerTask" : "bestValueOutput", { model: digest.bestValue.name, organization: digest.bestValue.organization, score: score.format(digest.bestValue.score), cost: usd(digest.bestValue.cost) });
    sections.push(section(t("rankingTitle", { source: digest.ranking.source }), `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>`
      + `<p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:${muted};">${escape(t("rankingNote"))}</p>`
      + (value ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;"><strong>${escape(t("bestValueTitle"))}:</strong> ${escape(value)}</p>` : "")
      + more(site.models, t("moreModels"))));
    lines.push("", t("rankingTitle", { source: digest.ranking.source }).toUpperCase(), ...digest.ranking.models.map(model => `${model.rank}. ${model.name} (${model.organization}) · ${score.format(model.score)}`), t("rankingNote"));
    if (value) lines.push(`${t("bestValueTitle")}: ${value}`);
  }
  if (digest.experiments.length) {
    sections.push(section(t("experimentsTitle"), digest.experiments.map(entry => `<p style="margin:0 0 14px;font-size:15px;line-height:1.45;">${link(entry.url, entry.title)}<br><span style="font-size:12px;color:${muted};">${escape(t("experimentMeta", { points: entry.points, comments: entry.comments }))}${entry.discussionUrl ? ` · ${link(entry.discussionUrl, t("discussion"), `color:${accent};text-decoration:none;`)}` : ""}</span></p>`).join("") + more(site.experiments, t("moreExperiments"))));
    lines.push("", t("experimentsTitle").toUpperCase(), ...digest.experiments.flatMap(entry => [`- ${entry.title} (${t("experimentMeta", { points: entry.points, comments: entry.comments })})`, `  ${entry.url}`]));
  }
  if (digest.voices.length) {
    sections.push(section(t("voicesTitle"), digest.voices.map(voice => `<div style="margin:0 0 16px;padding:12px 14px;background:#faf7f9;border-radius:8px;"><p style="margin:0 0 6px;font-size:13px;"><strong>${escape(voice.name)}</strong> <span style="color:${muted};">@${escape(voice.username)} · ${escape(day.format(new Date(voice.publishedAt)))}</span></p><p style="margin:0 0 6px;font-size:14px;line-height:1.5;white-space:pre-line;">${escape(voice.text)}</p>${link(voice.url, t("viewPost"), `color:${accent};font-size:13px;text-decoration:none;`)}</div>`).join("") + more(site.voices, t("moreVoices"))));
    lines.push("", t("voicesTitle").toUpperCase(), ...digest.voices.flatMap(voice => [`- ${voice.name} (@${voice.username}): ${voice.text.replace(/\s+/g, " ")}`, `  ${voice.url}`]));
  }

  const intro = `<tr><td style="padding:28px 28px 20px;"><p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${muted};">${escape(range)}</p><h1 style="margin:0 0 10px;font-size:26px;line-height:1.2;letter-spacing:-.02em;">${escape(t("digestHeading"))}</h1><p style="margin:0;font-size:15px;line-height:1.6;color:#3b3439;">${escape(t("digestIntro"))}</p></td></tr>`;
  const cta = `<tr><td style="padding:14px 28px 28px;border-top:1px solid ${line};">${button(site.radar, t("openRadar"))}</td></tr>`;
  const sourcesNote = t([...digest.releases, ...digest.news, ...digest.experiments, ...digest.voices].some(entry => entry.translated) ? "sourcesNoteTranslated" : "sourcesNote");
  const footer = `${escape(t("footerReason"))} ${escape(sourcesNote)}<br>${link(links.unsubscribePage, t("unsubscribe"), `color:${muted};text-decoration:underline;`)}`;
  lines.push("", `${t("openRadar")}: ${site.radar}`, "", t("footerReason"), sourcesNote, `${t("unsubscribe")}: ${links.unsubscribePage}`);
  return {
    to, subject,
    html: layout(locale, subject, preheader, site.radar, intro + sections.join("") + cta, footer),
    text: lines.join("\n"),
    headers: { "List-Unsubscribe": `<${links.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
