// ==UserScript==
// @name           Memrise Typing
// @namespace      https://github.com/szczerski/memrise-typing
// @description    Replaces multiple choice with typing input on Memrise. Learn by typing, not clicking.
// @match          https://www.memrise.com/*
// @match          https://app.memrise.com/*
// @match          https://community-courses.memrise.com/*
// @version        1.4.0
// @grant          none
// @run-at         document-idle
// ==/UserScript==

(function () {
  "use strict";

  const CONFIG = {
    replaceMultipleChoice: true,
    // Automatically skip replacement when answers contain CJK characters (Chinese/Japanese/Korean)
    skipCJK: true,
    debug: false,
  };

  function log(...args) {
    if (CONFIG.debug) console.log("[MemriseTyping]", ...args);
  }

  // ─── STYLES ──────────────────────────────────────────────────────
  const STYLE_ID = "memrise-typing-styles";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .mat-typing-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 16px;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
      }
      .mat-typing-input {
        width: 100%;
        padding: 14px 18px;
        font-size: 20px;
        border: 2px solid #ccc;
        border-radius: 12px;
        outline: none;
        text-align: center;
        background: #fff;
        color: #333;
        transition: border-color 0.2s;
      }
      .mat-typing-input:focus {
        border-color: #5bc0be;
        box-shadow: 0 0 0 3px rgba(91, 192, 190, 0.2);
      }
      .mat-typing-input.mat-correct {
        border-color: #4caf50;
        background: #e8f5e9;
      }
      .mat-typing-input.mat-wrong {
        border-color: #f44336;
        background: #ffebee;
      }
      .mat-typing-hint {
        font-size: 13px;
        color: #aaa;
        text-align: center;
        line-height: 1.4;
      }
      .mat-typing-feedback {
        font-size: 16px;
        font-weight: 600;
        min-height: 24px;
      }
      .mat-typing-feedback.correct { color: #4caf50; }
      .mat-typing-feedback.wrong { color: #f44336; }
      .mat-toggle-btn {
        padding: 8px 16px;
        font-size: 14px;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: #f5f5f5;
        color: #555;
        cursor: pointer;
        transition: background 0.15s;
      }
      .mat-toggle-btn:hover { background: #e8e8e8; }
      .mat-choices-hidden { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  // ─── DIACRITICS SIMPLIFICATION ───────────────────────────────────
  // Maps special characters to ASCII equivalents for flexible matching.

  const CHAR_SIMPLIFY = {
    "\u00f8": "o",   // ø
    "\u00e6": "ae",  // æ
    "\u00e5": "a",   // å
    "\u00df": "ss",  // ß
    "\u0142": "l",   // ł
    "\u015b": "s",   // ś
    "\u017a": "z",   // ź
    "\u017c": "z",   // ż
    "\u0107": "c",   // ć
    "\u0144": "n",   // ń
    "\u0105": "a",   // ą
    "\u0119": "e",   // ę
    "\u00f3": "o",   // ó
  };

  function simplify(str) {
    let s = [...str].map(c => CHAR_SIMPLIFY[c] || c).join("");
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return s;
  }

  // ─── HELPERS ─────────────────────────────────────────────────────

  function containsCJK(str) {
    return /[\u3000-\u9fff\uac00-\ud7af\uf900-\ufaff]/.test(str);
  }

  function normalize(str) {
    if (!str) return "";
    let s = str.trim().toLowerCase();
    s = s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    s = s.replace(/\s+/g, " ");
    return s;
  }

  function textsMatch(typed, target) {
    const a = normalize(typed);
    const b = normalize(target);
    if (a === b) return true;
    if (simplify(a) === simplify(b)) return true;
    return false;
  }

  // ─── CORE ────────────────────────────────────────────────────────

  let isProcessing = false;
  const SKIP_ATTR = "data-mat-skip";

  function findMCContainer() {
    // Primary: main memrise.com — buttons with data-testid="mcResponse*"
    const mcButtons = document.querySelectorAll(
      'button[data-testid^="mcResponse"]'
    );
    if (mcButtons.length >= 2) {
      let container = mcButtons[0].parentElement;
      if (container) container = container.parentElement;

      if (container && container.querySelectorAll('button[data-testid^="mcResponse"]').length === mcButtons.length) {
        return { container, buttons: mcButtons };
      }

      if (container && container.parentElement) {
        container = container.parentElement;
        if (container.querySelectorAll('button[data-testid^="mcResponse"]').length === mcButtons.length) {
          return { container, buttons: mcButtons };
        }
      }

      return { container: mcButtons[0].parentElement?.parentElement, buttons: mcButtons };
    }

    // Fallback: community-courses.memrise.com — buttons containing span[dir="auto"]
    const spanButtons = Array.from(document.querySelectorAll('button span[dir="auto"]'))
      .map(s => s.closest("button"))
      .filter((b, i, arr) => b && arr.indexOf(b) === i);

    if (spanButtons.length >= 2) {
      const container = spanButtons[0].parentElement?.parentElement;
      if (container) return { container, buttons: spanButtons };
    }

    return null;
  }

  function stripLeadingNumber(str) {
    return str.replace(/^\d+\s*/, "");
  }

  function extractChoices(buttons) {
    const choices = [];
    buttons.forEach((btn, i) => {
      const raw = btn.textContent?.trim() || "";
      const text = stripLeadingNumber(raw);
      choices.push({ text, raw, button: btn, index: i });
    });
    return choices;
  }

  function alreadyReplaced(container) {
    if (!container) return false;
    const parent = container.parentElement || container;
    return parent.querySelector(".mat-typing-container") !== null;
  }

  function injectTypingUI(mcData) {
    const { container, buttons } = mcData;
    if (alreadyReplaced(container)) return;
    if (container.hasAttribute(SKIP_ATTR)) return;

    const choices = extractChoices(buttons);
    if (choices.length === 0) return;

    if (CONFIG.skipCJK && choices.some((c) => containsCJK(c.text))) {
      log("Skipping: CJK detected");
      return;
    }

    log("Replacing MC. Choices:", choices.map((c) => c.text));

    container.classList.add("mat-choices-hidden");

    const wrapper = document.createElement("div");
    wrapper.className = "mat-typing-container";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "mat-typing-input";
    input.placeholder = "Type your answer...";
    input.autocomplete = "off";
    input.autocapitalize = "off";
    input.spellcheck = false;

    const feedback = document.createElement("div");
    feedback.className = "mat-typing-feedback";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "mat-toggle-btn";
    toggleBtn.textContent = "Show buttons (Tab)";
    toggleBtn.type = "button";

    const hint = document.createElement("div");
    hint.className = "mat-typing-hint";
    hint.textContent = "Enter = check | Shift+Enter = reveal answers | Tab = show MC buttons";

    wrapper.appendChild(input);
    wrapper.appendChild(feedback);
    wrapper.appendChild(toggleBtn);
    wrapper.appendChild(hint);

    container.parentElement.insertBefore(wrapper, container.nextSibling);
    setTimeout(() => input.focus(), 50);

    let answered = false;

    function switchToMC() {
      container.setAttribute(SKIP_ATTR, "true");
      container.classList.remove("mat-choices-hidden");
      wrapper.remove();
    }

    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      switchToMC();
    });

    input.addEventListener("keydown", (e) => {
      if (answered) return;

      if (e.key === "Tab") {
        e.preventDefault();
        switchToMC();
        return;
      }

      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        feedback.textContent = choices.map((c) => c.text).join(" | ");
        feedback.className = "mat-typing-feedback";
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const typed = input.value;
        const match = choices.find((c) => textsMatch(typed, c.text));

        if (match) {
          answered = true;
          input.classList.add("mat-correct");
          feedback.textContent = "\u2713 Correct!";
          feedback.className = "mat-typing-feedback correct";
          container.classList.remove("mat-choices-hidden");
          wrapper.remove();
          match.button.click();
        } else {
          input.classList.add("mat-wrong");
          feedback.textContent = "\u2717 Try again";
          feedback.className = "mat-typing-feedback wrong";
          setTimeout(() => {
            input.classList.remove("mat-wrong");
            input.select();
          }, 800);
        }
      }
    });
  }

  // ─── OBSERVER ────────────────────────────────────────────────────

  function checkAndReplace() {
    if (isProcessing) return;
    isProcessing = true;
    try {
      if (!CONFIG.replaceMultipleChoice) return;
      const mcData = findMCContainer();
      if (!mcData || !mcData.container) return;

      if (mcData.container.hasAttribute(SKIP_ATTR) && !mcData.container.classList.contains("mat-choices-hidden")) {
        const prevTexts = mcData.container.getAttribute("data-mat-texts") || "";
        const currTexts = Array.from(mcData.buttons).map(b => b.textContent).join("|");
        if (prevTexts !== currTexts) {
          mcData.container.removeAttribute(SKIP_ATTR);
        }
      }

      if (alreadyReplaced(mcData.container)) return;
      if (mcData.container.hasAttribute(SKIP_ATTR)) return;

      if (mcData.buttons.length >= 2) {
        const currTexts = Array.from(mcData.buttons).map(b => b.textContent).join("|");
        mcData.container.setAttribute("data-mat-texts", currTexts);
        injectTypingUI(mcData);
      }
    } finally {
      isProcessing = false;
    }
  }

  const observer = new MutationObserver(() => {
    clearTimeout(observer._timer);
    observer._timer = setTimeout(checkAndReplace, 200);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  setTimeout(checkAndReplace, 500);
  log("Memrise Typing v1.4.0 loaded.");
})();
