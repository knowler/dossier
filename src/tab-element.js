import { BaseElement, html } from "./base-element.js";
import { ContextConsumer } from "./context-protocol.js";

/**
 * Tab element
 */
export class TabElement extends ContextConsumer(BaseElement) {
	static role = "tab";
	static content = html`<slot>`;

	#internals = this.attachInternals();
	#activationType;

	constructor() {
		super();
		this.addEventListener("keydown", this);
	}

	connectedCallback() {
		this.addContextListener("associations", this.#handleAssociationsChange.bind(this), true);
		this.addContextListener("selected", this.#handleSelectedChange.bind(this), true);
		this.addContextListener("selectfollowsfocus", this.#handleSelectFollowsFocusChange.bind(this), true);
	}

	handleEvent(event) {
		// TODO: clean up
		if (
			event.type === "keydown" && !event.metaKey
			&& (
				(event.key === "Enter") ||
				(event.key === " " && !event.altKey && !event.ctrlKey)
			)
		) {
			event.preventDefault();
			this.click();
			return;
		}
		if (event.type !== this.#activationType) return;
		this.dispatchEvent(new TabSelectedEvent);
	}

	#handleSelectFollowsFocusChange(selectFollowsFocus) {
		this.#activationType = selectFollowsFocus ? "focus" : "click";
		this.addEventListener(selectFollowsFocus ? "focus" : "click", this);
		this.removeEventListener(selectFollowsFocus ? "click" : "focus", this);
	}

	#handleSelectedChange(selectedTab) {
		const isSelected = this === selectedTab;
		this.tabIndex = isSelected ? 0 : -1;
		this.#internals.ariaSelected = isSelected ? "true" : "false";
		this.#internals.states[isSelected ? "add" : "delete"]("selected");
	}

	#handleAssociationsChange({ getPanelsByTab }) {
		const panel = getPanelsByTab(this);
		if (panel) this.#internals.ariaControlsElements = [panel];
	}
}

export class TabSelectedEvent extends Event {
	constructor() { super("tab-selected", { bubbles: true }); }
}

