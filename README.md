# Legacy TileWorks & Design — Production Website Prototype

This site translates the approved luxury black-marble and gold concept into a functional, responsive multi-page website.

## Production domain — October 12, 2026

The current canonical domain is `https://tselegacytileworks.com/`. All public page canonicals, Open Graph URLs/images, structured-data IDs/URLs, sitemap entries, robots sitemap references, and generated legacy redirect canonicals use this domain. Relative navigation and asset links continue to work on the GitHub preview and at the production domain root. This supersedes older domain notes in the historical audit below.

Build with `python scripts/build-site.py` and upload the **contents** of `_site` into the production domain's `public_html`, including `.user.ini` and `send-estimate.php`. Do not upload the repository or place an extra `_site` directory inside `public_html`. Actual Hostinger email delivery remains to be verified after upload.

## Included
- Home page matching the approved concept
- Full-width transparent logo with safe padding so no elements are clipped
- Services overview
- Custom shower, flooring, backsplash, and natural-stone pages
- Filterable project gallery
- Reviews page
- About page
- Contact and estimate-request page
- Responsive mobile navigation
- Expandable FAQs
- Required-field validation and server-side estimate submission for Hostinger
- Page-specific metadata
- Accessible skip link and semantic structure

## Run locally
Build the clean-URL site, then serve the generated directory:

```bash
python scripts/build-site.py
python -m http.server 8000 --directory _site
```

Then visit `http://localhost:8000`.

## Before launch
1. Deploy the Hostinger form handler and verify delivery to `Cameron@tselegacytileworks.com` using the instructions below.
2. Replace demonstration project imagery with Cameron’s real project photographs.
3. Verify his experience, credentials, service area, warranty, operating scope, and lead time.
4. Replace placeholder testimonials with verified reviews.
5. Confirm whether he handles demolition, plumbing coordination, glass, materials, disposal, and full remodel scopes.
6. Add production hosting, analytics, and a privacy policy; monitor form spam and mail delivery.

## Hostinger contact form (current setup)

This section supersedes the historical audit notes below that say form work is deferred or the mailto handler is unchanged.

The estimate form now POSTs to `send-estimate.php`, which uses the hosting server's PHP mail transport to address requests to **Cameron@tselegacytileworks.com**. The visitor stays on the page and receives confirmation only when the server accepts the email for sending. No email application opens. Cameron can reply directly to the visitor through the message's Reply-To header. Requests include all eight visible form fields; up to five JPG, PNG, WebP or PDF files can be attached (5 MiB per file, 10 MiB combined). Larger files can be shared as links in Project Details.

### Deploy on Hostinger

1. Use a PHP-enabled Hostinger web/cloud hosting site (PHP 8.x). This is a custom HTML/PHP site, not a Hostinger Website Builder form. There is no assumed universal Hostinger form URL or automatic HTML form forwarding.
2. Run `python scripts/build-site.py`. Upload the **contents** of `_site` into the site's `public_html` directory, including `send-estimate.php` and the hidden `.user.ini` at the root beside the homepage. The generated `/contact/` page submits to `../send-estimate.php`; root source `contact.html` works with the adjacent handler too.
3. Confirm the Cameron mailbox can receive email and the site's domain/email DNS is configured in Hostinger. The handler uses that same address as its From address; the visitor is only the Reply-To address. No password or secret is stored in the public files.
4. Submit a real estimate on the HTTPS Hostinger site and confirm it arrives in Cameron's inbox (also check spam). Reply to verify the visitor's address. A mail transport acceptance is not proof of inbox delivery.
5. If sending fails or delivery is unreliable, inspect Hostinger's mail logs and configure authenticated SMTP with server-only credentials. [Hostinger documents PHP mail limits and recommends SMTP for better delivery](https://www.hostinger.com/support/11393648-php-mail-limitation-explained-how-to-improve-email-delivery-with-smtp/). This version uses PHP mail, not authenticated SMTP.

GitHub Pages and Python's static preview server cannot execute PHP. They remain useful for previewing the site; submitting there displays an error and retains the form values. No live Hostinger account configuration or deployment has been performed.

The handler validates required fields, email addresses, option values, and payload size. It fixes the recipient server-side, rejects cross-site browser POSTs, adds a hidden spam trap, and allows five attempts per IP per 15 minutes using locked files in PHP's temporary directory. Failed transport attempts count toward the limit. These are basic abuse controls, not a CAPTCHA. JavaScript prevents double clicks, keeps entries after errors, and announces status accessibly. Without JavaScript, the server returns a confirmation/error page.

### Verification

`node tests/contact-form.cjs` exercises validation, POST submission, duplicate prevention, success, and error recovery using a mocked transport; it sends no email. `python tests/verify-static.py` checks the generated handler and rebased action along with existing site safeguards. Both passed locally. Live Hostinger email delivery still requires verification after deployment. The previous form pixel-baseline test is opt-in with `CHECK_LEGACY_FORM_BASELINE=1` because the form intentionally changed.


## Portfolio revision

This edition replaces demonstration imagery with Cameron's actual work and adds:

- A real project-driven homepage showcase
- A masonry portfolio gallery
- Working category filters
- Click-to-expand lightbox images
- Real project imagery on service pages
- Favicon assets and favicon markup
- Web-optimized versions of the uploaded project photography

Project names and descriptions are editorial placeholders based on the visible work. Confirm terminology, dates, locations, materials, and project ownership before public launch.


## Business-detail revision

Updated with confirmed operating details:

- Custom design is available as a standalone design service or as full design through installation.
- Legacy TileWorks handles tile-related bathroom work, including waterproofing, wall replacement where required, niches, custom seats, curbs, and dams, but not plumbing or other non-tile trades.
- Clients purchase their own tile because Legacy TileWorks does not stock materials.
- Estimates begin with an on-site measurement and specification review, followed by a written digital estimate within two business days.
- Specific service pages now explain the actual client process instead of using technical placeholder categories.

## October 12, 2026 audit remediation

The site remains plain HTML, CSS, and JavaScript. No framework, theme, contact service, analytics, or business promises were introduced. The estimate form is intentionally unchanged.

### A. Completed fixes and affected files

- `css/styles.css`, `index.html`: constrained hero grid tracks, responsive heading sizing, safe wrapping at enlarged text sizes, shorter vertical spacing, and an image positioned inside its existing angled container. Both actions fit at 1280 × 720. Homepage services and principles reflow with enlarged text.
- `js/main.js`, all page headers: mobile links close the menu and reset `aria-expanded`; Escape returns focus to the toggle. Same-page estimate links retain normal anchor navigation, move focus to the destination section, and clear the sticky header. Navigation collapses before desktop links become crowded.
- `projects.html`, `js/main.js`: labelled modal, focus on close, Tab/Shift+Tab containment, inert background, Escape/backdrop/close-button dismissal, scroll restoration, and focus restoration to the initiating photograph. All 58 photographs and existing filters remain. There were no existing next/previous controls to replace.
- `projects.html`: synchronized `aria-pressed` filter states, a single descriptive accessible name per gallery trigger, Reviews links restored, and stray head text removed. Existing local gallery comments were retained; the original local edits are recoverable in commit `d50eee5`.
- `index.html`, `services.html`, all page footers: corrected heading levels with presentation classes; descriptive service links; homepage highlights link to matching gallery categories.
- `about.html`: centered the single-column biography and corrected “Warrenty” to “Warranty,” without changing warranty terms.
- Service metadata: corrected awkward descriptions; corrected the Services backsplash summary and homepage hero alternative text.

### B. Visual and responsive improvements

Black, gold, cream, existing fonts, photography, decorative borders, and the angled hero remain. The header logo uses a lossless derivative cropped only to remove transparent padding. Originals remain intact. Gold-section CTAs now have dark solid backgrounds and cream text; identical low-contrast CTA styling elsewhere was corrected with the same scoped selector. Form buttons are excluded.

### C. Accessibility verification

Keyboard checks cover mobile navigation, same-page anchors, filters, the lightbox, and FAQs. Visible focus rules exclude every form button and field. Modal behavior follows the [WAI-ARIA dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). CTA text contrast is 16.21:1 default/focus, 13.23:1 hover, and 16.98:1 active. Reduced-motion scrolling and transitions were checked.

The form HTML and submit-handler block match the preserved baseline. All pre-existing CSS remains unchanged, with targeted overrides appended. Browser comparisons of every computed property and element size inside the form match at 320, 768, and 1280 pixels. No form submission or validation interaction was performed.

### D. SEO, image optimization, and deployment

All 11 pages have unique titles/descriptions, absolute canonicals, Open Graph metadata, social images, and JSON-LD. The home canonical uses the trailing-slash URL for both `/` and `/index.html`. The provided live GitHub Pages URL returned HTTP 200; no final business domain was inferred.

Schema uses the visible business name and existing content: LocalBusiness on Home, WebPage and BreadcrumbList on inner pages, and Service on service-detail pages. No addresses, hours, ratings, licenses, warranty terms, phone claims, or service areas were invented in schema. This is syntax-checked markup, not a claim of Google rich-result eligibility.

`sitemap.xml` lists the 11 canonical pages. `robots.txt` permits crawling and references it. **GitHub project Pages serves this file under a subdirectory; crawlers only apply robots.txt at the hostname root.** It is prepared for a future root-domain deployment, not an active crawl directive for this project path. See [Google's robots.txt location rules](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec).

`scripts/optimize-images.py` generates responsive WebP versions of 60 source photographs with Pillow. Gallery full views use a quality-90 WebP only when smaller than the retained original. HTML keeps original JPEG fallback sources, intrinsic dimensions, `srcset`, and `sizes`. Below-fold photographs are lazy-loaded; the hero is eager with high fetch priority. Original image files and brand artwork are unchanged.

Measured selected-image file payloads in fresh Edge contexts, device pixel ratio 1, after scrolling the whole homepage:

| Viewport | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| 375px | 2,603,993 bytes | 576,639 bytes | 77.9% |
| 1280px | 2,603,993 bytes | 1,238,047 bytes | 52.5% |

The 32px favicon is 1,395 bytes, compared with the retained 856,500-byte PNG. The replacement ICO is 4,784 bytes versus the retained 116,757-byte ICO; the Apple icon is 17,118 bytes. Payload measurements exclude HTML/CSS/JS/fonts and favicon requests. Browser-selected image sizes vary by screen density. Local unthrottled paint/layout observations are diagnostic only, not production Core Web Vitals or Lighthouse scores.

The Pages workflow stages only public HTML, styles, scripts, images, icons, robots, and sitemap. Audit documentation and tests stay outside the deployed artifact. Its automatic push trigger remains `main`; the remediation branch is not automatically deployed.

### E. Owner decisions and deferred launch items

- **Form delivery, validation, recipient, form service, attachments, spam protection, and form accessibility:** fully deferred. Existing `mailto:estimates@example.com`, status text, `novalidate`, required-field checks, fields, layout, styles, and handlers remain untouched. Hosting capabilities must be established first. Contact copy asks for photographs although the form cannot attach them; this remains deferred with the form experience.
- **Warranty:** Home hero says “Every installation is backed by a lifetime labor warranty because quality should last the test of time.” Home principles say “Five principles. One promise: craftsmanship built to last and backed by a lifetime labor warranty.” About's Legacy Standard says “Qualifying installations are backed by a limited lifetime labor warranty,” and its warranty card says “Our workmanship is backed by a limited lifetime labor warranty on qualifying installations.” The About heading is “Limited Lifetime Labor Warranty.” Confirm the approved scope and wording for all five references. Only the spelling and heading semantics were changed.
- **Service areas:** every utility bar says “Serving Northern Colorado”; footers say “Northern Colorado”; Home metadata and hero also reference Northern Colorado. Home biography says “Northern Colorado, the Denver Metro, and Cheyenne areas”; Contact says “Northern Colorado and surrounding communities.” Confirm coverage and travel limits before harmonizing copy or adding geographic schema/title claims. No areas were added or removed.
- **Reviews:** placeholder names, five-star graphics, and drafting text remain on Home/Reviews. Supply genuine, authorized reviews before launch; no fabricated review schema was added.
- **Other business details:** reconfirm the published phone, trading name, 12+ years of experience, two-business-day estimate timing, and scope of trade coordination. About mentions bringing in licensed trades, while Home FAQ says non-tile trades are handled separately. Supply an address/hours only if they should be public and are verified. No new credentials or facts were assumed.
- **Portfolio:** 58 photographs are not treated as 58 separate projects. Existing captions/material descriptions remain owner-review items. Supply actual project scope, materials, location permissions, and outcomes before adding case studies.
- **Prototype notices:** retained throughout until form delivery, reviews, and business claims are resolved. Do not remove them merely because this remediation is merged.
- **Domain and Search Console:** confirm the purchased hosting and final domain. Update all canonical, Open Graph, JSON-LD IDs/URLs/images, sitemap URLs, and robots sitemap references together; configure HTTPS and redirects for the old site and `/index.html`. Then verify a Search Console property using the owner's DNS or supplied verification token and submit the sitemap. No verification or submission has occurred. No placeholder token or guessed domain was added.

### F. Tests and reproduction

`tests/audit.cjs` passed 110 page/viewport combinations across all 11 pages at 320, 360, 375, 390, 430, 768, 1024, 1280, 1440, and 1920 pixels. It checked 677 local references including responsive sources/anchors, all 58 gallery thumbnails and full images, filter states, modal focus behavior, dismissals, menu/FAQ keyboard behavior, heading order, unique metadata, canonical values, and reduced motion. No local HTTP errors or JavaScript exceptions were observed. Home additionally passed 200% root text sizing at 320 and 1280 pixels and the 1280 × 720 action-visibility check.

Build using `python scripts/build-site.py` and serve `_site` with Python's HTTP server, then run:

```text
node tests/audit.cjs
python tests/verify-static.py
```

The browser test requires Playwright and installed Microsoft Edge. `PLAYWRIGHT_MODULE` can point to an existing Playwright installation; `BROWSER_CHANNEL` and `AUDIT_URL` can override defaults. Image regeneration requires Pillow: `python scripts/optimize-images.py`. The `.audit/` folder stores local screenshots, baseline comparisons, and diagnostic results and is ignored by Git. Form computed-style comparison runs when the saved local baseline is present; the static baseline check is repeatable from Git history.

Visual inspection covered desktop/mobile Home, About, the shower CTA, the lightbox, and representative optimized photography. Safari, Firefox, physical devices, assistive-technology screen readers, Google rich-result validation, live-host performance, and Lighthouse were not tested. No full WCAG conformance or SEO-score claim is made.

### G. Git and release workflow

Repository: `https://github.com/ninjabearstudios/TSE-Legacy-TileWorks-Design`.
Branch: `fix/tse-website-audit-2026`.

The provided folder lacked `.git`. Remote history was fetched and attached using a mixed reset that preserved the files. It matched `origin/main` at `77be552` apart from local gallery edits, which were committed separately as `d50eee5`. Remediation is prepared for a pull request; merging and production deployment require separate approval. No force push or direct main-branch change is part of this work.

Review delivery: [draft pull request #1](https://github.com/ninjabearstudios/TSE-Legacy-TileWorks-Design/pull/1). The branch was pushed successfully after retrying a transient TLS transport failure. Commits `29972cc` (site remediation) and `c607faf` (audit documentation/testing/public deployment staging) follow the preserved local-edit commit. Final test stabilization waits for fonts/hover transitions and distinguishes new derivatives from modified source assets. The complete final browser run and static safeguards passed; production was not deployed or merged.


## Clean URLs (October 12, 2026 follow-up)

The current public routes are `/`, `/about/`, `/contact/`, `/projects/`, `/reviews/`, `/services/`, `/custom-showers/`, `/tile-flooring/`, `/backsplashes/`, `/natural-stone/`, and `/custom-design/`, under the existing GitHub Pages project prefix. This supersedes the audit report's earlier `.html` canonical references.

All navigation, canonical URLs, Open Graph URLs, structured-data URLs/IDs, and sitemap entries now use these directory routes. `scripts/routes.json` maps the editable root HTML source files to public routes. `python scripts/build-site.py` creates `_site`, writes directory index files, rebases relative asset/link paths, and emits legacy `.html` forwarding pages. There is no framework or server dependency. Source files retain their existing names for editing; public links do not expose them. Deploy only `_site`, as configured in the Pages workflow.

GitHub Pages does not provide per-page server redirect configuration here, so old `.html` URLs use client-side replacement preserving query parameters and fragments, with an immediate meta-refresh and clickable-link fallback for JavaScript-disabled visitors. Canonicals point to clean destinations. Explicit `index.html` visits are normalized through browser history. Original page content, styling, and the form handler remain unchanged; the generated Contact form markup is checked against source and the preserved baseline.

Run `node tests/clean-urls.cjs` after building/serving to verify legacy redirects, explicit index visits, clean links, skip-link destinations, filter/anchor preservation, and no-JavaScript fallback. Set `AUDIT_URL` to the served root or project-prefix URL and `PLAYWRIGHT_MODULE` when using a preinstalled Playwright package. Run the existing browser/static audit against the generated site too.


## Contact attachments

The form submits multipart data with or without JavaScript. Server checks enforce count, per-file/combined size, upload errors, file MIME/extension matching, and image headers. Original filenames are replaced with safe numbered names in the email. Files remain in PHP temporary upload storage and are never published in an uploads folder; PHP removes temporary uploads after the request. This is format validation, not malware scanning.

Deploy the generated `.user.ini` too, and verify PHP fileinfo is enabled, `upload_max_filesize` is at least 5M, `post_max_size` at least 12M, and `max_file_uploads` at least 6 (20 is the usual default, allowing the application to reject excessive selections rather than PHP truncating them). Hostinger may override or cache these settings. Mail gateways must accept the encoded message (10 MiB attachments become roughly 14 MiB). The existing PHP mail transport and recipient are unchanged. Verify an actual photo/PDF arrives intact in Cameron's mailbox after upload; SMTP remains the fallback if mail delivery is unreliable.
