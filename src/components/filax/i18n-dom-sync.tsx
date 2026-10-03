import { useEffect } from "react";
import { translate, useI18n } from "@/lib/i18n";

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const ATTRIBUTES = ["aria-label", "placeholder", "title"];

function syncElement(root: Node, lang: "fr" | "en") {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  if (root.nodeType === Node.TEXT_NODE) texts.push(root as Text);
  while (walker.nextNode()) texts.push(walker.currentNode as Text);

  for (const node of texts) {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE"].includes(parent.tagName)) continue;
    const current = node.nodeValue ?? "";
    if (!originalText.has(node)) originalText.set(node, current);
    const source = originalText.get(node) ?? current;
    const leading = source.match(/^\s*/)?.[0] ?? "";
    const trailing = source.match(/\s*$/)?.[0] ?? "";
    const core = source.trim();
    const next = core ? `${leading}${translate(core, lang)}${trailing}` : source;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  const elements = root.nodeType === Node.ELEMENT_NODE
    ? [root as Element, ...(root as Element).querySelectorAll("*")]
    : [...document.querySelectorAll("*")];
  for (const element of elements) {
    let originals = originalAttributes.get(element);
    if (!originals) {
      originals = new Map<string, string>();
      originalAttributes.set(element, originals);
    }
    for (const attribute of ATTRIBUTES) {
      const current = element.getAttribute(attribute);
      if (current == null) continue;
      if (!originals.has(attribute)) originals.set(attribute, current);
      const source = originals.get(attribute) ?? current;
      const next = translate(source, lang);
      if (current !== next) element.setAttribute(attribute, next);
    }
  }
}

export function I18nDomSync() {
  const { lang } = useI18n();

  useEffect(() => {
    syncElement(document.body, lang);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") syncElement(mutation.target, lang);
        for (const node of mutation.addedNodes) syncElement(node, lang);
      }
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [lang]);

  return null;
}