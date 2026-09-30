# Uploaded UI study

The uploaded UI is retained under `docs/ui-reference/src/` as a design reference only. It is intentionally outside the compiled web source tree.

## Visual language

- dark navy application shell;
- narrow 220px information-dense sidebar;
- Inter for product text and JetBrains Mono for operational metadata;
- blue primary action, green health/success, amber warnings, red risk/failure, purple interview/status context;
- compact 4–6px radii rather than large consumer-style cards;
- one-pixel borders and restrained shadows;
- tables and master/detail layouts preferred over large isolated cards;
- muted labels and dense metadata preserve hierarchy without hiding operational detail.

## Interaction model

The design exposes user-facing and operational capabilities explicitly instead of collapsing them into broad destinations. This is appropriate for Job Intelligence because the user may need both daily application workflows and source/crawler troubleshooting.

## Integration conclusion

The existing backend and workflows should remain unchanged. The uploaded UI should own navigation, visual hierarchy, spacing and component language.
