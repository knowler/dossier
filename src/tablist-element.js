import { BaseElement, html } from "./base-element.js"
import { RovingTabIndex } from "./roving-tabindex-mixin.js";
import { ContextConsumer } from "./context-protocol.js";

// TODO: handle when focus leaves, it should go back to the selected item.
/**
 * Tab list element
 */
export class TabListElement extends ContextConsumer(RovingTabIndex(BaseElement)) {
	static role = "tablist";
	static content = html`<slot>`;

	static keysByOrientation = {
		horizontal: {
			next: "ArrowRight",
			previous: "ArrowLeft",
			start: "Home",
			end: "End",
		},
		vertical: {
			next: "ArrowDown",
			previous: "ArrowUp",
			start: "Home",
			end: "End",
		},
	};

	#internals = this.attachInternals();

	get orientation() { return this.#internals.ariaOrientation; }

	connectedCallback() {
		this.addContextListener("orientation", this.#handleOrientationChange.bind(this), true);
		this.addContextListener("labelledby", this.#handleLabelledByChange.bind(this), true);
	}

	#handleOrientationChange(orientation) {
		this.#internals.ariaOrientation = orientation;
		this.#internals.states.add(orientation === "horizontal" ? "horizontal" : "vertical");
		this.#internals.states.delete(orientation === "horizontal" ? "vertical" : "horizontal");
	}

	#handleLabelledByChange(elements) {
		console.log(elements);
		this.#internals.ariaLabelledByElements = elements;
	}
}
