# TÀ XÙA TRIP — MOBILE-FIRST PRODUCT UI STANDARD
## Persistent UI/UX Rule for All Future Public Product Phases

**Status:** Canonical cross-phase product UI requirement  
**Applies to:** All new public/customer-facing Tà Xùa Trip interfaces  
**Primary device assumption:** Mobile phone  
**Secondary devices:** Tablet and desktop  
**Traffic assumption:** A large share of visitors may arrive from TikTok, Facebook, Messenger, Zalo, Instagram and shared social links.

---

# 1. CORE RULE

Tà Xùa Trip must be designed **mobile-first**, not desktop-first with a later responsive shrink.

For every new public feature:

```text
MOBILE EXPERIENCE
→ must be designed intentionally

DESKTOP EXPERIENCE
→ may expand the same product capability
```

Do not treat mobile as a reduced desktop screenshot.

---

# 2. WHY THIS RULE EXISTS

Typical customer behavior for Tà Xùa Trip is expected to include:

```text
social post / short video
→ tap link
→ mobile browser
→ 3–5 second first impression
→ browse
→ compare
→ take action
```

Therefore the mobile experience must optimize for:

- fast comprehension;
- strong photography;
- low cognitive load;
- thumb-friendly actions;
- short forms;
- progressive disclosure;
- clear sticky/primary CTA;
- fast load;
- safe browser viewport behavior.

---

# 3. MOBILE IS THE PRIMARY PUBLIC QA TARGET

Every future public UI task must explicitly QA at least:

```text
390×844
393×873
412×915
430×932
```

Also check:

```text
768×1024
1024×768
1366×768
1440×900
```

A feature is not visually complete if only desktop screenshots were reviewed.

---

# 4. MOBILE-FIRST DOES NOT MEAN ONE UI FOR ALL DEVICES

It is acceptable and often preferred to use separate presentation layouts:

```text
Desktop presentation
Mobile presentation
```

while sharing:

- domain logic;
- query state;
- validation;
- DTOs;
- CMS content;
- permissions;
- pricing;
- availability;
- verification;
- API/data access.

Do NOT create duplicated business engines for mobile.

---

# 5. FIRST-VIEW PRINCIPLE

On a phone, the first screen should answer quickly:

```text
Where am I?
Why should I care?
What can I do next?
```

Avoid showing every control immediately.

Prefer:

```text
visual
→ concise value proposition
→ primary CTA
→ progressive details
```

over:

```text
large form
→ many filters
→ many tabs
→ long explanatory content
```

---

# 6. PROGRESSIVE DISCLOSURE

Complex flows should usually use:

- bottom sheet;
- drawer;
- accordion;
- step flow;
- expandable details;
- full-screen mobile selector.

Do not force desktop panels into small screens.

Examples:

```text
Search → CTA → bottom sheet
Filter → Filter button → full-height sheet
Price details → summary → expand nightly breakdown
Bike selection → card → details sheet/page
```

---

# 7. PRIMARY CTA

Every important mobile screen should have one clear primary action.

Preferred CTA characteristics:

- 48–56px minimum practical height;
- visually dominant;
- easy thumb reach;
- concise Vietnamese copy;
- no ambiguous generic action where a specific action is possible.

Examples:

```text
Tìm phòng phù hợp
Xem xe phù hợp
Thêm xe vào chuyến đi
Xem chi tiết
Tiếp tục
```

---

# 8. TOUCH TARGETS

Interactive controls should target approximately:

```text
44×44px minimum
```

Prefer larger for primary actions.

Do not place tiny text links close together.

---

# 9. MOBILE NAVIGATION

Mobile header should remain compact.

Prefer:

```text
logo
brand
hamburger
```

Do not force full desktop navigation into horizontal wrapping.

Avoid oversized fixed headers.

---

# 10. TYPOGRAPHY

Mobile typography must be intentionally scaled.

General principles:

- readable without zoom;
- no giant desktop H1 spilling across the viewport;
- no 10–12px explanatory copy;
- Vietnamese diacritics must render cleanly;
- line length should remain comfortable.

---

# 11. PHOTOGRAPHY

Travel is image-led.

On mobile:

- use dedicated mobile media where it materially improves crop;
- support 4:5 / 9:16 art direction;
- respect CMS focal point;
- preserve subject/sunrise/view;
- do not wash photos out;
- do not allow UI to cover the most important visual subject.

CMS should remain the source of truth for editable public media.

---

# 12. PERFORMANCE

Mobile traffic may use weak cellular connections.

Public mobile UI must prioritize:

- LCP;
- optimized images;
- responsive `srcset`;
- correct `sizes`;
- minimal client JavaScript;
- no unnecessary UI frameworks;
- no autoplay video by default;
- no large unused desktop image on mobile;
- minimal layout shift.

New dependencies require justification.

---

# 13. BROWSER VIEWPORT SAFETY

Prefer safe use of:

```text
svh
dvh
```

over blindly relying on `100vh`.

Use safe-area insets where appropriate:

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

Especially for sticky CTA, bottom sheet, full-screen dialog and header.

---

# 14. FORMS

Mobile forms should:

- use correct native input types;
- open suitable keyboard;
- avoid excessive fields;
- group related data;
- preserve labels;
- remain usable when keyboard is open;
- allow scroll inside sheets/dialogs;
- avoid hidden submit button under keyboard.

---

# 15. FILTERS

Do not display a desktop sidebar filter permanently on mobile.

Preferred:

```text
[ Bộ lọc ]
→ sheet
```

Show active-filter count if useful.

---

# 16. CARDS

Mobile cards should prioritize:

1. image;
2. name;
3. most decision-relevant facts;
4. price/status;
5. CTA.

Do not expose every database field on a card.

---

# 17. TRUST INFORMATION

Verified/trust information must remain prominent but concise.

Examples:

- Đã thẩm định;
- View từ giường;
- Đường ô tô;
- ngày xác minh;
- availability freshness;
- price confidence.

Do not hide material caveats to reduce card height.

---

# 18. NO HORIZONTAL TABLE DEPENDENCE FOR CUSTOMERS

Avoid wide data tables in public mobile UI.

Convert to stacked rows, cards or disclosure sections.

Admin tables may scroll horizontally when necessary.

---

# 19. BOTTOM SHEETS

Bottom sheets are preferred for short mobile decisions.

Required when used:

- accessible dialog semantics;
- explicit close;
- focus management;
- background inert;
- body scroll lock;
- safe-area padding;
- internal scrolling;
- keyboard safety.

Do not depend only on swipe gestures.

---

# 20. STICKY ACTIONS

Sticky mobile actions are allowed when they materially improve conversion.

Rules:

- never cover critical content;
- respect safe-area inset;
- do not duplicate an identical CTA unnecessarily;
- make state obvious.

---

# 21. MOTORBIKE UI — PHASE 5 APPLICATION

For Motorbike Integration specifically, mobile priority should be:

```text
visual bike/service card
→ key suitability facts
→ real price/status if available
→ confirmation mode
→ clear CTA
→ detailed evidence/terms later
```

Do not show an operations/fleet-management UI to consumers.

Do not expose:

- license plate unless explicitly necessary and authorized;
- maintenance internals;
- handover internals;
- customer rental history;
- Biker private operations.

---

# 22. SOCIAL TRAFFIC LANDING QUALITY

Any page likely linked from social media must work well as a direct landing page.

It should establish context, trust and action within the first 1–2 screen heights.

---

# 23. MOBILE EMPTY STATES

Empty state must remain useful.

Never invent availability.

---

# 24. LOADING STATES

Use stable skeleton/loading treatment when needed.

Do not imply availability before data resolves.

---

# 25. ERROR STATES

Errors should tell the user what they can do next.

Avoid technical backend language.

---

# 26. ACCESSIBILITY

Every public mobile feature must preserve:

- semantic headings;
- keyboard support;
- labels;
- screen-reader names;
- visible focus;
- sufficient contrast;
- reduced-motion behavior;
- dialog semantics.

---

# 27. CONTENT LENGTH

Mobile copy should be shorter than desktop when possible, without changing factual meaning.

---

# 28. MOBILE AND DESKTOP SHARE PRODUCT TRUTH

Never create different factual claims between desktop and mobile.

Price, availability, verification, road access, Room ID, bike availability, supplier confirmation and policy must remain identical in meaning.

Only presentation may differ.

---

# 29. PUBLIC VS ADMIN

This standard is primarily for public/customer UX.

Admin must still be mobile-usable, but complex Admin data may use stacked forms, horizontal table scroll and sticky save.

---

# 30. QA REPORT REQUIREMENT

Every future phase that changes public UI must include:

```text
## Mobile UX

- 390×844
- 393×873
- 412×915
- 430×932
- first-view behavior
- CTA
- scroll/overflow
- sheet/dialog behavior
- image crop
- performance impact
```

Desktop-only QA is insufficient.

---

# 31. REGRESSION REQUIREMENT

Before approving a public UI phase verify both:

```text
MOBILE primary experience
DESKTOP regression
```

---

# 32. CODE ARCHITECTURE RULE

Preferred:

```text
shared domain/data logic
        ↓
shared presentation primitives
        ↓
mobile layout / desktop layout
```

Avoid separate mobile/desktop business engines.

---

# 33. CMS REQUIREMENT

Editable public images/copy should continue using the existing CMS where appropriate.

Do not hard-code campaign imagery Admin is expected to change.

---

# 34. FUTURE PHASE RULE

Read this file before implementing any new public UI in:

- Motorbike Integration;
- Package Commerce;
- Trip Finder;
- Booking;
- Checkout;
- My Trip;
- Bus/Transfer/Add-ons;
- Growth.

If a newer explicitly approved task conflicts on pure presentation, the newer task may override it.

Product truth/security/domain specifications always take precedence over visual convenience.

---

# 35. FINAL PRINCIPLE

Tà Xùa Trip should not merely be responsive.

It should be:

> **designed for the way travelers actually discover and use it.**

For public product work, assume the phone is the primary product surface unless explicitly proven otherwise.
