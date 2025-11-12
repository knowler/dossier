import { BaseElement, html } from "./base-element.js";
import { ContextProvider } from "./context-protocol.js";

import { TabListElement } from "./tablist-element.js";
import { TabElement } from "./tab-element.js";
import { TabPanelElement } from "./tabpanel-element.js";

function createTabsShadow(tags = { tabList: "tablist-" }) {
	return html`
		<slot name=tablist><${tags.tabList} part=tablist><slot name=tablist-content></slot></${tags.tabList}></slot>
		<slot name=tabpanels></slot>
	`;
}

export class TabsElement extends ContextProvider(BaseElement) {
	static shadowRootOptions = { ...BaseElement.shadowRootOptions, slotAssignment: "manual" };

	static define(tagName, registry = customElements) {
		try {
			this.content = createTabsShadow({ tabList: registry.getName(TabListElement) });

			return super.define(tagName, registry);
		} catch (error) {
			console.error("Must define the TabListElement before TabsElement");
		}
	}

	static get observedAttributes() { return ["orientation", "selectfollowsfocus", "labelledby", "searchable"]; }
	attributeChangedCallback(name, _oldValue, newValue) {
		if (name === "orientation")
			this.setContextValue("orientation", this.orientation);
		else if (name === "selectfollowsfocus")
			this.setContextValue("selectfollowsfocus", this.selectFollowsFocus);
		else if (name === "searchable") {
			this.setContextValue("searchable", this.searchable);
			this.setContextValue("selected", this.querySelector(":scope tab-:state(selected)"));
		} else if (name === "labelledby" && this.isConnected) {
			this.#setLabelledByContextFromAttribute();
			this.setContextValue("selectfollowsfocus", this.selectFollowsFocus);
		}
	}

	// What do we retrieve?
	get labelledByElements() {
		return [];
	}

	// TODO: do we need to do some filtering?
	set labelledByElements(elements) {
		this.setContextValue("labelledby", elements);
		this.setAttribute("labelledby", "");
	}

	get orientation() { return this.getAttribute("orientation") === "vertical" ? "vertical" : "horizontal"; }
	set orientation(orientation) {
		if (orientation !== "horizontal" || orientation !== "vertical") return;
		this.setAttribute("orientation", orientation);
	}

	get selectFollowsFocus() { return this.hasAttribute("selectfollowsfocus"); }
	set selectFollowsFocus(flag) { this.toggleAttribute("selectfollowsfocus", !!flag); } // TODO: !! necessary?

	get searchable() { return this.hasAttribute("searchable"); }
	set searchable(flag) { this.toggleAttribute("searchable", !!flag); } // TODO: !! necessary?

	get #tabListSlot() { return this.shadowRoot.querySelector("slot[name=tablist]"); }
	get #tabListContentSlot() { return this.shadowRoot.querySelector("slot[name=tablist-content]"); }
	get #tabPanelsSlot() { return this.shadowRoot.querySelector("slot[name=tabpanels]"); }

	constructor() {
		super();
		// Set up context early to avoid missing elements.
		// TODO: maybe we can make this a part of the mixin?
		// Some of this context needs to be grouped since it’s dependant on each
		// other. For example, associations and selected.
		this.setContextValue("associations", { getTabsByPanel: () => undefined, getPanelsByTab: () => undefined });
		this.setContextValue("labelledby", []);
		this.setContextValue("selected", null);
		this.setContextValue("orientation", this.orientation);
		this.setContextValue("selectfollowsfocus", this.selectFollowsFocus);
		this.setContextValue("searchable", this.searchable);

		// TODO: handle elements added before the element definition.
		const so = new MutationObserver(entries => {

			// Is the mutation relevant?
			const slottables = entries.flatMap(
				entry => Array.from(entry.addedNodes).filter(node => node instanceof BaseElement),
			);
			if (slottables.length === 0) return;

			// If so, we need to set up the slots again (TODO: probably can make this
			// more efficient by checking what’s been affected).

			const tabList = Array.from(this.childNodes).find(node => node instanceof TabListElement);
			const slottableTabs = Array.from(this.childNodes).filter(node => node instanceof TabElement);
			const tabPanels = Array.from(this.childNodes).filter(node => node instanceof TabPanelElement);

			// TODO: refactor this
			if (!
				((tabList && tabPanels.length > 0) || (!tabList && slottableTabs.length > 0 && tabPanels.length > 0))
			) return;

			if (!tabList) this.#tabListContentSlot.assign(...slottableTabs);
			else this.#tabListSlot.assign(tabList);
			this.#tabPanelsSlot.assign(...tabPanels);
			this.setContextValue("associations", createAssociations(this))

			// TODO: allow a tab to be initially selected
			const selectedTab = tabList ? tabList.querySelector("tab-") : this.#tabListContentSlot.assignedElements().at(0);

			this.setContextValue("selected", selectedTab);
		});
		so.observe(this, { childList: true });

		this.addEventListener("tab-selected", this);
		this.addEventListener("tabpanel-found", this);
	}

	handleEvent(event) {
		super.handleEvent(event);
		if (event.type === "tab-selected" && event.target instanceof TabElement) {
			this.setContextValue("selected", event.target);
			const panel = createAssociations(this).getPanelsByTab(event.target);
		}
		if (event.type === "tabpanel-found" && event.target instanceof TabPanelElement) {
			const tab = createAssociations(this).getTabsByPanel(event.target);
			this.setContextValue("selected", tab);
		}
	}

	connectedCallback() {
		if (this.hasAttribute("labelledby"))
			this.#setLabelledByContextFromAttribute();
	}

	#setLabelledByContextFromAttribute() {
		const root = this.getRootNode();
		const idRefs = this.getAttribute("labelledby").split(" ");
		if (idRefs.length > 0) {
			this.setContextValue("labelledby", idRefs.flatMap(
				idRef => root.getElementById(idRef) ?? []
			));
		}
	}
}

// TODO: how do we disallow mixing `<tablist->` and top-level `<tab-`. What takes prescendence?
	// If a `tablist-` is present, ignore top-level `<tab->`.
// TODO: allow for explicit association
// TODO: ideally this should be a part of the element and cached.
function createAssociations(tabsElement) {
	const tabs = Array.from(tabsElement.querySelectorAll(":scope > tablist- > tab-, :scope > tab-"));
	const panels = Array.from(tabsElement.querySelectorAll(":scope > tabpanel-"));

	const panelsByTab = new Map();
	const tabsByPanel = new Map();

	for (const [index, tab] of tabs.entries()) {
		const panel = panels.at(index);
		panelsByTab.set(tab, panel);
		tabsByPanel.set(panel, tab);
	}

	return { getPanelsByTab: tab => panelsByTab.get(tab), getTabsByPanel: panel => tabsByPanel.get(panel) };
}
