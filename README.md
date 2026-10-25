# Thrust Lab Studio

A browser-local studio for generating, inspecting, and editing thrust-versus-time profiles. The interface uses a chart-centered workspace, timeline selection, operation inspector, and undo history, with its own navy-and-teal Thrust Lab Studio identity. The application is a static site suitable for GitHub Pages at **thrustlab.defencore.com**.

All imported data stays in the browser. No account, server, or API key is required.

Use the **EN / UA** selector in the header to switch between English and Ukrainian. The language choice is remembered in this browser. Profile names, imported measurements, project files, and CSV exports retain their original data; code comments remain in English. Control names below use the English interface.

## Display units

Use **Display units** to choose thrust in **N**, **kN**, **kgf**, or **lbf**; time in **s**, **ms**, **µs**, or **min**; and impulse in **N·s**, **kN·s**, **kgf·s**, or **lbf·s**. The choice applies to graph axes and hover values, summary metrics, sample data, selection and cursor times, measuring markers and differences, theoretical offsets, generator targets, thrust offsets, and target-fitting fields. Impulse units use seconds independently of the displayed time scale.

Changing display units converts the visible values without changing any measurement, timestamp, selection, theoretical alignment, or undo entry. Editing a displayed value converts it back to the same internal SI representation used by profile operations. Browser preferences retain display choices and canonical control values across reloads. **Reset saved settings** restores N, s, and N·s.

CSV import units describe the source file; CSV export units determine the downloaded format. Those choices remain independent of display units. Project files and calculations retain seconds, newtons, and newton-seconds internally.

## Workflow

The studio separates **Edit profile** from **Create profile**. The editing workspace holds the active working curve. The creation workspace holds an independent, read-only generator preview. Switching between them does not replace or regenerate the working curve.

### Edit an existing profile

Import a CSV or open a project to enter **Edit profile**. Use **Transform**, **Curve**, **Signal**, and **Theory** to reshape, smooth, add noise to, or compare the loaded measurements. Generator controls belong to **Create profile** and are kept out of the editing workspace.

The CSV importer remembers the last time and thrust columns, units, and header-row choice separately for working and theoretical profiles. A matching column name is reused when possible; a different file layout is checked against its own headers rather than blindly reusing old column positions. Review the preview before importing.

The parser supports comma, semicolon, and tab delimiters, quoted fields, decimal commas in semicolon-separated files, and time in seconds, milliseconds, or microseconds. Thrust can use N, kN, kgf, or lbf. Internally, time is seconds and thrust is newtons. Imports require at least two finite measurements with nonnegative thrust and strictly increasing, unique timestamps. Files are limited to 30,000 measurements and 20 MB.

### Create a profile from scratch

Open **Create profile**, choose a motor preset or custom targets, and inspect the preview as it updates automatically. Set peak thrust, maximum burn time, desired impulse, sampling interval, shape, and a reproducible random seed. Choose uniform sampling, jitter around a regular clock, or sequential random intervals. Generated examples are synthetic graph profiles, not certified motor test data or motor designs.

Preview generation changes only the creation workspace. **Back to editing** returns to the working curve with its existing measurements, reference curves, and selection. **Open in editor** explicitly starts a new working profile from the preview; one **Undo** restores the previous working profile in the current session.

**Max. burn time** controls the generated timeline end; the displayed **Burn duration** uses interpolated crossings of 5% of peak thrust. Impulse uses trapezoidal integration. **Mean burn thrust** divides total impulse by that 5% burn duration. If a requested impulse is incompatible with the peak, duration, and sampling, the generator reports the feasible range and generates the nearest achievable profile.

The motor preset library uses published scalar references from ThrustCurve with original synthetic starting shapes. Presets are not copied OpenRocket motor files or certified measurements. [OpenRocket's motor selection guide](https://openrocket.info/tutorials/motor-selection.html) explains its use of ThrustCurve; the [OpenRocket motor database](https://github.com/openrocket/motor-database) directs other applications to the [ThrustCurve API](https://www.thrustcurve.org/info/api.html). Reference sources are linked in the studio's **Quick guide**.

### Work with the active curve

Use **Select** and drag across the main chart to choose a time range, or enter exact **IN** and **OUT** values in the inspector. A valid increasing range updates the selection immediately; incomplete or invalid values remain available for correction. Choose **Entire profile** or **Selection** to set the edit scope. Scroll over the chart to zoom time, use **Shift + wheel** to zoom thrust, or drag the overview strip to reposition a zoomed time range. **Clear selection** in the chart toolbar, or **Esc**, clears the selected range, active point, and measuring markers while retaining all measurements.

Under **Transform**, set **Time width** below 100% to compress the shape or above 100% to expand it, choose the start, center, or end anchor, and adjust **Thrust gain** and **Thrust offset**. Valid control changes update the working curve immediately. Adjusting the controls refines the current edit from its starting measurements, so typing a value does not repeatedly compound the same transform. **Reset controls** returns width and gain to 100% and offset to 0 N. Horizontal compression and expansion resample the curve onto existing measurement times; compression zero-fills the emptied interval and expansion clips at the edit scope. Enable **Fit peak thrust** or **Fit impulse** to scale the curve toward the corresponding target as its value changes. **Zero outside selection** sets values beyond the selected interval to zero. Every edit preserves the original timestamp sequence.

Use **Shift profile (G)** and drag left or right to move the recording along its fixed timeline, or enter an exact **Time shift** under **Transform → Shape & scale**. Positive values move thrust later; negative values move it earlier. The studio resamples shifted thrust at the existing measurement times and clips values that move outside the recording. Choose **Fill emptied intervals → Zeros** or **Recorded background**. Background fill reuses the measured floor and noise from an original quiet region before or after the burn, with at least seven samples below 5% of the original peak. **Background level** adjusts its strength. The pattern repeats at its original time rate with mirrored loops, so it stays stable as you refine the shift. It changes only newly emptied samples; the shifted measurements and timestamp sequence stay intact. If no quiet source exists, the studio explains what is missing instead of inventing noise. A flat source produces a flat background. The shift is a normal undoable data edit. **Pan (H)** moves the viewing window.

For a selected **Shape & scale** edit, **Edge transition** blends the transformed values into the untouched curve. The default 15% reserves 15% of the selection duration at each edge for a smooth transition; the center receives the full requested transform. Values at the selection boundaries and outside the range remain exact. Choose 0% for a sharp boundary, or up to 50% for a transition across each half of the selection. Whole-profile edits remain uniformly proportional and do not use edge blending. Manual transforms do not renormalize the result to preserve impulse, and edge blending never changes timestamps.

Selected **Fit to target** operations also honor **Edge transition**. The studio solves the proportional gain to reach the requested selected peak or impulse, including the transition regions and interpolated impulse boundaries. If the unchanged edges make a target impossible, the operation leaves the profile intact and explains how to reduce the transition, widen the selection, or change the target.

Choose **Entire profile** to use **Fit final fall-off**, which sets when the final decay begins. **Decay starts after** is elapsed time from ignition to that onset, in the selected display time unit. It controls the final falling section independently of the time of peak thrust. **Match all targets to theory** opens the coordinated matching workbench.

Use **Draw** to reshape thrust directly on the chart, or open **Sample data** to change individual thrust values. Time fields in the sample table are read-only. Use the page-number field to jump directly to another page, or **Reveal cursor** to open the page containing the nearest measurement to the chart cursor. Under **Signal**, enable **Random noise** to add seeded variation relative to the peak in the edit scope, **Recorded noise** to reuse a captured source, or **Smoothing** to remove noise with a centered moving-average window. Enabled effects respond immediately when their settings change. Disable an effect to remove it from the current edit.

Under **Theory → Reference & overlay**, import a separate theoretical CSV, choose **Use generator preview as theory** to overlay the most recently generated preview, or capture the working curve as a reference. Adjust opacity and layer visibility there. The **Match theory** workbench below it coordinates timing, peak thrust, total impulse or mean burn thrust, theoretical shape, and recorded texture.

**Theory alignment** keeps source timestamps by default. Choose **Align timeline starts** to place the first theoretical sample at the first working timestamp, or **Align ignition (5% peak)** to match interpolated 5%-peak onset crossings. **Align starts** provides the ignition-alignment shortcut. Add a signed **Manual offset** in the selected display time unit for further adjustment; the applied shift is shown below the controls. Alignment translates only the theoretical reference without stretching its duration or changing its amplitudes. Working timestamps stay exact, and fitting or sample-table comparisons use the aligned reference. Source theoretical data and alignment settings are retained separately in project files and undo history.

In **Edit profile**, open **Export** to download the entire working profile as CSV with chosen units, delimiter, and thrust precision, or choose **Save project** for a `.thrustlab.json` file containing the working curve, original, theory, selection, edit scope, layer visibility, and generator settings. In **Create profile**, **Export preview** and **Save project** export the generated preview without opening it in the editor or changing the working profile. **Open project** restores a saved project in the editing workspace. Default seconds export retains exact numeric timestamps; the selected decimal precision controls thrust values. Unit conversions can introduce normal floating-point rounding.

The current workspace is saved automatically in this browser's local storage when storage is available. The studio retains up to 80 undoable edits in the current session; undo history does not survive a reload or project export. Use a project download to keep a portable copy of your work.

## Match a recording to theory

Import the actual recording as the working profile and load its theoretical reference under **Theory → Reference & overlay**. The source controls are collapsible so the matching workbench remains visible while editing.

1. Choose **Use current values** to begin with the recording's measured properties, or **Use theory values** to copy the reference targets. Set **Burn start**, **Burn duration**, and **Peak thrust**. Start and duration use the interpolated 5%-peak burn window, and every result retains the original measurement timestamps.
2. Under **Set the total using**, choose **Impulse** or **Mean over burn**. Only the selected quantity is independent; the other field is calculated from **impulse = mean over burn × burn duration**. Mean over burn uses total impulse divided by the 5% burn duration. **Theory shape** blends the normalized recording and reference shapes before fitting the requested targets. Enable **Custom final fall-off** to set **Tail starts after ignition**, the elapsed time before final decay begins; leaving it off retains the reference's natural tail timing.
3. Enable **Live matching** to see valid control changes immediately. Under **Recording texture**, choose **Original recording** to reuse the recording's measured variation, **Captured sample** to reuse a source captured in **Signal**, or **None** for a clean fit. Set the noise level and baseline window to control that texture. A captured source becomes available after capture.
4. Review **Before / Theory / Result** and the status report. Sampling, available timeline, peak, duration, and shape constrain the achievable impulse. An infeasible request keeps the working values intact and reports what needs to change. Recorded texture is added after the clean fit while peak, impulse, and burn timing remain constrained. The studio reduces texture when needed to retain those targets and reports the achieved recording's noise RMS.

The workbench fits the whole recording; manual editing tools can still use a selected range. Its controls refine one fitting operation from a stable starting recording and do not repeatedly compound a fit while typing. Normal **Undo** restores earlier working values. The saved settings retain fitting targets and texture choices in SI; loading cached settings leaves live matching off.

## Chart zoom and pan

The control row below the chart toolbar has separate **Time** and **Thrust** zoom buttons. Ordinary scrolling zooms time around the pointer; **Shift + wheel** zooms the thrust view. Drag the left thrust axis vertically to adjust its scale. Choose **Pan (H)** to move through time and, while a manual thrust range is active, through thrust as well.

The thrust status shows **Auto** when the visible recording determines the vertical scale. After a manual zoom, it shows the active range. **Reset thrust scale**, or a double-click on the thrust axis, returns to automatic scaling. **Fit all axes (F)** restores the full time range and automatic thrust scale together. Display units apply to the visible range and axis values.

Zoom and pan are available in both workspaces and retain all recorded thrust values, timestamps, CSV data, and undo history. These view adjustments last for the current session.

## Measure time and thrust

Choose **Measure (M)** in the chart toolbar, then click two points or drag from A to B. The teal **A** and purple **B** markers snap to actual measurement times. Drag either marker or type its time in the readout below the chart to inspect another sample. The readout shows each marker's time and thrust, plus signed **B − A** differences in time and thrust. Display unit changes update the markers and readout together.

Measuring is available in both the editing workspace and generator preview. It leaves measurements, undo history, and the edit selection unchanged. **Clear measurement** removes only the ruler markers. **Clear selection** or **Esc** clears the range, selected point, and ruler markers together. Markers are kept only in the current session and are excluded from project files and CSV exports.

## Control-point curve editing

Choose **Curve points (C)** or open **Curve → Start curve editing** to adjust the recording through anchor points. Entering the tool preserves the existing measurements, detail, and noise. The editor starts with five anchors by default. The selected point is highlighted on the chart and in the point list, and **Influence** shows the time span affected by moving it. Add more points to narrow that span. Changing the point count, adding or removing a point, or choosing **Redistribute points** changes the handles while retaining every measurement value exactly. Interior points snap to existing measurement times and cannot cross their neighbours. **Point time** and **Point thrust** provide precise numeric editing in the selected display units.

Moving one anchor changes measurements between its neighbouring anchors. The adjustment is added to the existing recording, retaining its smaller features and noise; measurements beyond the affected interval stay unchanged. **Adjustment shape** controls how that local correction transitions between anchors: **Smooth adjustment** uses a smoothstep weight whose slope reaches zero at the anchors, while **Linear adjustment** varies the correction linearly. These weights act on the correction; the original recording keeps its detail. For a selected range, the two boundary anchors retain their time and thrust so the edited section stays connected to the surrounding recording. For the entire profile, endpoint times stay fixed while their thrust remains editable. No measurement timestamp is inserted, deleted, or moved. Negative thrust is clipped to zero.

Point edits and adjustment-shape changes update the working profile immediately and participate in normal **Undo** and **Redo**. Saved anchor times, their edit range, and adjustment-shape choice are retained with the working profile. Reopening the tool uses the current recording as its starting data and reads each saved anchor's thrust from the current measurement at that time. This keeps subsequent edits local after a reload, project load, or noise operation. Other shape-changing edits clear the saved anchors.

Existing noise remains part of a point edit. Choose **Match noise after shaping** when you want to replace that variation with noise from a captured sample or unchanged neighbouring recording. Noise matching is a separate operation over the active edit scope. The result can deviate from individual anchors, as expected for noisy measurements.

## Saved settings

Tool values, display units, curve interpolation and initial anchor count, smoothing and noise options, noise-matching level, theory fitting targets and texture settings, theoretical overlay opacity, CSV export options, generator targets, and the last chosen panels are remembered on this device. Import mappings and units are stored independently for working and theoretical CSV files. These preferences are separate from the saved working profile.

The cache records the last values chosen by the user. Relative transform controls start at neutral values when reopening saved measurements or beginning a different editing operation: time shift is 0, width and gain are 100%, and offset is 0 N. This prevents the previous adjustment from being applied twice. Other cached choices, including shift fill mode and background level, anchor, edge transition, targets, units, and import mappings, remain available. **Reset controls** returns relative transform fields to neutral and updates the current transform accordingly.

Use **Saved settings → Reset saved settings** to restore control and import defaults. The active profile, theoretical curve, selection, undo history, and language remain available. Resetting settings does not regenerate, smooth, or otherwise change measurements. If browser storage is unavailable, settings remain available for the current session and the interface reports that they cannot be saved across reloads.

## Reuse noise from a recording

Open **Signal → Noise from recording** to extract measurement variation from an unchanged part of the current profile and apply it elsewhere.

1. Choose a **Baseline window** and select a source interval containing at least **7 unchanged samples**. Unchanged means that every selected thrust value still matches the original imported or generated profile on the same timestamp sequence.
2. Choose **Use selection as source**. Alternatively, select the target interval first and choose **Find unedited source**; with **Selection** as the edit scope, this finds the longest unchanged interval outside the target. With **Entire profile** as the edit scope, automatic detection searches the full profile. The studio subtracts a local linear moving-average baseline and removes the residual's time-weighted mean. The captured noise retains the source's relative timestamps, and the source card shows its range, sample count, and RMS amplitude in the selected display units.
3. After capture, select the destination interval or choose **Entire profile**. Set **Noise gain**: 100% uses the captured residual amplitude, while other values scale it proportionally.
4. Choose **Repeat at source rate** to reuse the source's timing, repeating it with softened cycle seams where necessary, or **Stretch to edit scope** to fit the complete captured pattern across the destination's duration. Enable **Recorded noise**. Its gain and timing controls then update the working curve immediately.

Recorded noise changes thrust only. Target timestamps remain exact, values outside the selected edit scope remain unchanged, and negative resulting thrust is clipped to zero. The operation can be undone. The captured noise sample is kept only for the current session; it is not included in project files or autosave. Applied noise is part of the working curve and is included when that curve is saved or exported.

### Match the surrounding noise

**Signal → Match noise** replaces existing high-frequency variation instead of adding another noise layer. Use **Match neighbouring data** to find the closest unchanged recording interval before or after the target. An automatic source needs at least seven unchanged measurements outside the target; the nearest available source contributes up to 200 samples. Alternatively, capture a reference first and choose **Match captured noise**. Both the source and the destination need at least seven measurements.

**Noise level** scales the captured variation, with 100% retaining its source amplitude. **Baseline window** separates the target's local trend from its existing residual. **Pattern timing** chooses source-rate repetition or stretching, and **Edge transition** blends a selected match into the untouched recording. Matching retains the local trend and all timestamps, clips negative output to zero, and reports the source, previous, and resulting residual RMS in the selected thrust unit. The reported result can differ from the source because of resampling, edge blending, baseline estimation, and clipping; it is a measurement of the result rather than a promise of identical statistics. Normal **Undo** restores the previous working values.

## Keyboard controls

**Focus mode** hides the reference library and lower panels to give the chart more room while keeping the inspector available. The inspector scrolls independently on desktop. Layer visibility controls are also available under **Theory** on smaller screens.

Shortcuts apply when the focus is outside form fields and dialogs.

| Shortcut | Action |
| --- | --- |
| V | Select a range |
| D | Draw thrust |
| C | Edit control points |
| G | Shift recorded thrust along the fixed timeline |
| M | Measure time and thrust |
| H | Pan view |
| F | Fit the full timeline and reset thrust to automatic scale |
| Wheel over chart | Zoom time |
| Shift + wheel over chart | Zoom thrust |
| Esc | Clear the range, selected point, and measuring markers |
| Left / Right | Move the cursor by the average sample interval |
| Shift + Left / Right | Move the cursor by ten average sample intervals |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y | Redo |
| Ctrl/Cmd + S | Open export |

## Application structure

The browser entry point starts the studio coordinator, which connects the project store, independent controllers, and view. Editing fields change the working profile immediately; source selection, importing, exporting, trimming, and opening a generated profile remain explicit commands.

| Module | Responsibility |
| --- | --- |
| `src/app.js`, `src/studio.js` | Startup, controller assembly, workspace navigation, and shared editing lifecycle |
| `src/project-store.js`, `src/studio-model.js` | Validated project state, grouped undo/redo, autosave, and separate interface state |
| `src/live-effects.js` | Recalculate a live operation from a stable starting curve instead of compounding each input event |
| `src/controllers/` | Event handling for curve points, transforms and signal effects, generation, selection, measuring cursors, samples, files, theory, units, and settings |
| `src/ui/layout.js`, `src/ui/inspector.js`, `src/ui/theory-fit.js`, `src/ui/generator.js`, `src/ui/dialogs.js`, `src/ui/zoom-controls.js` | Compose the initial interface directly from focused components |
| `src/ui/studio-view.js`, `src/chart.js`, `src/chart-measurements.js` | Render project facts, chart layers, selection, highlighted control points, and measuring rulers |
| `src/measurement.js`, `src/ui/measurement.js` | Read actual sample values and signed differences, and compose the ruler readout |
| `src/vertical-view.js` | Calculate automatic thrust ticks and bounded vertical zoom and pan without modifying profile data |
| `src/theory-fit.js`, `src/theory-fit-settings.js` | Coordinate burn-window, peak, impulse and shape fitting, and validate cached fit targets |
| `src/profile.js`, `src/control-curve.js`, `src/noise.js`, `src/noise-match.js`, `src/feather.js`, `src/alignment.js`, `src/units.js` | Numerical profile operations in canonical SI units |
| `src/csv.js`, `src/preferences.js`, `src/i18n.js` | File validation and serialization, device preferences, and English/Ukrainian interface text |
| `src/styles/` | Base controls, layout, charts, panels, workspaces, responsive rules, and live editing styles |

The numerical modules have no interface dependencies. Controllers route profile changes through the project store; view updates and preference caching do not reapply saved adjustments. Focused tests cover profile math, timestamp preservation, file validation, preference recovery, translations, history, and live operation baselines.

## Local development

Requires Node.js 22 or later. GitHub Actions uses Node.js 24. The application has no runtime package dependencies.

```sh
npm install
npm run dev
```

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

The production output is `dist/`. It contains only static assets. `typecheck` validates JavaScript syntax across application modules, scripts, and tests. The included example is available at `public/examples/example-profile.csv` and at `examples/example-profile.csv` in the built site.

## GitHub Pages deployment

The included `.github/workflows/deploy.yml` runs tests, builds the application, uploads `dist/`, and deploys it to GitHub Pages on pushes to `main`. It can also be started manually through GitHub Actions.

1. Push this repository to `defencore/thrust-lab` on GitHub.
2. Under **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
3. Set the custom domain to **thrustlab.defencore.com**.
4. At the DNS provider for `defencore.com`, create a CNAME record named `thrustlab` pointing to `defencore.github.io`.
5. Once domain validation and certificate issuance finish, enable **Enforce HTTPS** in GitHub Pages settings.

`public/CNAME` is copied to the production output. No server-side routing or runtime configuration is needed. The repository includes deployment preparation; DNS configuration and a completed GitHub Pages deployment are separate external steps.

## Synthetic export marker and analyzer

User downloads of CSV and project JSON include a ten-record, near-zero numerical marker before the first profile measurement. Every actual measurement and its timestamp is retained. Marker times precede the original timeline and may be negative; no real sample is overwritten. Marker thrust stays below 0.0000001 N, and its precision is retained even when fewer thrust decimals are selected for the profile.

The importer recognizes the complete `thrust-lab-v1` pattern and removes its ten service records before loading the profile. They never enter the editor chart, sample table, overview, burn metrics, original recording, or internal autosave/history. Importing and saving again produces one marker prefix, rather than accumulating markers.

Use the top **Analyzer** tab to inspect a CSV or project JSON without changing the editor or generator. CSV column mapping, headers, and units can be corrected directly in the analyzer. Results distinguish a recognized marker, no recognized marker, and an invalid file. The check identifies the Thrust Lab synthetic marker; it is not a cryptographic origin or integrity check, and absence of the marker does not establish that data was measured. All inspection stays in the browser.

## Data formats

```csv
Time (s),Thrust (N)
0,0
0.01,12.5
0.02,0
```

Project files use a validated `version: 1` JSON schema with `name`, `points`, `theory`, `selection`, edit `scope`, and `showTheory` / `showOriginal` layer visibility, plus optional `original`, `generator`, and `curveEdit` fields. `curveEdit` is `null` when there is no saved anchor edit; otherwise it stores `{ "nodes": [{ "time": 0.01, "thrust": 12.5 }, ...], "range": null, "interpolation": "smooth" }`. It accepts 2–128 ordered anchors at existing measurement times, a valid optional edit range, and `smooth` or `linear` interpolation. All metadata remains in canonical SI units. Files that omit edit scope infer it from the selected range; omitted layer visibility defaults to theory shown and original hidden. Each sample is `{ "time": 0.01, "thrust": 12.5 }`. Invalid files are rejected with an actionable message; malformed numeric rows are not silently removed.

CSV headers can identify units using parentheses, brackets, or suffixes such as `time_ms,thrust_kN`. Explicit unsupported labels, such as `Time(min)` or `Thrust(mN)`, require choosing supported units manually. Headerless files are supported. When arbitrary text is inferred as a header, the importer warns that the first row was treated as column names; review the preview before importing. For programmatic use, `inspectCSV` and `parseCSV` accept `hasHeader: true` or `hasHeader: false` to remove this ambiguity.
