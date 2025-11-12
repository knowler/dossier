export const RovingTabIndex = target => class RovingTabIndex extends target {
	constructor() {
		super();
		this.addEventListener("keydown", this);
	}

	handleEvent(event) {
		if (event.type !== "keydown") return;

		const keys = this.constructor.keysByOrientation[this.orientation];

		if (!Object.values(keys).includes(event.key)) return;

		event.preventDefault();

		// TODO: make this more abstracted post-copying out of the TabListElement
		const focusables = (this.querySelector(":scope > slot") ?? this.shadowRoot.querySelector("slot"))?.assignedElements();

		if (focusables.length === 0) return;

		let currentElement = event.target;
		let currentIndex = focusables.findIndex(el => el === currentElement);

		switch (event.key) {
			case keys.next:
				currentIndex = mod(currentIndex + 1, focusables.length);
				break;
			case keys.previous:
				currentIndex = mod(currentIndex - 1, focusables.length);
				break;
			case keys.start:
				currentIndex = 0;
				break;
			case keys.end:
				currentIndex = focusables.length - 1;
				break;
		}

		currentElement.tabIndex = -1;
		currentElement = focusables.at(currentIndex);
		currentElement.tabIndex = 0;
		currentElement.focus();
	}
}

/* taken from: https://nik.digital/posts/tab-roving */
function mod(n, m) {
	return ((n % m) + m) % m;
}
