# Tà Xùa Trip visual reference

## Source precedence

1. **Primary public visual reference:** `website+marketing visual.png`
2. **Supporting reference:** `ta-xua-brand-direction.png`

Do not average the references into a 50/50 green/blue system. The public website target follows the light blue/cloud/mountain-navy reference. The green/cream board contributes local authenticity, trust language, selected pine accents, icon ideas, and photography guidance only.

These files are moodboards. They are not final legal logo artwork, production UI specifications, or factual product imagery. They are intentionally summarized here so future Codex sessions do not require the original attachments for normal implementation decisions.

## Target visual character

The public website should feel:

- bright and airy;
- cloud-like;
- modern and trustworthy;
- informed by travel intelligence;
- authentically Tà Xùa;
- premium without pretending to be luxury;
- local without feeling rustic.

Avoid:

- green/cream dominating the entire site;
- an eco-lodge identity;
- a generic OTA-blue clone;
- excessive gradients or glassmorphism;
- dark backgrounds across most of the page;
- visual clutter, dense cards, or an inconsistent icon zoo;
- stock travel imagery and fake accommodation photography.

Aim for roughly 70–80% light/cloud canvas, using darker surfaces deliberately for navigation, trust, strong calls to action, or selected statement sections.

## Target palette concept

```text
Trip Navy     #083D76   navigation, primary CTA, anchors, trust UI
Cloud Teal    #0EA5A5   verification, 360, information, interaction
Trip Green    #10B981   confirmed/available/positive operational states
Sunrise       #F59E0B   selected accents, sunrise and Cloud highlights
Cloud White   #F6FAFC   main canvas
White         #FFFFFF   cards and clean surfaces
Ink           #16324A   primary text
```

These are Phase 2.5 design-system targets, not permission to change production CSS now. Phase 2.5 should centralize them as semantic tokens rather than scatter hex values across components. Green is a support/status color, not the master canvas.

## Typography

Use **Be Vietnam Pro** for primary UI and brand typography, with appropriate system fallbacks. It is suitable for navigation, forms, filters, cards, tables, prices, body copy, Admin, and calls to action.

Decorative/script typography is optional only for campaign expression such as `Đi thật. Biết trước.` when readability is preserved. Never use decorative fonts for forms, navigation, tables, prices, filters, policies, or body copy.

## Icon direction

Use a coherent rounded line-icon family for:

- Verified / shield
- 360
- Cloud
- Location
- Road and parking
- Bus
- Motorbike
- Support
- Package
- Room and bed
- Sunrise and view

Icons should support comprehension, not substitute for labels or create a decorative icon zoo.

## Photography

Prefer real first-party imagery:

- Tà Xùa landscapes, cloud valleys, and sunrise;
- real rooms, including the view from bed;
- balconies, windows, bathrooms, and room layout;
- road access, difficult sections, and parking;
- real motorbikes and buses;
- people in real environments, usually secondary to place.

Evidence photography must retain correct property/room type/Room ID scope. Moodboard or campaign imagery must never be copied into production listings or presented as factual inventory. A temporary decorative hero image must be clearly non-product and must not imply a room, service, or condition that has been verified.

## Layout and interaction

- Use generous spacing, clear hierarchy, clean white/light-blue cards, and large authentic imagery.
- Keep trust facts and evidence prominent without turning every fact into a badge.
- Use navy for decisive actions and teal for verification/data accents.
- Use Sunrise sparingly so it remains meaningful.
- Keep mobile search, filters, cards, and verification facts easy to scan.
- Avoid giant autoplay hero video or heavy media that blocks LCP.
- Lazy-load 360 and non-critical media.
- Maintain accessible contrast, visible focus, readable button text, and non-color state cues.

## Logo and asset status

Moodboard logos are direction, not confirmed final vector/legal assets. Before public launch, the owner/designer should produce and review master, horizontal, stacked, icon, white, monochrome, and favicon variants, plus default OG and responsive hero assets. Do not claim trademark finality without separate review.

Future asset production should include verified/360/Cloud badge assets and a coherent SVG icon set, but brand graphics must never replace truthful evidence or accessibility labels.

## Current implementation boundary

This document records future direction only. Production colors, logo, homepage, header, footer, UI components, navigation, Admin branding, routes, metadata, and canonical behavior remain unchanged until V2 Phase 2.5 is separately authorized.
