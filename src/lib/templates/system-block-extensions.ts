import { Mark, mergeAttributes, Node } from "@tiptap/core";

import { AGREEMENT_ACKNOWLEDGEMENT, AGREEMENT_GUEST_FIELDS, AGREEMENT_SIGNATURE_HEADING } from "./content";

export const HighlightMarkExtension = Mark.create({
  name: "highlight",
  parseHTML() {
    return [{ tag: "mark[data-agreement-highlight]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(HTMLAttributes, { class: "agreement-highlight-mark", "data-agreement-highlight": "true" }), 0];
  },
});

function systemBlock(name: "guestFields" | "acknowledgement" | "signature") {
  return Node.create({
    name,
    group: "block",
    atom: true,
    selectable: false,
    parseHTML() {
      return [{ tag: `[data-agreement-system-block="${name}"]` }];
    },
    renderHTML() {
      if (name === "guestFields") {
        const field = (label: string, placeholder: string, required: boolean) => ["div", { class: "agreement-editor-field" },
          ["span", { class: "agreement-editor-label" }, `${label}${required ? " *" : ""}`],
          ["span", { class: "agreement-editor-input" }, placeholder],
        ];
        return ["section", { class: "agreement-editor-system-block", "data-agreement-system-block": name, contenteditable: "false" },
          ["h2", {}, "Guest Information"],
          ["div", { class: "agreement-editor-fields" },
            ...AGREEMENT_GUEST_FIELDS.map((definition) => field(definition.label, definition.placeholder, definition.required)),
          ],
        ];
      }
      if (name === "acknowledgement") {
        return ["div", { class: "agreement-editor-system-block agreement-editor-acknowledgement", "data-agreement-system-block": name, contenteditable: "false" },
          ["span", { class: "agreement-editor-checkbox" }],
          ["strong", {}, `${AGREEMENT_ACKNOWLEDGEMENT} *`],
        ];
      }
      return ["section", { class: "agreement-editor-system-block", "data-agreement-system-block": name, contenteditable: "false" },
        ["h2", {}, `${AGREEMENT_SIGNATURE_HEADING} *`],
        ["div", { class: "agreement-editor-signature" }, "Sign here using your finger or stylus"],
      ];
    },
  });
}

export const GuestFieldsNodeExtension = systemBlock("guestFields");
export const AcknowledgementNodeExtension = systemBlock("acknowledgement");
export const SignatureNodeExtension = systemBlock("signature");
