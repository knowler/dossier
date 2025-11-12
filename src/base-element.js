export class BaseElement extends HTMLElement {
	static shadowRootOptions = { mode: "open" };

	#internals = super.attachInternals();

	attachInternals() { return this.#internals; }

	constructor() {
		super();
		if (this.constructor.role)
			this.#internals.role = this.constructor.role;
		this.attachShadow(this.constructor.shadowRootOptions);
		if (this.constructor.content)
			this.shadowRoot.append(
				this.ownerDocument.importNode(this.constructor.content, true)
			);
		if (this.constructor.styles)
			this.shadowRoot.adoptedStyleSheets = [this.constructor.styles];
	}

	static define(tagName, registry = window.customElements) {
		if (!registry.get(tagName)) {
			registry.define(tagName, this);
			window[this.constructor.name] = this;
		}

		return registry.whenDefined(tagName);
	}
}

export function html() {
	const template = document.createElement("template");
	template.innerHTML = String.raw(...arguments);
	return template.content;
}

export function css() {
	const sheet = new CSSStyleSheet();
	sheet.replaceSync(String.raw(...arguments));
	return sheet;
}
