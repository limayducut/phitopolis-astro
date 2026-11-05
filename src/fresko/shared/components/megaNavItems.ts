export type NavGroupId = "menu";

export interface NavGroup {
  id: NavGroupId;
  label: string;
}

/** One group, in navbar order. The pre-v4 "What We Do" / "Meet The People"
 *  headings were marketing copy with no identity source (T-040). */
export const NAV_GROUPS: NavGroup[] = [{ id: "menu", label: "Menu" }];

export interface NavSectionItem {
  to: string;
  label: string;
  tag: string;
  group: NavGroupId;
}

export const MEGA_NAV_ITEMS: NavSectionItem[] = [
  { to: "/", label: "Home", tag: "01", group: "menu" },
  { to: "/about", label: "About", tag: "02", group: "menu" },
  { to: "/careers", label: "Careers", tag: "03", group: "menu" },
  { to: "/blog", label: "Blog", tag: "04", group: "menu" },
  { to: "/contact", label: "Contact", tag: "05", group: "menu" },
];
