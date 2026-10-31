# Tempo icon masters

The dark and light PNG files are the original, full-resolution imagegen outputs.
Platform icons are resized with Lanczos from these sources. Do not redraw the
mark from a system font or use the SVG wrapper as an editable vector master.

Rebuild from the repository root:

```sh
python scripts/generate_brand_assets.py
```

The dark master supplies Android, macOS and Windows application icons. iOS uses
the light master by default and the dark master in its system dark icon slot.
The light companion also supplies the existing in-app light branding asset. Both masters
also supply the iOS launch mark at 1x, 2x and 3x, with automatic light/dark
appearance selection. Regenerating icons keeps the launch mark synchronized.

Native vector curves mask the full-color artwork for animation, without a
separate generated cutout. The native launch assembles the crossbar,
stem and blue tip, then runs a highlight across the assembled mark and fades
into the application. Reduce Motion skips assembly and uses a short crossfade.

## Final generation prompts

Mode: built-in imagegen, logo-brand; light companion uses precise-object-edit.

Dark source:

> Use case: logo-brand. Asset type: production app icon master for TEMPO, a refined local-first tasks, calendar, focus and reading app. Create ONE finished square 1024x1024 icon image, edge to edge, no presentation board. Concept: a proprietary sculptural geometric T monogram suggesting a measured beat and forward momentum. A broad gently curved horizontal ivory/silver-white crossbar floats precisely over a short bold central vertical stem, with a small separated vivid #339CFF segment at the right end of the crossbar. T silhouette should be unmistakable yet abstract and bespoke, optically balanced, entirely inside central 56 percent of canvas, bold enough for 32px. Background: perfectly uniform neutral graphite #1A1C1F, no blue cast, full bleed square, no rounded-corner tile, no outline frame or margin surrounding tile. Material on mark only: restrained satin ceramic/platinum, very subtle top highlight and edge relief, almost flat graphic; expensive industrial design, calm modern Swiss precision. Off-white #FFFFFF main symbol with minute tonal silver shading, blue is a small accent only. Composition: centered single symbol with generous negative space, straight-on orthographic. Constraints: no text other than the abstract T shape, no app name, no serif type, no checkmark, no clock dial, no sparkle, no glass bubble, no rainbow, no lens flare, no plastic shine, no floating card mockup, no watermark, no borders. Deliver opaque square ready for iOS system corner masking.

Light source (reference: dark source):

> Use case: precise-object-edit. Edit target: provided TEMPO icon. Create the light-background companion, maintaining exactly the same T silhouette, positions, proportions, negative space, and blue accent shape. Change the full-bleed background only to clean very light neutral #F3F4F5. Change the white/silver part of the T to neutral charcoal #1A1C1F with restrained satin relief, keep the blue tip vivid #339CFF. Preserve the composition and original image dimensions. Opaque flat square with no outer rounded tile, no border, no labels, no other elements, no text. The result must be unmistakably the same logo, not a reinterpretation.
