/* Lots of inspiration from jsxtools/context-protocol */

const DEBUG_CONTEXT = false;

export class ContextRequestEvent extends Event {
	#context;
	get context() { return this.#context; }
	#callback;
	get callback() { return this.#callback; }
	#subscribe;
	get subscribe() { return this.#subscribe; }
	constructor(context, callback, subscribe = false) {
		super("context-request", { bubbles: true, composed: true });
		this.#context = context;
		this.#callback = callback;
		this.#subscribe = subscribe;
	}
}

export const ContextConsumer = target => class ContextConsumer extends target {
	addContextListener(context, callback, subscribe) {
		if (DEBUG_CONTEXT) console.info("get context", { consumer: this, context, subscribe, callback })
		this.dispatchEvent(new ContextRequestEvent(context, callback, subscribe));
	}
}

export const ContextProvider = target => class ContextProvider extends target {
	#contexts = new Map();
	#subscriptionsByContext = new Map();
	#invoke(callback, value, callbacks) {
		try {
			if (DEBUG_CONTEXT) console.info("invoking callback", { provider: this, value, callback, callbacks })
			if (callbacks) callback(value, () => { callbacks.delete(callback); });
			else callback(value);
		} catch(error) { console.error(error); }
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
			callbacks = new Set();
			this.#subscriptionsByContext.set(context, callbacks);
		}
		this.#contexts.set(context, value);
		for (const callback of callbacks) this.#invoke(callback, value, callbacks);
	}
}

