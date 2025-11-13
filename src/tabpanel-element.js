import { BaseElement, html } from "./base-element.js";
import { ContextConsumer } from "./context-protocol.js";

/**
 * Tab panel element
 */
export class TabPanelElement extends ContextConsumer(BaseElement) {
	static role = "tabpanel";
	static content = html`<slot>`;

	#internals = this.attachInternals();
	#tab;
	#searchable = false;

	constructor() {
		super();
		this.addEventListener("beforematch", this);
		this.addEventListener("focus", this);
	}

	handleEvent(event) {
		if (event.type === "beforematch" || (event.type === "focus" && this.hidden))
			this.dispatchEvent(new TabPanelFoundEvent);
		else if (event.type === "hashchange") {
			const target = document.querySelector(":target");
			if (!this.contains(target)) return;
			this.dispatchEvent(new TabPanelFoundEvent);
			target.focus();
		}
	}

	connectedCallback() {
		this.addContextListener("associations", this.#handleAssociationsChange.bind(this), true);
		this.addContextListener("selected", this.#handleSelectedChange.bind(this), true);
		this.addContextListener("searchable", this.#handleSearchableChange.bind(this), true);
		window.addEventListener("hashchange", this);
	}

	disconnectedCallback() {
		window.removeEventListener("hashchange", this);
	}

	#handleSearchableChange(searchable) {
		console.log({ searchable });
		this.#searchable = searchable;
		this.#toggleSelected(!!this.hidden);
	}

	#handleAssociationsChange({ getTabsByPanel }) {
		this.#tab = getTabsByPanel(this);
		if (this.#tab) this.#internals.ariaLabelledByElements = [this.#tab];
	}

	#handleSelectedChange(selectedTab) {
		this.#toggleSelected(this.#tab === selectedTab);
	}

	#toggleSelected(selected) {
		this.hidden = selected ? false : this.#searchable ? "until-found" : true;
		this.#internals.ariaHidden = selected ? "false" : "true";
		this.#internals.states[selected ? "add" : "delete"]("selected");
		this.tabIndex = selected ? 0 : -1;
	}
}

export class TabPanelFoundEvent extends Event {
	constructor() { super("tabpanel-found", { bubbles: true }); }
}

