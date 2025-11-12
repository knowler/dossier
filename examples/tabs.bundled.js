(() => {
  // src/base-element.js
  var BaseElement = class extends HTMLElement {
    static shadowRootOptions = { mode: "open" };
    #internals = super.attachInternals();
    attachInternals() {
      return this.#internals;
    }
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
  };
  function html() {
    const template = document.createElement("template");
    template.innerHTML = String.raw(...arguments);
    return template.content;
  }

  // src/context-protocol.js
  var DEBUG_CONTEXT = false;
  var ContextRequestEvent = class extends Event {
    #context;
    get context() {
      return this.#context;
    }
    #callback;
    get callback() {
      return this.#callback;
    }
    #subscribe;
    get subscribe() {
      return this.#subscribe;
    }
    constructor(context, callback, subscribe = false) {
      super("context-request", { bubbles: true, composed: true });
      this.#context = context;
      this.#callback = callback;
      this.#subscribe = subscribe;
    }
  };
  var ContextConsumer = (target) => class ContextConsumer extends target {
    addContextListener(context, callback, subscribe) {
      if (DEBUG_CONTEXT) console.info("get context", { consumer: this, context, subscribe, callback });
      this.dispatchEvent(new ContextRequestEvent(context, callback, subscribe));
    }
  };
  var ContextProvider = (target) => class ContextProvider extends target {
    #contexts = /* @__PURE__ */ new Map();
    #subscriptionsByContext = /* @__PURE__ */ new Map();
    #invoke(callback, value, callbacks) {
      try {
        if (DEBUG_CONTEXT) console.info("invoking callback", { provider: this, value, callback, callbacks });
        if (callbacks) callback(value, () => {
          callbacks.delete(callback);
        });
        else callback(value);
      } catch (error) {
        console.error(error);
      }
    }
    constructor() {
      super();
      this.addEventListener("context-request", this);
    }
    handleEvent(event) {
      super.handleEvent?.(event);
      if (event.type !== "context-request") return;
      if (!this.#contexts.has(event.context)) {
        if (DEBUG_CONTEXT) console.info("skip context (missing)", { context: event.context, provider: this, consumer: event.target });
        return;
      }
      event.stopImmediatePropagation();
      const value = this.#contexts.get(event.context);
      if (event.subscribe) {
        const callbacks = this.#subscriptionsByContext.get(event.context);
        callbacks.add(event.callback);
        this.#invoke(event.callback, value, callbacks);
      } else this.#invoke(event.callback, value);
    }
    setContextValue(context, value) {
      if (DEBUG_CONTEXT) console.info("set context", { provider: this, context, value });
      let callbacks = this.#subscriptionsByContext.get(context);
      if (!this.#contexts.has(context)) {
        callbacks = /* @__PURE__ */ new Set();
        this.#subscriptionsByContext.set(context, callbacks);
      }
      this.#contexts.set(context, value);
      for (const callback of callbacks) this.#invoke(callback, value, callbacks);
    }
  };

  // src/roving-tabindex-mixin.js
  var RovingTabIndex = (target) => class RovingTabIndex extends target {
    constructor() {
      super();
      this.addEventListener("keydown", this);
    }
    handleEvent(event) {
      if (event.type !== "keydown") return;
      const keys = this.constructor.keysByOrientation[this.orientation];
      if (!Object.values(keys).includes(event.key)) return;
      event.preventDefault();
      const focusables = (this.querySelector(":scope > slot") ?? this.shadowRoot.querySelector("slot"))?.assignedElements();
      if (focusables.length === 0) return;
      let currentElement = event.target;
      let currentIndex = focusables.findIndex((el) => el === currentElement);
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
  };
  function mod(n, m) {
    return (n % m + m) % m;
  }

  // src/tablist-element.js
  var TabListElement = class extends ContextConsumer(RovingTabIndex(BaseElement)) {
    static role = "tablist";
    static content = html`<slot>`;
    static keysByOrientation = {
      horizontal: {
        next: "ArrowRight",
        previous: "ArrowLeft",
        start: "Home",
        end: "End"
      },
      vertical: {
        next: "ArrowDown",
        previous: "ArrowUp",
        start: "Home",
        end: "End"
      }
    };
    #internals = this.attachInternals();
    get orientation() {
      return this.#internals.ariaOrientation;
    }
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
  };

  // src/tab-element.js
  var TabElement = class extends ContextConsumer(BaseElement) {
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
      if (event.type === "keydown" && !event.metaKey && (event.key === "Enter" || event.key === " " && !event.altKey && !event.ctrlKey)) {
        event.preventDefault();
        this.click();
        return;
      }
      if (event.type !== this.#activationType) return;
      this.dispatchEvent(new TabSelectedEvent());
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
  };
  var TabSelectedEvent = class extends Event {
    constructor() {
      super("tab-selected", { bubbles: true });
    }
  };

  // src/tabpanel-element.js
  var TabPanelElement = class extends ContextConsumer(BaseElement) {
    static role = "tabpanel";
    static content = html`<slot>`;
    #internals = this.attachInternals();
    #tab;
    #searchable = false;
    constructor() {
      super();
      this.addEventListener("beforematch", this);
    }
    handleEvent(event) {
      if (event.type === "beforematch")
        this.dispatchEvent(new TabPanelFoundEvent());
      else if (event.type === "hashchange") {
        const target = document.querySelector(":target");
        if (!this.contains(target)) return;
        this.dispatchEvent(new TabPanelFoundEvent());
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
      if (selected) this.tabIndex = 0;
      else this.removeAttribute("tabindex");
    }
  };
  var TabPanelFoundEvent = class extends Event {
    constructor() {
      super("tabpanel-found", { bubbles: true });
    }
  };

  // src/tabs-element.js
  function createTabsShadow(tags = { tabList: "tablist-" }) {
    return html`
		<slot name=tablist><${tags.tabList} part=tablist><slot name=tablist-content></slot></${tags.tabList}></slot>
		<slot name=tabpanels></slot>
	`;
  }
  var TabsElement = class extends ContextProvider(BaseElement) {
    static shadowRootOptions = { ...BaseElement.shadowRootOptions, slotAssignment: "manual" };
    static define(tagName, registry = customElements) {
      try {
        this.content = createTabsShadow({ tabList: registry.getName(TabListElement) });
        return super.define(tagName, registry);
      } catch (error) {
        console.error("Must define the TabListElement before TabsElement");
      }
    }
    static get observedAttributes() {
      return ["orientation", "selectfollowsfocus", "labelledby", "searchable"];
    }
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
    get orientation() {
      return this.getAttribute("orientation") === "vertical" ? "vertical" : "horizontal";
    }
    set orientation(orientation) {
      if (orientation !== "horizontal" || orientation !== "vertical") return;
      this.setAttribute("orientation", orientation);
    }
    get selectFollowsFocus() {
      return this.hasAttribute("selectfollowsfocus");
    }
    set selectFollowsFocus(flag) {
      this.toggleAttribute("selectfollowsfocus", !!flag);
    }
    // TODO: !! necessary?
    get searchable() {
      return this.hasAttribute("searchable");
    }
    set searchable(flag) {
      this.toggleAttribute("searchable", !!flag);
    }
    // TODO: !! necessary?
    get #tabListSlot() {
      return this.shadowRoot.querySelector("slot[name=tablist]");
    }
    get #tabListContentSlot() {
      return this.shadowRoot.querySelector("slot[name=tablist-content]");
    }
    get #tabPanelsSlot() {
      return this.shadowRoot.querySelector("slot[name=tabpanels]");
    }
    constructor() {
      super();
      this.setContextValue("associations", { getTabsByPanel: () => void 0, getPanelsByTab: () => void 0 });
      this.setContextValue("labelledby", []);
      this.setContextValue("selected", null);
      this.setContextValue("orientation", this.orientation);
      this.setContextValue("selectfollowsfocus", this.selectFollowsFocus);
      this.setContextValue("searchable", this.searchable);
      const so = new MutationObserver((entries) => {
        const slottables = entries.flatMap(
          (entry) => Array.from(entry.addedNodes).filter((node) => node instanceof BaseElement)
        );
        if (slottables.length === 0) return;
        const tabList = Array.from(this.childNodes).find((node) => node instanceof TabListElement);
        const slottableTabs = Array.from(this.childNodes).filter((node) => node instanceof TabElement);
        const tabPanels = Array.from(this.childNodes).filter((node) => node instanceof TabPanelElement);
        if (!(tabList && tabPanels.length > 0 || !tabList && slottableTabs.length > 0 && tabPanels.length > 0)) return;
        if (!tabList) this.#tabListContentSlot.assign(...slottableTabs);
        else this.#tabListSlot.assign(tabList);
        this.#tabPanelsSlot.assign(...tabPanels);
        this.setContextValue("associations", createAssociations(this));
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
          (idRef) => root.getElementById(idRef) ?? []
        ));
      }
    }
  };
  function createAssociations(tabsElement) {
    const tabs = Array.from(tabsElement.querySelectorAll(":scope > tablist- > tab-, :scope > tab-"));
    const panels = Array.from(tabsElement.querySelectorAll(":scope > tabpanel-"));
    const panelsByTab = /* @__PURE__ */ new Map();
    const tabsByPanel = /* @__PURE__ */ new Map();
    for (const [index, tab] of tabs.entries()) {
      const panel = panels.at(index);
      panelsByTab.set(tab, panel);
      tabsByPanel.set(panel, tab);
    }
    return { getPanelsByTab: (tab) => panelsByTab.get(tab), getTabsByPanel: (panel) => tabsByPanel.get(panel) };
  }

  // examples/tabs.js
  TabListElement.define("tablist-");
  TabElement.define("tab-");
  TabPanelElement.define("tabpanel-");
  TabsElement.define("tabs-");
})();
