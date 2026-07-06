# CyberBells Improvements & Bug Fixes

## Bugs
1. **Dead "Get In Touch" form:** (`index.astro` line ~602, `.contact-form`) — this form has no id, and there's no matching JS handler anywhere in `main.js`. Clicking "Send Message" triggers a native form submission with no action, which just reloads the page and silently discards the user's input.
2. **`.form-group` class defined twice:** (`global.css` lines 1761 and 2443). The rules aren't scoped. Editing one form's spacing/layout will silently affect the other. Worth renaming one (e.g. `.contact-form .form-group`) to decouple them.
3. **Relative `og:image` / `twitter:image` URLs:** (`index.astro` lines 23, 30): `/assets/Logo/CyberLogo.png`. Should be absolute (`https://cyberbells.com/assets/Logo/CyberLogo.png`) to fix broken link previews on social platforms.
4. **Hardcoded month in Calendly URL:** both booking buttons use `...?month=2026-07`. Either drop the param (Calendly defaults to "today") or generate it dynamically.
5. **Static Environment Checks:** `isDesktop`, `deviceTier`, `hasNativeMomentum`, `prefersReducedMotion` are computed once at load and never re-evaluated on resize/rotate.
6. **Null-guard missing:** `closeQuoteBtn.addEventListener` isn't null-guarded inside the `if (openQuoteModalBtn && quoteModal)` block. Safer as `closeQuoteBtn?.addEventListener(...)`.
7. **Dead code:** `main.js` line 941 looks for `.marketplace svg` and calls `.pauseAnimations()`/`.unpauseAnimations()` — but Section 5 in `index.astro` only contains a canvas. Same section also calls `geometry.setAttribute('position', ...)` twice.
8. **`lowPowerMode = false` is hardcoded:** can never be true, meaning that whole code path is unreachable. Either wire it to something real or remove it.

## Improvements worth considering
1. **Accessibility:** no `aria-*` attributes anywhere, no `aria-expanded`/`aria-controls` on the hamburger button. All nav links are `href="#"` placeholders, no visible-focus handling. The quote modal isn't focus-trapped, doesn't return focus, and isn't dismissible via `Esc`.
2. **No favicon:** missing `<link rel="icon">` in `<head>`.
3. **Missing `og:image:width/height` and `og:site_name`:** small SEO/social nicety.
4. **EmailJS Security:** EmailJS keys are in client JS. Double-check that domain restriction is set in the EmailJS dashboard to prevent spam abuse.
5. **Redundant EmailJS payload:** `Name`, `name`, and `firstName` are all sent as the same value.
6. **Autoplaying carousels:** Gateway carousel doesn't respect `prefers-reduced-motion`.
7. **Alt text is generic:** (`alt="Card 1"` … `alt="Card 7"`) — descriptive alt text (e.g., app names) would help SEO/accessibility.
