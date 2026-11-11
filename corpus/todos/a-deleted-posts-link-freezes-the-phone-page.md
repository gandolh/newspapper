---
title: A link to a deleted post freezes the page at phone width
created: 2026-11-11
status: open
tags: [ui, bug]
---

# A link to a deleted post freezes the page at phone width

Found by brief 09's builder while ordering its screenshots, in the code before brief 09 (so not caused by it): opening `/?post=<id>` for a post that was deleted, at 390 px in headless Chromium, froze the page's main thread. Screenshots and role queries hung. With the post present, the page worked before and after brief 09.

## What to do

- Reproduce it at 390 px in Chromium with a deleted post's id, and at 1280 px to see whether width matters.
- Find the loop (likely an effect that keeps re-selecting a post that no longer exists, or a layout loop in the narrow editor).
- The page should open with no post selected and say the post is gone, at every width. Add a test that opens a missing post's link.
