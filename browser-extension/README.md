# Job Intelligence Browser Companion

The Browser Companion extends the existing one-click job capture workflow. It does not replace it.

## What it does

- Reads only the active tab when the user opens the extension.
- Looks for `JobPosting` JSON-LD and visible vacancy text.
- Tells the user whether the current page appears to be a job page.
- Keeps the original **Save job** and **Save + applied** actions.
- Loads CVs from the user's Job Intelligence CV library.
- Compares the current job against a selected CV without saving the page first.
- Distinguishes **evidenced**, **partial**, **not evidenced**, and **needs confirmation** requirements.
- Can save the job together with a CV comparison for later preparation.
- Can save an application with the exact CV version used.
- Can open the full CV tailoring workspace in the web app.

## Truthfulness rule

The companion never treats a missing CV phrase as proof that the user lacks the qualification. It reports that the requirement is **not evidenced in the CV**. Missing qualifications or experience must be explicitly confirmed by the user before they are added to a tailored CV.

## Development setup

1. In the web app, open **Browser companion** and create a token.
2. Chrome/Edge: open Extensions, enable Developer mode, choose **Load unpacked**, and select this `browser-extension` folder.
3. Firefox: open `about:debugging`, choose **This Firefox**, then **Load Temporary Add-on** and select `manifest.json`.
4. Open extension settings and enter:
   - API address, e.g. `http://localhost:4000`
   - Web app address, e.g. `http://localhost:5173`
   - Companion token

The development manifest grants API host access only to `http://localhost:4000/*`. Add the deployed API origin to `host_permissions` when packaging production builds.

## v1.2 application intelligence

The existing v1.7 Browser Companion behavior is preserved. The additive `assistant/application-assistant.js` helper can draft common application-field answers from verified Evidence Bank facts and can prepare the selected CV before opening an external application. It never submits the external form automatically.
