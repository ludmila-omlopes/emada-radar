"use client";
import Link from "next/link";
import { useLocale } from "next-intl";
import type { ComponentProps } from "react";
import { portalHref, portalPaths, stripLocale } from "@/i18n/config";
export function PortalLink({ href, ...props }: ComponentProps<typeof Link>) {
  const locale = useLocale();
  // Crossing into the Portuguese Academy reloads the document and its language.
  if (typeof href === "string" && href.startsWith("/") && !portalPaths.includes(stripLocale(href))) return <a {...props} href={href}/>;
  return <Link {...props} href={typeof href === "string" ? portalHref(locale, href) : href}/>;
}
