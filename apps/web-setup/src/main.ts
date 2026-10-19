import "./styles.css";
import { APPS, STRENGTHS, STYLES, defaultStyleFor, getDirective, type ModelFamily } from "./registry.js";

interface WizardState {
  usage: "work" | "money" | "writing" | "everyday" | null;
  selectedApps: Set<ModelFamily>;
  mode: (typeof STYLES)[number]["id"];
  intensity: number;
}

const state: WizardState = {
  usage: null,
  selectedApps: new Set(["openai", "anthropic"]),
  mode: "calibrated",
  intensity: 3,
};

const root = document.getElementById("app-root")!;

function render() {
  root.innerHTML = "";
  root.appendChild(renderAhaDemo());
  root.appendChild(renderOnboardingQuestion());
  root.appendChild(renderAppPicker());
  root.appendChild(renderStylePicker());
  root.appendChild(renderInstructions());
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, children: (Node | string)[] = []): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const child of children) node.append(child);
  return node;
}

function renderAhaDemo(): HTMLElement {
  // 6.5: "the 60-second aha" — a deliberately flawed idea answered with and
  // without Honesty Layer. Static and labelled illustrative (Appendix A's own
  // framing) rather than a live model call this static site cannot make.
  return el("section", { className: "card aha" }, [
    el("h2", {}, ["See the difference (example)"]),
    el("p", { className: "prompt" }, ['"I\'m going to charge customers monthly but let them cancel any time with no notice period — great plan, right?"']),
    el("div", { className: "side-by-side" }, [
      el("div", { className: "without" }, [el("h3", {}, ["Without Honesty Layer"]), el("p", {}, ["That sounds like a great customer-friendly approach! Flexibility like that can really boost satisfaction and word-of-mouth."])]),
      el("div", { className: "with" }, [el("h3", {}, ["With Honesty Layer"]), el("p", {}, ["The flaw: no notice period means you can't forecast revenue, and churn becomes invisible until it already happened. If retention matters, add a short notice window or a pause option instead of full lock-out. Confidence: high — this is a standard subscription-economics issue."])]),
    ]),
  ]);
}

function renderOnboardingQuestion(): HTMLElement {
  const options: { id: WizardState["usage"]; label: string }[] = [
    { id: "work", label: "Work decisions & reviews" },
    { id: "money", label: "Money & big purchases" },
    { id: "writing", label: "Writing & creative work" },
    { id: "everyday", label: "Everyday questions" },
  ];
  return el("section", { className: "card" }, [
    el("h2", {}, ["What do you mostly use AI for?"]),
    el(
      "div",
      { className: "choices" },
      options.map((o) =>
        el("button", {
          className: `choice ${state.usage === o.id ? "selected" : ""}`,
          textContent: o.label,
          onclick: () => {
            state.usage = o.id;
            const def = defaultStyleFor(o.id!);
            state.mode = def.mode;
            state.intensity = def.intensity;
            render();
          },
        })
      )
    ),
  ]);
}

function renderAppPicker(): HTMLElement {
  return el("section", { className: "card" }, [
    el("h2", {}, ["Pick your apps"]),
    el(
      "div",
      { className: "choices" },
      APPS.map((app) =>
        el("label", { className: "checkbox-row" }, [
          el("input", {
            type: "checkbox",
            checked: state.selectedApps.has(app.id),
            onchange: (e: Event) => {
              const checked = (e.target as HTMLInputElement).checked;
              if (checked) state.selectedApps.add(app.id);
              else state.selectedApps.delete(app.id);
              render();
            },
          } as Partial<HTMLInputElement>),
          document.createTextNode(app.label),
        ])
      )
    ),
  ]);
}

function renderStylePicker(): HTMLElement {
  return el("section", { className: "card" }, [
    el("h2", {}, ["Pick a style"]),
    el(
      "div",
      { className: "choices" },
      STYLES.map((s) =>
        el("button", {
          className: `choice ${state.mode === s.id ? "selected" : ""}`,
          onclick: () => {
            state.mode = s.id;
            render();
          },
        }, [el("strong", {}, [s.name]), el("span", { className: "blurb" }, [s.blurb])])
      )
    ),
    el("h3", {}, ["Strength"]),
    el(
      "div",
      { className: "choices" },
      STRENGTHS.map((strength) =>
        el("button", {
          className: `choice ${state.intensity === strength.id ? "selected" : ""}`,
          textContent: strength.name,
          onclick: () => {
            state.intensity = strength.id;
            render();
          },
        })
      )
    ),
  ]);
}

function renderInstructions(): HTMLElement {
  const section = el("section", { className: "card" }, [el("h2", {}, ["Apply it"])]);

  for (const app of APPS) {
    if (!state.selectedApps.has(app.id)) continue;
    const directive = getDirective(state.mode, app.id, state.intensity);
    const block = el("div", { className: "instruction-block" }, [
      el("h3", {}, [app.label]),
      el("div", { className: "screenshot-placeholder" }, [`Screenshot: where to paste this in ${app.label} — ${app.settingsLabel}`]),
      el("textarea", { readOnly: true, value: directive?.text ?? "No tested instructions for this combination yet.", rows: 8 } as Partial<HTMLTextAreaElement>),
      el("div", { className: "actions" }, [
        el("button", {
          textContent: "Copy",
          onclick: async () => {
            if (!directive) return;
            await navigator.clipboard.writeText(directive.text);
          },
        }),
        el("a", { href: app.settingsUrl, target: "_blank", rel: "noreferrer", textContent: `Open ${app.label} settings` }),
      ]),
      directive ? el("p", { className: "version-note" }, [`Tested version: ${directive.version} (${directive.id})`]) : "",
    ]);
    section.appendChild(block);
  }

  return section;
}

render();
