---
name: apple-design
description: Design reference skill built on Apple's official Human Interface Guidelines (HIG), for designing or reviewing user interfaces on iOS, iPadOS, macOS, watchOS, visionOS (and tvOS). Proactively use this skill for any question like "how should this screen/interaction be designed to feel like Apple", "does this follow Apple's design guidelines", "which native control should I use for this in SwiftUI/UIKit", "how should I set this icon/color/font/spacing/animation", "how do I design for accessibility here", "how do I use Liquid Glass", "which SF Symbol should I pick", "how do I design an app icon" — instead of answering from a training-data impression that may be outdated. The HIG is updated almost every year around WWDC (most notably the 2025 Liquid Glass design language), so relying on memory alone risks giving stale or inaccurate advice. Trigger this skill even when the user never says "HIG" or "Apple design guidelines" explicitly — any discussion of native Apple-platform app/game UI design, navigation structure, component choice, visual style, or interaction patterns should invoke it.
---

# Apple Design (Apple Human Interface Guidelines reference skill)

This skill distills Apple's official design resources (`developer.apple.com/design/`) into ready-to-use reference material, so you can give interface design or review advice for iOS / iPadOS / macOS / watchOS / visionOS apps that is **grounded in current, official guidance** rather than guesswork.

## Why you can't rely on training knowledge alone

The specifics of the HIG — exact spacing values, minimum hit targets, color semantics, even what a component is officially called — shift almost every year around WWDC. In June 2025, Apple introduced an entirely new design language, **Liquid Glass**, which rebuilt the materials, icon, and control-appearance system across iOS/iPadOS/macOS from the ground up. Training-data memory of "Apple design guidelines" likely predates Liquid Glass, or mixes up specs from different platforms. **Whenever a request involves a specific number, component name, or visual spec, check the material this skill has curated — or the live official page — before answering from memory.**

## The overall structure of the HIG

The official HIG (`developer.apple.com/design/human-interface-guidelines/`) is organized into five top-level sections, from abstract to concrete:

1. **Getting started** — Design principles, plus per-platform overviews (iOS/iPadOS/macOS/tvOS/visionOS/watchOS/games)
2. **Foundations** — Elements that run through every interface: Accessibility, App icons, Color, Materials, Typography, Layout, SF Symbols, Motion, Privacy, Dark Mode, etc.
3. **Patterns** — Design guidance for common tasks/experiences: Onboarding, Searching, Undo and redo, Multitasking, Modality, Notifications, etc.
4. **Components** — System components, grouped into eight subcategories: Content / Layout and organization / Menus and actions / Navigation and search / Presentation / Selection and input / Status / System experiences
5. **Inputs** — Input methods: Gestures, Digital Crown, Apple Pencil, Eyes, Game controls, etc.
6. **Technologies** — Integrating specific Apple technologies: Siri, Wallet, HealthKit, SharePlay, etc.

The complete sitemap and every page URL live in [references/hig-sitemap.md](references/hig-sitemap.md).

## How to use this skill

Work through a design question in this order — it covers the vast majority of scenarios:

1. **Identify the target platform(s)** first. Ergonomics, input methods, and component conventions differ substantially across platforms — read the relevant platform section in [references/platforms.md](references/platforms.md) before carrying an iPhone-shaped assumption over to Apple Watch or Vision Pro.
2. **Decide whether this is a "foundation" question or a "specific component/pattern" question**:
   - Color, typography/type size, SF Symbols, materials (especially Liquid Glass), icons, layout/safe areas, accessibility → check the matching references file below
   - How to use a specific control (buttons, tab bars, sidebars, lists, toolbars, etc.) → check [references/components.md](references/components.md); for anything not covered there, look up the URL in [references/hig-sitemap.md](references/hig-sitemap.md)
   - An interaction pattern (onboarding flows, search, undo, gestures) → check [references/patterns-gestures.md](references/patterns-gestures.md)
3. **Explain the "why," not just the "what."** Ground advice in the design principles in [references/principles.md](references/principles.md), or in the concrete official rationale (e.g. "because the hit target must be 44×44pt," not "because Apple says so").
4. **Verify precise values or recent changes against the source.** The summaries in this skill are condensed and paraphrased in plain language, covering the most common scenarios — but they don't cover all 100+ pages of the HIG. When a summary doesn't mention the specific component you need, or you need an exact point value or API name, use WebFetch or a browser tool to open the matching URL in [references/hig-sitemap.md](references/hig-sitemap.md). HIG pages are JavaScript-rendered single-page apps, so plain WebFetch often only captures the page title, not the body — if that happens, switch to a browser tool (navigate → wait 1-2s → get_page_text) to get the real content. Never fabricate content from training knowledge when a fetch fails.
5. **When it's time to produce actual design files/prototypes**, point to the official UI Kits, fonts, SF Symbols, and Icon Composer in [references/resources.md](references/resources.md) instead of having the user redraw standard system controls from scratch.

## The eight design principles (quick reference)

Full explanations live in [references/principles.md](references/principles.md); here's the one-line version, useful for quickly figuring out which direction a design tradeoff should lean:

- **Purpose** — Get clear on what actually matters to people before deciding how to build it
- **Agency** — Stay out of the user's way, let them explore freely, and keep the cost of mistakes low (undo, recover)
- **Responsibility** — Be accountable for people's data and trust; be transparent about permissions and data use
- **Familiarity** — Borrow concepts people already know and stay visually/interactionally consistent, to lower the learning curve
- **Flexibility** — Accessibility is a starting point, not a patch; adapt to different devices, input methods, and contexts
- **Simplicity** — Keep only what's necessary and build a clear hierarchy — simplicity isn't the same as minimalism
- **Craft** — Every detail reflects how much you care; keep refining instead of treating shipping as the finish line
- **Delight** — Know what emotion you're trying to evoke, but never let delight upstage the task at hand

## Platform quick reference (details in references/platforms.md)

| Platform | One-line positioning | Primary navigation | Key input methods |
|---|---|---|---|
| iOS | On-the-go, single-handed, fragmented usage | Floating tab bar (Liquid Glass) | Multi-touch, voice |
| iPadOS | Large-screen productivity and creation, multitasking | Tab bar ↔ sidebar, adaptive | Touch, external keyboard/trackpad, Apple Pencil |
| macOS | Long focused work sessions, multiple windows | Menu bar + sidebar | Keyboard, pointing devices |
| watchOS | Glance-and-go, sub-minute interactions on the wrist | Digital Crown navigation | Digital Crown, Action button, simple gestures |
| visionOS | Spatial computing, windows floating in real space | Floating tab bar / sidebar | Eyes + indirect/direct gestures |

## Liquid Glass in one paragraph

Introduced in 2025, this new material is meant for the **control and navigation layer** (tab bars, sidebars, toolbars) — not the content layer. Standard system components pick it up automatically; custom components should use it sparingly. It comes in two variants: **regular** (preserves legibility, use for most cases) and **clear** (emphasizes visibility of a rich media background underneath). By default it has no inherent color and tints itself from what's behind it — apply color sparingly, and prefer tinting the background rather than the symbols/text on top of it. Full rules in [references/materials-color.md](references/materials-color.md).

## Accessibility numbers you can't afford to skip (easy to miss, easy to get called out on)

| Check | iOS/iPadOS | macOS | watchOS | visionOS |
|---|---|---|---|---|
| Default text size | 17pt | 13pt | 16pt | 17pt |
| Minimum control hit target | 44×44pt | 28×28pt | 44×44pt | 60×60pt |
| Text contrast (≤17pt) | 4.5:1 (WCAG AA) | same | same | same |

Full accessibility guidance (vision, hearing, mobility, speech, cognitive) lives in [references/accessibility.md](references/accessibility.md).

## Reference file index

| File | Contents |
|---|---|
| [references/principles.md](references/principles.md) | Full explanation of the eight design principles and how to apply them |
| [references/platforms.md](references/platforms.md) | Device characteristics, ergonomics, and best practices for iOS/iPadOS/macOS/watchOS/visionOS |
| [references/materials-color.md](references/materials-color.md) | The full rules for Materials, Liquid Glass, and the Color system |
| [references/typography-symbols.md](references/typography-symbols.md) | Font families, Dynamic Type, and SF Symbols rendering modes/weights/animations |
| [references/layout.md](references/layout.md) | Visual hierarchy, size classes, safe areas, adaptability |
| [references/accessibility.md](references/accessibility.md) | Concrete specs and numbers across the five accessibility dimensions |
| [references/components.md](references/components.md) | Best practices for Buttons, Tab bars, Sidebars, Lists/Tables, Toolbars |
| [references/app-icons.md](references/app-icons.md) | Layered icon design, the Icon Composer workflow, Liquid Glass icon appearances |
| [references/patterns-gestures.md](references/patterns-gestures.md) | Gesture design principles, standard per-platform gestures, common interaction patterns |
| [references/resources.md](references/resources.md) | Official UI Kits, fonts, SF Symbols, Icon Composer, and other downloads |
| [references/hig-sitemap.md](references/hig-sitemap.md) | Full URL index of the HIG, for looking up anything this skill doesn't already cover |

## A note on quoting official content

HIG text is copyrighted by Apple. When explaining something to a user, **paraphrase the core rule and rationale in your own words** rather than pasting large blocks of the original text. When exact wording matters (e.g. for marketing copy or legal-adjacent language), hand the user the official URL and let them read the source themselves rather than reproducing it verbatim in your reply.
