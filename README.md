# Dossier: a set of tabbed interface elements

> [!IMPORTANT]  
> This is very much a work in progress. Feature might be unimplemented, broken,
> or buggy. Documentation is likely outdated, too.

A tabs custom element.

- Provides semantic HTML elements (with implicit ARIA semantics).
- Easy to style.
- Does not provide any styles (no accessibility promises there).
- Configurable selection type, orientation, and searchability.

## TODO

- [ ] Allow for custom naming of elements.

## Usage

```html
TabsElement.define("my-tabs");
TabElement.define("my-tab");
TabListElement.define("my-tablist");
TabPanelElement.define("my-tabpanel");
```

```html
<tabs->

	<tab->The Callous Daoboys</tab->
	<tabpanel->Die on Mars</tabpanel->

	<tab->The Dillinger Escape Plan</tab->
	<tabpanel->Calculating Infinity</tabpanel->

	<tab->Exotic Animal Petting Zoo</tab->
	<tabpanel->Tree of Tongues</tabpanel->

</tabs->
```

```html
<tabs->

	<tablist->
		<tab->The Callous Daoboys</tab->
		<tab->The Dillinger Escape Plan</tab->
		<tab->Exotic Animal Petting Zoo</tab->
	</tablist->

	<tabpanel->Die on Mars</tabpanel->
	<tabpanel->Calculating Infinity</tabpanel->
	<tabpanel->Tree of Tongues</tabpanel->

</tabs->
```

```html
<tabs- orientation=vertical>
	<!-- … -->
</tabs->
```

```html
<tabs- selectfollowsfocus>
	<!-- … -->
</tabs->
```

## Styling

If you use an explicit tab list element, then all of the elements are shallow. If you don’t then, it can be styled using a shadow part called `tablist`.

Both tabs and panels have a `selected` state.

The tablist has an orientation state which will either be `horizontal` or `vertical`.

## Goals

- Accessible HTML.
- Minimal scaffolding for developers.
- Easy to style.
- Minimal DOM manipulation. This leverages ARIA roles and properties set with `ElementInternals` and CSS custom states wherever possible. The only exception for this goal is making the tabs and tab panels focusable. That’s not possible to do without tabindex.

## Non-goals

- Making it work without JavaScript.
	- I totally would if I could, but it’s not possible to correctly implement the
		tabs UI pattern in an accessible way without using JavaScript
	- If you think you’ve done it, then you’ve probably knowingly or unknowingly
		made compromises with regard to accessibility.

## Future

### API

- Allow explicit tab to panel association using a `for` attribute.
- Allow for searching leveraging `hidden=until-found`.
	- This would mean that we have to assign all of the panels to the tab panel slot, as well as, manage its `tabindex`.
	- This also would mean that we have another attribute that is sprouted.

### Platform improvements

- Ideally, I’d like to get rid of the sprouted `tabindex` for focusables. At this time this is a limitation of the web platform. I’m hoping that the `ElementInternals.type` proposal will allow us to do this.
- The roving tabindex might be replaced by a `focusgroup` attribute. Hopefully, that’s something which is added to `ElementInternals` right away, so we don’t need to sprout anything.
