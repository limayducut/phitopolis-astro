/**
 * A tiny element builder for the ported chapter visuals: React's JSX → plain DOM.
 *
 * Props follow React's conventions so the original JSX transliterates line for line:
 * `className` → class, camelCase SVG presentation props → kebab-case attributes (except the
 * attributes SVG itself spells in camelCase: viewBox, pathLength, …), numbers stringified the
 * way React does (`String(n)`), `undefined`/`null`/`false` omitted, and a `style` object
 * written with React's px rule for unitless numbers.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** SVG attributes that keep their camelCase spelling in the DOM. */
const CAMEL_ATTRS = new Set([
  "viewBox",
  "preserveAspectRatio",
  "pathLength",
  "gradientUnits",
  "gradientTransform",
  "maskUnits",
  "maskContentUnits",
  "patternUnits",
  "patternContentUnits",
  "clipPathUnits",
]);

/** CSS properties React writes without a px suffix when given a number. */
const UNITLESS = new Set(["opacity", "zIndex", "flex", "flexGrow", "flexShrink", "fontWeight", "lineHeight", "order", "zoom", "fillOpacity", "strokeOpacity", "stopOpacity", "strokeDashoffset"]);

export type Props = Record<string, unknown> & { style?: Record<string, string | number> };
export type Child = Node | string | number | null | undefined | false | readonly Child[];

const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function attrName(name: string, svg: boolean): string {
  if (name === "className") return "class";
  if (name === "htmlFor") return "for";
  if (name.startsWith("data-") || name.startsWith("aria-")) return name;
  if (svg && !CAMEL_ATTRS.has(name)) return kebab(name);
  return name;
}

function applyProps(el: Element, props: Props | null | undefined, svg: boolean): void {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "style") {
      const style = (el as HTMLElement | SVGElement).style;
      for (const [prop, v] of Object.entries(value as Record<string, string | number>)) {
        if (v === undefined || v === null) continue;
        const css = typeof v === "number" && !UNITLESS.has(prop) ? `${String(v)}px` : String(v);
        if (prop.startsWith("--")) style.setProperty(prop, css);
        else (style as unknown as Record<string, string>)[prop] = css;
      }
      continue;
    }
    el.setAttribute(attrName(key, svg), value === true ? "" : String(value));
  }
}

function append(el: Element, children: readonly Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else if (child instanceof Node) el.appendChild(child);
    else el.appendChild(document.createTextNode(String(child)));
  }
}

/** An SVG element. */
export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Child[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  applyProps(el, props, true);
  append(el, children);
  return el;
}

/** An HTML element. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  applyProps(el, props, false);
  append(el, children);
  return el;
}

/** React's `useId` stand-in: a document-unique token per call (letters and digits only). */
let uid = 0;
export const nextId = (): string => `r${(uid += 1).toString(36)}`;
