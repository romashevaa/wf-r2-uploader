# WebFolks File Uploader — Front-end Reference

A drop-in file uploader for Webflow (or any HTML page) that signs an upload URL with your Cloudflare R2 worker and PUTs the file directly to R2.

Two files only:

- `wf-uploader.js`
- `wf-uploader.css`

Drop both into a Webflow custom-code embed (or `<head>` site-wide) and add `upload="file"` to any element to turn it into an uploader.

---

## Quick start

```html
<link rel="stylesheet" href="https://your-cdn/wf-uploader.css">
<script defer src="https://your-cdn/wf-uploader.js"></script>

<form>
  <div upload="file"
       data-wf-up-variant="dropzone"
       data-wf-up-endpoint="https://r2-uploader-worker.example.workers.dev/sign"
       data-wf-up-accept="image"
       data-wf-up-max-size-mb="5">
  </div>

  <button type="submit">Send</button>
</form>
```

When the user drops a file, it uploads to R2 and the public URL is written into a hidden `<input name="uploaded_files">` so it goes through with the form.

---

## Layouts

Pick **one** layout per uploader. Behavior is configured separately via attributes.

| `data-wf-up-variant` | What it looks like |
|---|---|
| `button` | Compact icon + button trigger. No drop area. |
| `dropzone` | Full drop area, single file or grouped files inside. |
| `list` | Drop area with a list of uploaded files (rows or grid). |
| `table` | Tabular file manager with name / type / size / actions. |

Each layout has sub-options (see below). Behavior attributes (`accept`, `multiple`, `max-files`, etc.) work on all of them.

---

## Behavior attributes

These work on **any** layout.

| Attribute | Default | Description |
|---|---|---|
| `data-wf-up-endpoint` | _(required)_ | Worker URL that returns a signed upload URL. |
| `data-wf-up-accept` | `any` | `image` / `document` / `media` / `video` / `audio` / `any`, or a raw MIME / extension list (e.g. `image/png,.pdf`). |
| `data-wf-up-multiple` | depends on layout | `true` / `false`. |
| `data-wf-up-max-files` | depends on layout | Max files in the list. |
| `data-wf-up-max-size-mb` | depends on layout | Per-file size limit. |
| `data-wf-up-folder` | `uploads` | R2 key prefix, passed to the worker. |
| `data-wf-up-field-name` | `uploaded_files` | Hidden input `name` for form submission. |
| `data-wf-up-output-format` | `json` | `json` / `urls` / `keys`. Format of the hidden input value. |
| `data-wf-up-auto-upload` | `true` | Upload as soon as a file is added (vs wait for an external trigger). |
| `data-wf-up-allow-remove` | `true` | Show the per-file remove button. |
| `data-wf-up-required` | `false` | Block form submit if no file uploaded. |
| `data-wf-up-preview` | auto for `accept="image"` | Show image thumbnails when applicable. |

### Accept presets

| Preset | Resolves to |
|---|---|
| `image` | `image/svg+xml,image/png,image/jpeg,image/gif,image/webp` |
| `document` | `.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv` |
| `media` | `image/*,video/*,audio/*` |
| `video` | `video/*` |
| `audio` | `audio/*` |
| `any` | _(no restriction)_ |

You can always pass a raw MIME / extension list instead of a preset.

---

## Layout sub-options

### `button`

| Attribute | Values | Default |
|---|---|---|
| `data-wf-up-shape` | `square` / `circle` | `square` |

### `dropzone`

| Attribute | Values | Default |
|---|---|---|
| `data-wf-up-size` | `large` / `compact` | `large` |

### `list`

| Attribute | Values | Default |
|---|---|---|
| `data-wf-up-list-style` | `rows` / `grid` | `rows` |

### `table`

No sub-options.

---

## Visibility toggles

Hide pieces of the empty state per uploader.

| Attribute | Default | Hides when `false` |
|---|---|---|
| `data-wf-up-show-icon` | `true` | The big icon |
| `data-wf-up-show-title` | `true` | The title text |
| `data-wf-up-show-description` | `true` | The description text |
| `data-wf-up-show-helper` | `true` | The helper line under description |
| `data-wf-up-show-button` | `true` | The "Select file" action button |

---

## Text overrides

All UI strings can be overridden. Useful for translation or rebranding.

| Attribute | Used in |
|---|---|
| `data-wf-up-title` | Empty state heading |
| `data-wf-up-description` | Empty state body |
| `data-wf-up-helper-text` | Empty state helper line |
| `data-wf-up-button-text` | Main CTA button |
| `data-wf-up-add-more-text` | "Add more" footer button (list layout) |
| `data-wf-up-add-files-text` | "Add files" header button (table layout) |
| `data-wf-up-remove-text` | aria-label for per-file remove |
| `data-wf-up-remove-all-text` | "Remove all" button label |
| `data-wf-up-empty-text` | Table empty-state cell |
| `data-wf-up-uploading-text` | Status while uploading |
| `data-wf-up-preparing-text` | Status while signing the URL |
| `data-wf-up-waiting-text` | Status before upload starts |
| `data-wf-up-success-text` | Status when uploaded |
| `data-wf-up-error-text` | Generic upload error |
| `data-wf-up-required-text` | Validation message when required |

---

## Icons

Each role accepts a **preset name**, **URL**, or **inline SVG/HTML**. The form is auto-detected from the value.

| Attribute | Affects |
|---|---|
| `data-wf-up-icon` | Default empty-state icon (when role has no override) |
| `data-wf-up-icon-upload` | Upload action button, avatar |
| `data-wf-up-icon-image` | Image empty-state icon |
| `data-wf-up-icon-file` | File-type icons in rows / table |
| `data-wf-up-icon-remove` | Per-file X button |
| `data-wf-up-icon-remove-all` | "Remove all" trash button |

### Built-in presets

`upload`, `avatar`, `image`, `image-up`, `file`, `archive`, `audio`, `x`, `trash`

### Examples

```html
<!-- Use a different built-in preset -->
<div upload="file" data-wf-up-icon-upload="image-up">

<!-- External URL -->
<div upload="file" data-wf-up-icon-upload="https://cdn.example.com/upload.svg">

<!-- Inline SVG -->
<div upload="file"
     data-wf-up-icon-upload='<svg viewBox="0 0 24 24"><path d="..."/></svg>'>
```

---

## Theming (CSS custom properties)

Override on the `.wf-up` element or any ancestor.

| Token | Purpose |
|---|---|
| `--wf-up-fg` | Text & icon color |
| `--wf-up-muted` | Secondary text |
| `--wf-up-muted-weak` | Tertiary text |
| `--wf-up-border` | Drop area & button border |
| `--wf-up-border-strong` | Border on focus / hover-strong |
| `--wf-up-accent` | Hover / dragging tint |
| `--wf-up-accent-strong` | Reserved |
| `--wf-up-surface` | Panel background |
| `--wf-up-primary-bg` | Floating remove badge background |
| `--wf-up-primary-fg` | Floating remove badge color |
| `--wf-up-error` | Error text |
| `--wf-up-success` | Success text |
| `--wf-up-radius` | Buttons / file rows radius |
| `--wf-up-radius-lg` | Drop area radius |
| `--wf-up-ring` | Focus ring color |
| `--wf-up-shadow-xs` | Button shadow |
| `--wf-up-transition` | Shared transition timing |
| `--wf-up-floating-remove-ring` | Outline color of the floating remove badge |

```css
.wf-up { --wf-up-accent: #fff5eb; --wf-up-radius: 4px; }
```

---

## Form integration

Each uploader writes its result into a hidden `<input>` so the form posts naturally.

| `data-wf-up-output-format` | Hidden input value |
|---|---|
| `json` _(default)_ | `[{"url":"...","key":"...","name":"...","size":...,"type":"..."}]` |
| `urls` | comma-separated public URLs |
| `keys` | comma-separated R2 keys |

Customize the field name with `data-wf-up-field-name`. Required uploads block submit until at least one file finishes.

---

## External controls

Trigger an uploader from another element (e.g. a Webflow button somewhere else on the page):

```html
<div id="my-uploader" upload="file" data-wf-up-variant="dropzone" ...></div>

<button data-wf-up-trigger data-wf-up-target="#my-uploader">Add file</button>
<button data-wf-up-reset data-wf-up-target="#my-uploader">Reset</button>
```

`data-wf-up-reset` without a target resets all uploaders on the page.

---

## JavaScript API

Each initialized uploader exposes:

```js
var root = document.querySelector('[upload="file"]');

root.__wfUpload.open();        // open the file picker
root.__wfUpload.reset();       // clear all files
root.__wfUpload.getFiles();    // [{ url, key, name, size, type }, ...]
```

Re-init after dynamically inserting uploaders:

```js
WebflowUploader.init();
```

---

## Events

All events bubble from the uploader root with `detail`:

| Event | `detail` |
|---|---|
| `wf-up:ready` | `{ files }` |
| `wf-up:file-added` | `{ file, files }` |
| `wf-up:file-removed` | `{ file, files }` |
| `wf-up:upload-start` | `{ file, files }` |
| `wf-up:upload-progress` | `{ file, progress, files }` |
| `wf-up:upload-success` | `{ file, files }` |
| `wf-up:upload-error` | `{ error, file, files }` |
| `wf-up:reset` | `{ files: [] }` |
| `wf-up:change` | `{ files }` _(fired after add / remove / success)_ |

```js
root.addEventListener('wf-up:upload-success', function (e) {
  console.log(e.detail.file.url);
});
```

---

## Backwards compatibility

The old 8-variant names still work as aliases. They route to the new layout + sub-options automatically.

| Old `data-wf-up-variant` | Now resolves to |
|---|---|
| `image-button` | `button` + `accept=image` |
| `avatar` | `button` + `shape=circle` + `accept=image` |
| `image-single` | `dropzone` + `accept=image` + `preview=true` |
| `image-list` | `list` + `accept=image` + `preview=true` |
| `image-grid` | `list` + `list-style=grid` + `accept=image` + `preview=true` |
| `file-single` | `dropzone` + `size=compact` |
| `file-list` | `list` (rows) |
| `file-table` | `table` |

Existing embeds keep working unchanged. New embeds should prefer the explicit layout + attribute API.

---

## Recipe collection

### Avatar uploader (round, 1 image)
```html
<div upload="file"
     data-wf-up-variant="button"
     data-wf-up-shape="circle"
     data-wf-up-accept="image"
     data-wf-up-max-size-mb="2"
     data-wf-up-endpoint="...">
</div>
```

### PDF-only document uploader, multiple
```html
<div upload="file"
     data-wf-up-variant="list"
     data-wf-up-accept=".pdf"
     data-wf-up-multiple="true"
     data-wf-up-max-files="5"
     data-wf-up-endpoint="...">
</div>
```

### Image gallery (grid of thumbs)
```html
<div upload="file"
     data-wf-up-variant="list"
     data-wf-up-list-style="grid"
     data-wf-up-accept="image"
     data-wf-up-multiple="true"
     data-wf-up-max-files="20"
     data-wf-up-endpoint="...">
</div>
```

### Compact single-file picker, no description
```html
<div upload="file"
     data-wf-up-variant="dropzone"
     data-wf-up-size="compact"
     data-wf-up-show-description="false"
     data-wf-up-show-helper="false"
     data-wf-up-endpoint="...">
</div>
```

### Mixed media file manager (table)
```html
<div upload="file"
     data-wf-up-variant="table"
     data-wf-up-accept="any"
     data-wf-up-multiple="true"
     data-wf-up-max-files="50"
     data-wf-up-max-size-mb="200"
     data-wf-up-endpoint="...">
</div>
```
