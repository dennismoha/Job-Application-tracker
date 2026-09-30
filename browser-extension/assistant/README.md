# Browser Companion — Milestones 24–32 assistant patch

This folder is an additive integration for the existing Chrome/Firefox Browser Companion.

It adds two behaviors without changing the current capture/save workflow:

1. `suggestApplicationField(...)` — asks the API for a draft answer grounded only in verified Evidence Bank entries. If the answer needs current/personal information (salary expectation, notice period, current address/location), the API returns `requiresUserInput: true` instead of inventing a value.
2. `prepareAndOpenApplication(...)` — from an explicit user click, downloads the CV version attached to the Application Pack (when one exists) and then opens the external application URL. The extension never submits the application automatically.

Wire these helpers into the existing popup/content-script UI rather than creating a separate extension.
