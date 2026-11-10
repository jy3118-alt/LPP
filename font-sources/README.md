# LPP Hand Ink

LPP Hand Ink is an experimental Latin variable typeface derived from Caveat, with an added `BOIL` axis (0–3). It is not a typeface drawn from scratch. Caveat is copyright 2014 The Caveat Project Authors and is distributed under the SIL Open Font License 1.1; see `OFL-Caveat.txt`.

Build with `python3 scripts/build-lpp-hand-ink.py` (requires fontTools). The app uses `web/fonts/lpp-hand-ink.woff`; the matching installable variable font is `web/fonts/lpp-hand-ink.ttf`. The separate existing LPP Ink family supplies Korean glyphs.

`python3 scripts/build-feeling-ink.py` builds the softly irregular expression font from the existing PoVF, preserving its six emotion axes.

## LPP Rough Ink

LPP Rough Ink is an experimental Latin variable font adapted from the Apache 2.0 licensed Rock Salt typeface. Its glyphs and spacing have been narrowed for mobile, and the `BOIL` axis adds animated ink variations. The original Rock Salt font and license are included here. It is a derivative rather than an independently drawn typeface. Build with `python3 scripts/build-lpp-rough-ink.py`. The app uses the WOFF file; the TTF file is also available for installation.
