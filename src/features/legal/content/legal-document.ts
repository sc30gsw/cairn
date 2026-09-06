export type LegalLink = {
  href: string;
  label: string;
};

export type LegalSection = {
  heading: string;
  items?: readonly string[];
  links?: readonly LegalLink[];
  paragraphs: readonly string[];
};

export type LegalDocument = {
  lead: string;
  revisedOn: string;
  sections: readonly LegalSection[];
  title: string;
};

export const LEGAL_APP_NAME = "学習ログ（Cairn）";

export const LEGAL_CONTACT_URL = "https://github.com/sc30gsw/cairn/issues";

export const LEGAL_REVISED_ON = "2026-09-06";
