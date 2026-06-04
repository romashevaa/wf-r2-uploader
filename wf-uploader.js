(function () {
  "use strict";

  var ROOT_SELECTOR = '[upload="file"]';

  /* The only real "variants" are layouts. Behavior is driven by attributes. */
  var LAYOUTS = {
    button: renderButton,
    dropzone: renderDropzone,
    list: renderList,
    table: renderTable,
  };

  var LAYOUT_DEFAULTS = {
    button: {
      title: "",
      buttonText: "Upload",
      multiple: false,
      maxFiles: 1,
      maxSizeMb: 5,
      accept: "any",
      shape: "square",
      icon: "avatar",
    },
    dropzone: {
      title: "Drop your file here",
      description: "Drag & drop or click to browse",
      buttonText: "Select file",
      multiple: false,
      maxFiles: 1,
      maxSizeMb: 10,
      accept: "any",
      size: "large",
      icon: "upload",
    },
    list: {
      title: "Drop your files here",
      description: "Drag & drop or click to browse",
      buttonText: "Select files",
      addMoreText: "Add more",
      removeAllText: "Remove all",
      multiple: true,
      maxFiles: 10,
      maxSizeMb: 100,
      accept: "any",
      listStyle: "rows",
      icon: "upload",
    },
    table: {
      title: "Files",
      buttonText: "Add files",
      addFilesText: "Add files",
      removeAllText: "Remove all",
      multiple: true,
      maxFiles: 10,
      maxSizeMb: 100,
      accept: "any",
      icon: "file",
    },
  };

  /* Friendly names for `data-wf-up-accept`. Anything not in this map is */
  /* passed through as a raw MIME / extension list. */
  var ACCEPT_PRESETS = {
    image: "image/svg+xml,image/png,image/jpeg,image/gif,image/webp",
    document: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv",
    media: "image/*,video/*,audio/*",
    video: "video/*",
    audio: "audio/*",
    any: "",
  };

  /* Backwards-compatible aliases for the old 8-variant API. */
  /* Values are either another alias key (string) or a config patch (object). */
  var VARIANT_MIGRATIONS = {
    "image-button": { variant: "button", accept: "image", multiple: false, shape: "square", icon: "avatar" },
    avatar:         { variant: "button", accept: "image", multiple: false, shape: "circle", icon: "avatar" },

    "image-single": { variant: "dropzone", accept: "image", multiple: false, size: "large",   icon: "image-up", preview: true,
                      title: "Drop your image here", description: "SVG, PNG, JPG or GIF (max. 2MB)", buttonText: "Select image", maxSizeMb: 2 },
    "image-list":   { variant: "list",     accept: "image", multiple: true,  listStyle: "rows", icon: "image", preview: true,
                      title: "Drop your images here", description: "SVG, PNG, JPG or GIF (max. 5MB)", buttonText: "Select images", maxSizeMb: 5 },
    "image-grid":   { variant: "list",     accept: "image", multiple: true,  listStyle: "grid", icon: "image", preview: true,
                      title: "Drop your images here", description: "SVG, PNG, JPG or GIF (max. 5MB)", buttonText: "Select images", maxSizeMb: 5 },

    "file-single":  { variant: "dropzone", accept: "any", multiple: false, size: "compact", icon: "file",
                      title: "Upload file", description: "Drag & drop or click to browse (max. 10MB)", buttonText: "Upload file" },
    "file-list":    { variant: "list",     accept: "any", multiple: true,  listStyle: "rows", icon: "upload",
                      title: "Upload files", description: "Drag & drop or click to browse",
                      helperText: "All files ∙ Max 10 files ∙ Up to 100MB", buttonText: "Add files" },
    "file-table":   { variant: "table",    accept: "any", multiple: true,  icon: "file" },

    /* Older aliases that resolve through the chain. */
    minimal:            "image-button",
    "image-dropzone":   "image-list",
    "file-card":        "file-single",
    "file-dropzone":    "file-list",
    "file-list-inside": "file-list",
    "progress-list":    "file-list",
    "file-progress":    "file-list",
  };

  function initAllUploaders() {
    document.querySelectorAll(ROOT_SELECTOR).forEach(initUploader);
  }

  function initUploader(root) {
    if (!root || root.__wfUploadInitialized) return;

    var config = readConfig(root);

    var state = {
      root: root,
      config: config,
      files: [],
      error: "",
      input: null,
      output: null,
      view: null,
    };

    root.__wfUploadInitialized = true;
    root.__wfUploadState = state;

    root.classList.add("wf-up");
    root.classList.add("wf-up--" + config.variant);
    root.setAttribute("data-wf-up-ready", "true");
    root.setAttribute("data-wf-up-layout", config.variant);
    if (config.shape) root.setAttribute("data-wf-up-shape", config.shape);
    if (config.size) root.setAttribute("data-wf-up-size", config.size);
    if (config.listStyle) root.setAttribute("data-wf-up-list-style", config.listStyle);
    if (config.preview) root.setAttribute("data-wf-up-preview", "true");
    if (config.acceptPreset) root.setAttribute("data-wf-up-accept-preset", config.acceptPreset);

    root.innerHTML =
      '<input class="wf-up__native-input" type="file" hidden data-wf-up-native-input aria-label="' +
      escapeAttr(config.buttonText || "Choose files") +
      '">' +
      '<input type="hidden" name="' +
      escapeAttr(config.fieldName) +
      '" data-wf-up-output>' +
      '<div class="wf-up__view" data-wf-up-view aria-live="polite" aria-atomic="false"></div>';

    state.input = root.querySelector("[data-wf-up-native-input]");
    state.output = root.querySelector("[data-wf-up-output]");
    state.view = root.querySelector("[data-wf-up-view]");

    syncNativeInput(state);

    state.input.addEventListener("change", function () {
      addFiles(Array.prototype.slice.call(state.input.files || []), state);
      state.input.value = "";
    });

    root.__wfUpload = {
      open: function () {
        state.input.click();
      },
      reset: function () {
        resetUploader(state);
      },
      getFiles: function () {
        return getUploadedFiles(state);
      },
    };

    bindFormGuards(state);
    render(state);

    dispatch(root, "wf-up:ready", { files: [] });
  }

  function readConfig(root) {
    var resolved = resolveVariant(attr(root, "data-wf-up-variant", "list"));
    var variant = resolved.variant;
    var defaults = LAYOUT_DEFAULTS[variant] || {};
    var migration = resolved.migration || {};

    function pick(key) {
      return migration[key] !== undefined ? migration[key] : defaults[key];
    }

    var maxFiles = numberAttr(root, "data-wf-up-max-files", pick("maxFiles") || 1);
    var maxSizeMb = numberAttr(root, "data-wf-up-max-size-mb", pick("maxSizeMb") || 10);

    var rawAccept = attr(root, "data-wf-up-accept", pick("accept") || "any");
    var resolvedAccept = ACCEPT_PRESETS[rawAccept] !== undefined
      ? ACCEPT_PRESETS[rawAccept]
      : rawAccept;
    var acceptPreset = ACCEPT_PRESETS[rawAccept] !== undefined ? rawAccept : "";

    return {
      endpoint: attr(root, "data-wf-up-endpoint", ""),
      variant: variant,

      title: attr(root, "data-wf-up-title", pick("title") || ""),
      description: attr(root, "data-wf-up-description", pick("description") || ""),
      helperText: attr(root, "data-wf-up-helper-text", pick("helperText") || ""),
      buttonText: attr(root, "data-wf-up-button-text", pick("buttonText") || "Add files"),

      addMoreText: attr(root, "data-wf-up-add-more-text", pick("addMoreText") || "Add more"),
      addFilesText: attr(root, "data-wf-up-add-files-text", pick("addFilesText") || "Add files"),
      removeText: attr(root, "data-wf-up-remove-text", "Remove"),
      removeAllText: attr(root, "data-wf-up-remove-all-text", pick("removeAllText") || "Remove all"),
      emptyText: attr(root, "data-wf-up-empty-text", "No file chosen"),

      uploadingText: attr(root, "data-wf-up-uploading-text", "Uploading"),
      preparingText: attr(root, "data-wf-up-preparing-text", "Preparing"),
      waitingText: attr(root, "data-wf-up-waiting-text", "Waiting"),
      successText: attr(root, "data-wf-up-success-text", "Uploaded"),
      errorText: attr(root, "data-wf-up-error-text", "Something went wrong. Please try again."),
      requiredText: attr(root, "data-wf-up-required-text", "Please upload a file."),
      submittingText: attr(
        root,
        "data-wf-up-submitting-text",
        "Please wait for the upload to finish."
      ),
      blockSubmitWhileUploading: boolAttr(
        root,
        "data-wf-up-block-submit-while-uploading",
        true
      ),
      retryText: attr(root, "data-wf-up-retry-text", "Retry upload"),
      concurrency: Math.max(
        1,
        numberAttr(root, "data-wf-up-concurrency", 3)
      ),

      accept: resolvedAccept,
      acceptPreset: acceptPreset,
      maxSizeMb: maxSizeMb,
      maxFiles: maxFiles,
      multiple: boolAttr(
        root,
        "data-wf-up-multiple",
        migration.multiple !== undefined
          ? migration.multiple
          : defaults.multiple !== undefined
          ? defaults.multiple
          : maxFiles > 1
      ),

      /* Layout sub-options */
      shape: attr(root, "data-wf-up-shape", pick("shape") || ""),
      size: attr(root, "data-wf-up-size", pick("size") || ""),
      listStyle: attr(root, "data-wf-up-list-style", pick("listStyle") || ""),
      preview: boolAttr(
        root,
        "data-wf-up-preview",
        migration.preview !== undefined
          ? migration.preview
          : acceptPreset === "image" || acceptPreset === "media"
      ),
      icon: attr(root, "data-wf-up-icon", pick("icon") || "upload"),

      folder: attr(root, "data-wf-up-folder", "uploads"),
      fieldName: attr(root, "data-wf-up-field-name", "uploaded_files"),
      outputFormat: attr(root, "data-wf-up-output-format", "json"),

      autoUpload: boolAttr(root, "data-wf-up-auto-upload", true),
      allowRemove: boolAttr(root, "data-wf-up-allow-remove", true),
      required: boolAttr(root, "data-wf-up-required", false),

      /* Visibility toggles for empty-state pieces */
      showIcon: boolAttr(root, "data-wf-up-show-icon", true),
      showTitle: boolAttr(root, "data-wf-up-show-title", true),
      showDescription: boolAttr(root, "data-wf-up-show-description", true),
      showHelper: boolAttr(root, "data-wf-up-show-helper", true),
      showButton: boolAttr(root, "data-wf-up-show-button", true),

      /* Per-role icon overrides. Each accepts: preset name, URL, or inline SVG/HTML */
      iconUpload: attr(root, "data-wf-up-icon-upload", ""),
      iconFile: attr(root, "data-wf-up-icon-file", ""),
      iconImage: attr(root, "data-wf-up-icon-image", ""),
      iconRemove: attr(root, "data-wf-up-icon-remove", ""),
      iconRemoveAll: attr(root, "data-wf-up-icon-remove-all", ""),
      iconRetry: attr(root, "data-wf-up-icon-retry", ""),
    };
  }

  /* Walk the migration chain. A value can be another alias key (string) or */
  /* a config patch object whose `variant` is a real layout name. */
  function resolveVariant(rawValue) {
    var value = rawValue || "";
    var migration = null;
    var seen = {};

    while (VARIANT_MIGRATIONS[value] !== undefined && !seen[value]) {
      seen[value] = true;
      var entry = VARIANT_MIGRATIONS[value];

      if (typeof entry === "string") {
        value = entry;
        continue;
      }

      migration = entry;
      value = entry.variant;
      break;
    }

    if (!LAYOUTS[value]) value = "list";

    return { variant: value, migration: migration };
  }

  function render(state) {
    if (!state.view) return;

    var renderer = LAYOUTS[state.config.variant] || renderList;

    state.view.innerHTML = renderer(state);

    bindRenderedActions(state);
    updateOutput(state);
    updateErrorBar(state);
  }

  /* Surgical per-row update. Avoids rebuilding the whole component DOM */
  /* on every progress tick (the original code path called render()    */
  /* hundreds of times per upload, killing focus / selection / perf).  */
  /* Falls back to full render() if the row isn't in the DOM yet —     */
  /* this can happen when the layout switches between empty / list /   */
  /* preview shells based on file count.                                */
  function updateRecord(state, record) {
    if (!state.view || !record) return;

    /* A single record can appear twice in some layouts (e.g. dropzone */
    /* preview = big image + summary line below). Update all of them.  */
    var rows = state.view.querySelectorAll(
      '[data-wf-up-row-id="' + cssEscape(record.id) + '"]'
    );

    if (!rows.length) {
      render(state);
      return;
    }

    var c = state.config;
    var statusText = renderStatus(record, c);
    var metaText = renderRowMeta(record, c);

    rows.forEach(function (row) {
      row.setAttribute("data-wf-up-row-status", record.status || "pending");
      row.setAttribute("data-wf-up-row-progress", record.progress || 0);

      var statusEl = row.querySelector("[data-wf-up-status]");
      if (!statusEl) return;

      if (statusEl.classList.contains("wf-up__file-meta")) {
        statusEl.innerHTML = metaText;
      } else {
        statusEl.innerHTML = statusText;
      }
    });

    updateOutput(state);
  }

  /* Surgical error-bar update. Lets the component show/hide its error */
  /* line without re-rendering everything.                              */
  function updateErrorBar(state) {
    if (!state.view) return;

    var existing = state.view.querySelector("[data-wf-up-error-bar]");

    if (state.error) {
      if (existing) {
        existing.textContent = state.error;
        existing.hidden = false;
      } else {
        /* No bar in the current shell — full render to insert it. */
        var bar = document.createElement("div");
        bar.className = "wf-up__error";
        bar.setAttribute("data-wf-up-error-bar", "");
        bar.textContent = state.error;
        var component = state.view.querySelector(".wf-up__component");
        (component || state.view).appendChild(bar);
      }
    } else if (existing) {
      existing.textContent = "";
      existing.hidden = true;
    }
  }

  /* CSS.escape() polyfill for IDs we generated ourselves (alnum + _). */
  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(String(value));
    }
    return String(value).replace(/([^\w-])/g, "\\$1");
  }

  function bindRenderedActions(state) {
    state.view.querySelectorAll("[data-wf-up-action]").forEach(function (el) {
      var action = el.getAttribute("data-wf-up-action");

      if (el.tagName === "BUTTON" && !el.getAttribute("type")) {
        el.setAttribute("type", "button");
      }

      el.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (action === "open") {
          state.input.click();
          return;
        }

        if (action === "remove-all") {
          resetUploader(state);
          return;
        }

        if (action === "remove") {
          removeFile(state, el.getAttribute("data-wf-up-id"));
          return;
        }

        if (action === "retry") {
          retryFile(state, el.getAttribute("data-wf-up-id"));
        }
      });
    });

    state.view.querySelectorAll("[data-wf-up-dropzone]").forEach(function (zone) {
      /* A11y: make the drop area keyboard-accessible */
      if (!zone.getAttribute("tabindex")) zone.setAttribute("tabindex", "0");
      zone.setAttribute("role", "button");
      zone.setAttribute("aria-label", state.config.buttonText || "Choose files");

      zone.addEventListener("click", function (event) {
        if (event.target.closest && event.target.closest("[data-wf-up-action]")) {
          return;
        }

        state.input.click();
      });

      zone.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (event.target.closest && event.target.closest("[data-wf-up-action]")) return;
          state.input.click();
        }
      });

      zone.addEventListener("dragover", function (event) {
        event.preventDefault();
        state.root.classList.add("is-dragging");
        zone.setAttribute("data-dragging", "true");
      });

      zone.addEventListener("dragleave", function () {
        state.root.classList.remove("is-dragging");
        zone.removeAttribute("data-dragging");
      });

      zone.addEventListener("drop", function (event) {
        event.preventDefault();
        state.root.classList.remove("is-dragging");
        zone.removeAttribute("data-dragging");

        addFiles(Array.prototype.slice.call(event.dataTransfer.files || []), state);
      });
    });
  }

  function syncNativeInput(state) {
    if (state.config.multiple) {
      state.input.setAttribute("multiple", "multiple");
    } else {
      state.input.removeAttribute("multiple");
    }

    if (state.config.accept) {
      state.input.setAttribute("accept", state.config.accept);
    } else {
      state.input.removeAttribute("accept");
    }
  }

  function addFiles(files, state) {
    clearError(state);

    if (!files.length) return;

    var availableSlots = state.config.maxFiles - state.files.length;

    if (availableSlots <= 0) {
      setError(state, "You can upload up to " + state.config.maxFiles + " file(s).");
      render(state);
      return;
    }

    var selectedFiles = state.config.multiple ? files : files.slice(0, 1);

    if (selectedFiles.length > availableSlots) {
      setError(state, "You can upload up to " + state.config.maxFiles + " file(s).");
      render(state);
      return;
    }

    var addedRecords = [];

    selectedFiles.forEach(function (file) {
      var error = validateFile(file, state.config);

      if (error) {
        setError(state, error);
        return;
      }

      var record = createFileRecord(file);
      state.files.push(record);
      addedRecords.push(record);

      dispatch(state.root, "wf-up:file-added", {
        file: recordToPublicFile(record),
        files: getUploadedFiles(state),
      });
    });

    render(state);

    if (state.config.autoUpload) {
      runUploadQueue(state);
    }
  }

  /* Concurrency-bounded queue. Starts pending records up to the configured */
  /* concurrency limit; each finished record triggers the next.             */
  function runUploadQueue(state) {
    var limit = Math.max(1, state.config.concurrency || 1);
    var inFlight = 0;

    for (var i = 0; i < state.files.length; i++) {
      var s = state.files[i].status;
      if (s === "signing" || s === "uploading") inFlight++;
    }

    for (var j = 0; j < state.files.length && inFlight < limit; j++) {
      var rec = state.files[j];
      if (rec.status !== "pending") continue;

      inFlight++;
      uploadRecord(rec, state).then(function () {
        runUploadQueue(state);
      });
    }
  }

  /* Show a summary in the global error bar when any files have failed. */
  /* Clears the bar if no files are in error state.                     */
  function summarizeErrors(state) {
    var errored = 0;
    for (var i = 0; i < state.files.length; i++) {
      if (state.files[i].status === "error") errored++;
    }

    if (errored === 0) {
      clearError(state);
    } else if (errored === 1) {
      var rec = state.files.find(function (f) { return f.status === "error"; });
      setError(state, rec ? rec.error : state.config.errorText);
    } else {
      setError(state, errored + " file(s) failed to upload.");
    }

    updateErrorBar(state);
  }

  function createFileRecord(file) {
    return {
      id: uniqueId(),
      file: file,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      status: "pending",
      progress: 0,
      error: "",
      key: "",
      publicUrl: "",
      previewUrl: isImage(file) ? URL.createObjectURL(file) : "",
    };
  }

  async function uploadRecord(record, state) {
    try {
      record.status = "signing";
      record.progress = 0;
      updateRecord(state, record);

      var signed = await getSignedUploadUrl(record.file, state.config);

      record.status = "uploading";
      record.progress = 0;
      updateRecord(state, record);

      dispatch(state.root, "wf-up:upload-start", {
        file: recordToPublicFile(record),
        files: getUploadedFiles(state),
      });

      await uploadToR2(record.file, signed.uploadUrl, function (percent) {
        record.progress = percent;
        updateRecord(state, record);

        dispatch(state.root, "wf-up:upload-progress", {
          file: recordToPublicFile(record),
          progress: percent,
          files: getUploadedFiles(state),
        });
      });

      record.status = "uploaded";
      record.progress = 100;
      record.key = signed.key || "";
      record.publicUrl = signed.publicUrl || "";

      clearError(state);
      updateErrorBar(state);
      updateRecord(state, record);

      dispatch(state.root, "wf-up:upload-success", {
        file: recordToPublicFile(record),
        files: getUploadedFiles(state),
      });

      dispatch(state.root, "wf-up:change", {
        files: getUploadedFiles(state),
      });
    } catch (error) {
      record.status = "error";
      record.error = error && error.message ? error.message : state.config.errorText;

      updateRecord(state, record);
      summarizeErrors(state);

      dispatch(state.root, "wf-up:upload-error", {
        error: error,
        file: recordToPublicFile(record),
        files: getUploadedFiles(state),
      });
    }
  }

  async function getSignedUploadUrl(file, config) {
    if (!config.endpoint) {
      throw new Error("Missing data-wf-up-endpoint.");
    }

    var response = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        folder: config.folder,
      }),
    });

    var data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(data.error || "Could not create upload URL.");
    }

    return data;
  }

  function uploadToR2(file, uploadUrl, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();

      xhr.open("PUT", uploadUrl);

      if (file.type) {
        xhr.setRequestHeader("Content-Type", file.type);
      }

      xhr.upload.onprogress = function (event) {
        if (!event.lengthComputable) return;

        var percent = Math.round((event.loaded / event.total) * 100);

        if (typeof onProgress === "function") {
          onProgress(percent);
        }
      };

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error("Upload failed with status " + xhr.status + "."));
        }
      };

      xhr.onerror = function () {
        reject(new Error("Network error during upload."));
      };

      xhr.send(file);
    });
  }

  function validateFile(file, config) {
    var maxBytes = config.maxSizeMb * 1024 * 1024;

    if (file.size > maxBytes) {
      return file.name + " is too large. Max size is " + config.maxSizeMb + "MB.";
    }

    if (config.accept && !matchesAccept(file, config.accept)) {
      return file.name + " is not an allowed file type.";
    }

    return "";
  }

  function matchesAccept(file, accept) {
    var rules = accept
      .split(",")
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);

    if (!rules.length) return true;

    return rules.some(function (rule) {
      if (rule.endsWith("/*")) {
        var base = rule.replace("/*", "");
        return file.type.indexOf(base + "/") === 0;
      }

      if (rule.charAt(0) === ".") {
        return file.name.toLowerCase().endsWith(rule.toLowerCase());
      }

      return file.type === rule;
    });
  }

  function retryFile(state, id) {
    var record = null;
    for (var i = 0; i < state.files.length; i++) {
      if (state.files[i].id === id) { record = state.files[i]; break; }
    }

    if (!record || record.status !== "error") return;

    record.status = "pending";
    record.progress = 0;
    record.error = "";

    summarizeErrors(state);
    updateRecord(state, record);
    runUploadQueue(state);
  }

  function removeFile(state, id) {
    var index = state.files.findIndex(function (file) {
      return file.id === id;
    });

    if (index === -1) return;

    var removed = state.files[index];

    if (removed.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }

    state.files.splice(index, 1);

    clearError(state);
    render(state);

    /* A11y: move focus to the next logical element after removal. */
    var nextRow = state.view.querySelector("[data-wf-up-row-id]");
    if (nextRow) {
      var btn = nextRow.querySelector("[data-wf-up-action]");
      if (btn) btn.focus();
    } else {
      var zone = state.view.querySelector("[data-wf-up-dropzone]");
      if (zone) zone.focus();
    }

    dispatch(state.root, "wf-up:file-removed", {
      file: recordToPublicFile(removed),
      files: getUploadedFiles(state),
    });

    dispatch(state.root, "wf-up:change", {
      files: getUploadedFiles(state),
    });
  }

  function resetUploader(state) {
    state.files.forEach(function (record) {
      if (record.previewUrl) {
        URL.revokeObjectURL(record.previewUrl);
      }
    });

    state.files = [];
    state.error = "";

    render(state);

    dispatch(state.root, "wf-up:reset", { files: [] });
    dispatch(state.root, "wf-up:change", { files: [] });
  }

  function updateOutput(state) {
    if (!state.output) return;

    var uploaded = getUploadedFiles(state);

    if (state.config.outputFormat === "urls") {
      state.output.value = uploaded
        .map(function (file) {
          return file.url;
        })
        .filter(Boolean)
        .join(",");

      return;
    }

    if (state.config.outputFormat === "keys") {
      state.output.value = uploaded
        .map(function (file) {
          return file.key;
        })
        .filter(Boolean)
        .join(",");

      return;
    }

    state.output.value = JSON.stringify(uploaded);
  }

  function getUploadedFiles(state) {
    return state.files
      .filter(function (record) {
        return record.status === "uploaded";
      })
      .map(recordToPublicFile);
  }

  function recordToPublicFile(record) {
    return {
      url: record.publicUrl || "",
      key: record.key || "",
      name: record.name,
      size: record.size,
      type: record.type,
    };
  }

  function bindFormGuards(state) {
    var form = state.root.closest("form");
    if (!form) return;

    form.addEventListener(
      "submit",
      function (event) {
        /* 1. Block submit if any upload is still in flight. Without this   */
        /*    the form posts with empty / partial values and the user      */
        /*    silently loses their data.                                    */
        if (state.config.blockSubmitWhileUploading && hasInFlightUploads(state)) {
          event.preventDefault();
          event.stopPropagation();

          setError(state, state.config.submittingText);
          updateErrorBar(state);

          state.root.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }

        /* 2. Required-field validation. */
        if (state.config.required && getUploadedFiles(state).length === 0) {
          event.preventDefault();
          event.stopPropagation();

          setError(state, state.config.requiredText);
          updateErrorBar(state);

          state.root.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
      /* capture = true so we run before other validators on the form */
      true
    );
  }

  /* True if any record in this uploader is currently being signed or */
  /* uploaded. Used to block premature form submission.                */
  function hasInFlightUploads(state) {
    for (var i = 0; i < state.files.length; i++) {
      var status = state.files[i].status;
      if (status === "signing" || status === "uploading") return true;
    }
    return false;
  }

  function setError(state, message) {
    state.error = message || state.config.errorText;
    state.root.classList.add("is-error");
  }

  function clearError(state) {
    state.error = "";
    state.root.classList.remove("is-error");
  }

  function initExternalControls() {
    document.addEventListener("click", function (event) {
      var reset = event.target.closest
        ? event.target.closest("[data-wf-up-reset]")
        : null;

      var trigger = event.target.closest
        ? event.target.closest("[data-wf-up-trigger]")
        : null;

      if (reset) {
        event.preventDefault();

        var resetTarget = reset.getAttribute("data-wf-up-target");
        var uploaders = resetTarget
          ? document.querySelectorAll(resetTarget)
          : document.querySelectorAll(ROOT_SELECTOR);

        uploaders.forEach(function (root) {
          if (root.__wfUpload) {
            root.__wfUpload.reset();
          }
        });
      }

      if (trigger) {
        var triggerTarget = trigger.getAttribute("data-wf-up-target");

        if (!triggerTarget) return;

        event.preventDefault();

        var root = document.querySelector(triggerTarget);

        if (root && root.__wfUpload) {
          root.__wfUpload.open();
        }
      }
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Renderers                                                                  */
  /* -------------------------------------------------------------------------- */

  /* ---- button layout (compact trigger; was image-button / avatar) -------- */
  function renderButton(state) {
    var c = state.config;
    var file = state.files[0];
    var hasImage = file && file.previewUrl;

    if (c.shape === "circle") {
      var body =
        '<div class="wf-up__center-stack">' +
        '<div class="wf-up__relative-inline">' +
        '<button class="wf-up__avatar-button" type="button" data-wf-up-action="open" aria-label="' +
        escapeAttr(c.buttonText) +
        '">' +
        (hasImage
          ? '<img src="' + escapeAttr(file.previewUrl) + '" alt="' + escapeAttr(file.name) + '">'
          : renderIcon(c.icon || "avatar", c)) +
        "</button>" +
        "</div>" +
        "</div>";

      return renderComponent(state, body);
    }

    var bodySquare =
      '<div class="wf-up__center-stack">' +
      '<div class="wf-up__inline-row">' +
      '<div class="wf-up__avatar-icon" aria-hidden="true">' +
      (hasImage
        ? '<img src="' + escapeAttr(file.previewUrl) + '" alt="' + escapeAttr(file.name) + '">'
        : renderIcon(c.icon || "avatar", c)) +
      "</div>" +
      '<div class="wf-up__relative-inline">' +
      renderActionButton(c.buttonText, c, "md", "upload") +
      "</div>" +
      "</div>" +
      "</div>";

    return renderComponent(state, bodySquare);
  }

  /* ---- dropzone layout (was image-single / file-single) ------------------ */
  function renderDropzone(state) {
    var c = state.config;
    var hasFiles = state.files.length > 0;
    var sizeClass =
      c.size === "compact"
        ? "wf-up__drop-area--compact"
        : "wf-up__drop-area--large";

    var firstFile = state.files[0];
    var showImagePreview =
      c.preview &&
      hasFiles &&
      firstFile &&
      firstFile.previewUrl &&
      !c.multiple;

    var inner;
    if (!hasFiles) {
      inner = renderDropContent(c, {
        icon: c.icon,
        title: c.title,
        description: c.description,
        helper: c.helperText,
        buttonText: c.buttonText,
        showButton: true,
      });
    } else if (showImagePreview) {
      inner = renderSingleImagePreview(firstFile, c);
    } else {
      inner = renderFileCardList(state);
    }

    var body =
      '<div class="wf-up__field-stack">' +
      '<div class="wf-up__relative">' +
      '<div class="wf-up__drop-area ' +
      sizeClass +
      (showImagePreview ? " has-file" : "") +
      '" data-wf-up-dropzone' +
      (hasFiles && !showImagePreview ? ' data-files="true"' : "") +
      ">" +
      inner +
      "</div>" +
      "</div>" +
      (showImagePreview && firstFile
        ? renderSingleFileSummary(firstFile, c)
        : "") +
      "</div>";

    return renderComponent(state, body);
  }

  /* ---- list layout (was image-list / image-grid / file-list) ------------- */
  function renderList(state) {
    var c = state.config;
    var hasFiles = state.files.length > 0;
    var isGrid = c.listStyle === "grid";

    var inner;
    if (!hasFiles) {
      inner = renderDropContent(c, {
        icon: c.icon,
        title: c.title,
        description: c.description,
        helper: c.helperText || buildDefaultHelper(c),
        buttonText: c.buttonText,
        showButton: true,
      });
    } else if (isGrid) {
      inner = renderListGridContent(state);
    } else {
      inner = renderListRowsContent(state);
    }

    var body =
      '<div class="wf-up__field-stack">' +
      '<div class="wf-up__drop-area wf-up__drop-area--large" data-wf-up-dropzone' +
      (hasFiles ? ' data-files="true"' : "") +
      ">" +
      inner +
      "</div>" +
      "</div>";

    return renderComponent(state, body);
  }

  /* ---- table layout ------------------------------------------------------ */
  function renderTable(state) {
    var c = state.config;

    var rows = state.files.length
      ? state.files.map(function (file) {
          return renderTableRow(file, c);
        }).join("")
      : '<tr><td class="wf-up__table-empty" colspan="4">' +
        escapeHtml(c.emptyText) +
        "</td></tr>";

    var body =
      '<div class="wf-up__field-stack">' +
      '<div class="wf-up__table-card">' +
      '<div class="wf-up__files-header">' +
      '<h3 class="wf-up__heading">' +
      escapeHtml(c.title || "Files") +
      " (" +
      state.files.length +
      ")</h3>" +
      '<div class="wf-up__actions">' +
      renderActionButton(c.addFilesText, c, "sm", "upload") +
      (state.files.length
        ? renderActionButton(c.removeAllText, c, "sm", "trash", "remove-all")
        : "") +
      "</div>" +
      "</div>" +
      '<div class="wf-up__table-wrap">' +
      '<table class="wf-up__table">' +
      "<thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Actions</th></tr></thead>" +
      "<tbody>" +
      rows +
      "</tbody>" +
      "</table>" +
      "</div>" +
      "</div>" +
      "</div>";

    return renderComponent(state, body);
  }

  /* -------------------------------------------------------------------------- */
  /* Render helpers                                                             */
  /* -------------------------------------------------------------------------- */

  function renderComponent(state, body) {
    return (
      '<div class="wf-up__component wf-up__component--' +
      escapeAttr(state.config.variant) +
      '">' +
      body +
      renderError(state) +
      "</div>"
    );
  }

  function renderDropContent(c, options) {
    var showIcon = c.showIcon !== false;
    var showTitle = c.showTitle !== false && !!options.title;
    var showDescription =
      c.showDescription !== false && !!options.description;
    var showHelper = c.showHelper !== false && !!options.helper;
    var showButton = c.showButton !== false && options.showButton !== false;

    return (
      '<div class="wf-up__drop-content">' +
      (showIcon
        ? '<div class="wf-up__drop-icon" aria-hidden="true">' +
          renderIcon(options.icon || c.icon || "upload", c) +
          "</div>"
        : "") +
      (showTitle
        ? '<p class="wf-up__drop-title">' + escapeHtml(options.title) + "</p>"
        : "") +
      (showDescription
        ? '<p class="wf-up__drop-description">' +
          escapeHtml(options.description) +
          "</p>"
        : "") +
      (showHelper
        ? '<p class="wf-up__drop-helper">' + escapeHtml(options.helper) + "</p>"
        : "") +
      (showButton
        ? renderActionButton(
            options.buttonText || c.buttonText,
            c,
            "md",
            "upload",
            "open",
            "wf-up__button--drop"
          )
        : "") +
      "</div>"
    );
  }

  function renderActionButton(text, c, size, icon, action, extraClass) {
    var actionName = action || "open";
    var className =
      "wf-up__button wf-up__button--" +
      (size || "sm") +
      (extraClass ? " " + extraClass : "");

    return (
      '<button class="' +
      className +
      '" data-wf-up-action="' +
      escapeAttr(actionName) +
      '">' +
      renderIcon(icon || "upload", c) +
      "<span>" +
      escapeHtml(text || "") +
      "</span>" +
      "</button>"
    );
  }

  function renderListGridContent(state) {
    var c = state.config;

    return (
      '<div class="wf-up__files-content">' +
      '<div class="wf-up__files-header">' +
      '<h3 class="wf-up__heading">' +
      escapeHtml(c.title || "Uploaded files") +
      " (" +
      state.files.length +
      ")</h3>" +
      '<div class="wf-up__actions">' +
      renderActionButton(c.addMoreText, c, "sm", "upload") +
      (state.files.length
        ? renderActionButton(c.removeAllText, c, "sm", "trash", "remove-all")
        : "") +
      "</div>" +
      "</div>" +
      '<div class="wf-up__image-grid">' +
      state.files.map(function (file) {
        return renderImageGridItem(file, c);
      }).join("") +
      "</div>" +
      "</div>"
    );
  }

  function renderListRowsContent(state) {
    var c = state.config;
    var rowFn = c.preview ? renderImageListRow : renderFileRow;
    var listClass = c.preview ? "wf-up__image-list" : "wf-up__file-list";

    var showIcon = c.showIcon !== false && c.preview;
    var showTitle = c.showTitle !== false && !!c.title;
    var showDescription = c.showDescription !== false && !!c.description;
    var showHelper = c.showHelper !== false && !!c.helperText;
    var showButton = c.showButton !== false && c.preview;

    return (
      '<div class="wf-up__files-content">' +
      '<div class="wf-up__drop-content wf-up__drop-content--compact">' +
      (showIcon
        ? '<div class="wf-up__drop-icon" aria-hidden="true">' +
          renderIcon(c.icon || "image", c) +
          "</div>"
        : "") +
      (showTitle
        ? '<p class="wf-up__drop-title">' + escapeHtml(c.title) + "</p>"
        : "") +
      (showDescription
        ? '<p class="wf-up__drop-description">' + escapeHtml(c.description) + "</p>"
        : "") +
      (showHelper
        ? '<p class="wf-up__drop-helper">' + escapeHtml(c.helperText) + "</p>"
        : "") +
      (showButton
        ? renderActionButton(c.buttonText, c, "md", "upload", "open", "wf-up__button--drop")
        : "") +
      "</div>" +
      '<div class="' + listClass + '">' +
      state.files.map(function (file) {
        return rowFn(file, c);
      }).join("") +
      "</div>" +
      '<div class="wf-up__files-footer">' +
      (c.preview
        ? ""
        : renderActionButton(c.addMoreText, c, "sm", "upload")) +
      (state.files.length
        ? renderActionButton(c.removeAllText, c, "sm", "trash", "remove-all")
        : "") +
      "</div>" +
      "</div>"
    );
  }

  function renderFileCardList(state) {
    var c = state.config;

    return (
      '<div class="wf-up__file-list wf-up__file-list--single">' +
      state.files.map(function (file) {
        return renderFileRow(file, c);
      }).join("") +
      "</div>"
    );
  }

  function renderImageGridItem(file, c) {
    return (
      '<div class="wf-up__image-grid-item" ' + rowAttrs(file) + ">" +
      (file.previewUrl
        ? '<img src="' + escapeAttr(file.previewUrl) + '" alt="' + escapeAttr(file.name) + '">'
        : renderIcon("image", c)) +
      renderFloatingRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderImageListRow(file, c) {
    return (
      '<div class="wf-up__image-row" ' + rowAttrs(file) + ">" +
      '<div class="wf-up__image-thumb">' +
      (file.previewUrl
        ? '<img src="' + escapeAttr(file.previewUrl) + '" alt="' + escapeAttr(file.name) + '">'
        : renderIcon("image", c)) +
      "</div>" +
      '<div class="wf-up__file-info">' +
      '<div class="wf-up__file-name">' +
      escapeHtml(file.name) +
      "</div>" +
      '<div class="wf-up__file-meta" data-wf-up-status>' +
      renderRowMeta(file, c) +
      "</div>" +
      "</div>" +
      renderRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderFileRow(file, c) {
    return (
      '<div class="wf-up__file-row" ' + rowAttrs(file) + ">" +
      '<div class="wf-up__file-icon" aria-hidden="true">' +
      renderIcon(iconForFile(file), c) +
      "</div>" +
      '<div class="wf-up__file-info">' +
      '<div class="wf-up__file-name">' +
      escapeHtml(file.name) +
      "</div>" +
      '<div class="wf-up__file-meta">' +
      formatBytes(file.size) +
      "</div>" +
      "</div>" +
      '<div class="wf-up__file-status" data-wf-up-status>' +
      renderStatus(file, c) +
      "</div>" +
      renderRetryButton(file, c) +
      renderRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderSingleFileSummary(file, c) {
    return (
      '<div class="wf-up__single-summary" ' + rowAttrs(file) + ">" +
      '<div class="wf-up__file-info">' +
      '<div class="wf-up__file-name">' +
      escapeHtml(file.name) +
      "</div>" +
      '<div class="wf-up__file-meta">' +
      formatBytes(file.size) +
      "</div>" +
      "</div>" +
      '<div class="wf-up__file-status" data-wf-up-status>' +
      renderStatus(file, c) +
      "</div>" +
      renderRetryButton(file, c) +
      renderRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderSingleImagePreview(file, c) {
    return (
      '<div class="wf-up__single-image-preview" ' + rowAttrs(file) + ">" +
      '<img src="' +
      escapeAttr(file.previewUrl) +
      '" alt="' +
      escapeAttr(file.name) +
      '">' +
      renderFloatingRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderTableRow(file, c) {
    return (
      "<tr " + rowAttrs(file) + ">" +
      '<td class="wf-up__table-cell wf-up__table-cell--name">' +
      '<div class="wf-up__table-file">' +
      '<span class="wf-up__table-file-icon">' +
      renderIcon(iconForFile(file), c) +
      "</span>" +
      '<span class="wf-up__table-file-name">' +
      escapeHtml(file.name) +
      "</span>" +
      "</div>" +
      "</td>" +
      '<td class="wf-up__table-cell">' +
      escapeHtml(getFileExtension(file.name)) +
      "</td>" +
      '<td class="wf-up__table-cell">' +
      formatBytes(file.size) +
      "</td>" +
      '<td class="wf-up__table-cell wf-up__table-cell--actions">' +
      renderRetryButton(file, c) +
      renderRemoveButton(file, c, "table") +
      "</td>" +
      "</tr>"
    );
  }

  function renderRetryButton(file, c) {
    return (
      '<button class="wf-up__icon-button wf-up__retry-button" ' +
      'data-wf-up-action="retry" data-wf-up-id="' +
      escapeAttr(file.id) +
      '" aria-label="' +
      escapeAttr(c.retryText + " " + file.name) +
      '">' +
      renderIcon("refresh", c) +
      "</button>"
    );
  }

  function renderRemoveButton(file, c, style) {
    if (!c.allowRemove) return "";

    var className =
      style === "table"
        ? "wf-up__icon-button wf-up__icon-button--table"
        : "wf-up__icon-button";

    return (
      '<button class="' +
      className +
      '" data-wf-up-action="remove" data-wf-up-id="' +
      escapeAttr(file.id) +
      '" aria-label="' +
      escapeAttr(c.removeText + " " + file.name) +
      '">' +
      renderIcon("x", c) +
      "</button>"
    );
  }

  function renderFloatingRemoveButton(file, c) {
    if (!c.allowRemove) return "";

    return (
      '<button class="wf-up__floating-remove" data-wf-up-action="remove" data-wf-up-id="' +
      escapeAttr(file.id) +
      '" aria-label="' +
      escapeAttr(c.removeText + " image") +
      '">' +
      renderIcon("x", c) +
      "</button>"
    );
  }

  function renderError(state) {
    if (!state.error) return "";
    return (
      '<div class="wf-up__error" data-wf-up-error-bar>' +
      escapeHtml(state.error) +
      "</div>"
    );
  }

  function renderEmptyState(text) {
    return '<div class="wf-up__empty">' + escapeHtml(text) + "</div>";
  }

  /* Emit per-row identity + state attributes used by surgical updates */
  /* and as CSS hooks for styling each row's status visually.           */
  function rowAttrs(file) {
    return (
      'data-wf-up-row-id="' + escapeAttr(file.id) + '" ' +
      'data-wf-up-row-status="' + escapeAttr(file.status || "pending") + '" ' +
      'data-wf-up-row-progress="' + (file.progress || 0) + '"'
    );
  }

  /* Compact one-liner used by image rows (which don't have a dedicated */
  /* status slot like file-row does). Shows size, plus status text only */
  /* while the upload is actively in flight or errored.                 */
  function renderRowMeta(file, c) {
    var size = formatBytes(file.size);
    if (
      file.status === "signing" ||
      file.status === "uploading" ||
      file.status === "error"
    ) {
      return size + " · " + renderStatus(file, c);
    }
    return size;
  }

  function renderStatus(file, c) {
    if (file.status === "pending") return escapeHtml(c.waitingText);
    if (file.status === "signing") return escapeHtml(c.preparingText);

    if (file.status === "uploading") {
      return escapeHtml(c.uploadingText) + " " + (file.progress || 0) + "%";
    }

    if (file.status === "uploaded") return escapeHtml(c.successText);
    if (file.status === "error") return escapeHtml(file.error || c.errorText);

    return "";
  }

  function iconForFile(file) {
    if (isImageType(file.type)) return "image";

    var ext = getFileExtension(file.name).toLowerCase();

    if (ext === "zip" || ext === "rar" || ext === "7z") return "archive";
    if (ext === "mp3" || ext === "wav" || ext === "m4a") return "audio";

    return "file";
  }

  /* Built-in icon library. Designers reference these by name via */
  /* `data-wf-up-icon-*="presetname"` overrides. */
  var ICON_PRESETS = {
    upload:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 3v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="m17 8-5-5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>",
    avatar:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M18 20a6 6 0 0 0-12 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="12" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>' +
      "</svg>",
    "image-up":
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="m14 19.5 3-3 3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M17 22v-5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="9" cy="9" r="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
      "</svg>",
    image:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect width="18" height="18" x="3" y="3" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="9" cy="9" r="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>",
    refresh:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M21 3v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>",
    x:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="m6 6 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      "</svg>",
    trash:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M10 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M3 6h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>",
    archive:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M10 12v-1M10 18v-2M10 7V6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M14 2v4a2 2 0 0 0 2 2h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M15.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v18h2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M10 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="none" stroke="currentColor" stroke-width="2"/>' +
      "</svg>",
    audio:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M9 18V5l12-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="18" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="2"/>' +
      "</svg>",
    file:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M7 3h7l5 5v13H7V3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      "</svg>",
  };

  /* Map a semantic type name to the per-role override config key. */
  var ICON_ROLES = {
    upload:     "iconUpload",
    avatar:     "iconUpload",
    image:      "iconImage",
    "image-up": "iconImage",
    file:       "iconFile",
    archive:    "iconFile",
    audio:      "iconFile",
    x:          "iconRemove",
    trash:      "iconRemoveAll",
    refresh:    "iconRetry",
  };

  function renderIcon(type, c) {
    var roleKey = ICON_ROLES[type];
    var override = roleKey && c ? c[roleKey] : "";

    if (override) {
      var resolved = resolveIcon(override);
      if (resolved) return resolved;
    }

    return ICON_PRESETS[type] || ICON_PRESETS.upload;
  }

  /* Three-tier resolver for icon override values. */
  /*  - inline SVG/HTML when string starts with "<"                      */
  /*  - URL (http/https/data/blob/relative) → loads as <img>             */
  /*  - otherwise treat as preset name (avatar / file / image / etc.)    */
  function resolveIcon(value) {
    var trimmed = String(value || "").trim();
    if (!trimmed) return "";

    if (trimmed.charAt(0) === "<") {
      return '<span class="wf-up__custom-icon">' + trimmed + "</span>";
    }

    if (/^(https?:\/\/|\/|data:|blob:)/i.test(trimmed)) {
      return (
        '<img class="wf-up__custom-icon" src="' +
        escapeAttr(trimmed) +
        '" alt="">'
      );
    }

    return ICON_PRESETS[trimmed] || "";
  }

  /* -------------------------------------------------------------------------- */
  /* Utils                                                                      */
  /* -------------------------------------------------------------------------- */

  function attr(el, name, fallback) {
    var value = el.getAttribute(name);
    return value === null || value === "" ? fallback : value;
  }

  function boolAttr(el, name, fallback) {
    var value = el.getAttribute(name);

    if (value === null || value === "") return fallback;

    return value === "true";
  }

  function numberAttr(el, name, fallback) {
    var raw = el.getAttribute(name);

    if (raw === null || raw === "") return fallback;

    var value = Number(raw);

    return Number.isFinite(value) ? value : fallback;
  }

  function buildDefaultHelper(c) {
    var parts = [];

    if (c.accept) {
      parts.push(c.accept);
    }

    if (c.maxFiles) {
      parts.push("Max " + c.maxFiles + " file" + (c.maxFiles === 1 ? "" : "s"));
    }

    if (c.maxSizeMb) {
      parts.push("Up to " + c.maxSizeMb + "MB");
    }

    return parts.join(" ∙ ");
  }

  function isImage(file) {
    return isImageType(file.type);
  }

  function isImageType(type) {
    return String(type || "").indexOf("image/") === 0;
  }

  function getFileExtension(name) {
    var parts = String(name || "").split(".");
    return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
  }

  function formatBytes(bytes) {
    if (!bytes) return "0B";

    var units = ["B", "KB", "MB", "GB"];
    var index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );

    var value = bytes / Math.pow(1024, index);

    return value.toFixed(index === 0 ? 0 : 2).replace(/\.00$/, "") + units[index];
  }

  function uniqueId() {
    return (
      "wfup_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function dispatch(root, name, detail) {
    root.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        detail: detail,
      })
    );
  }

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  /* Bootstrap last: all `var X = {...}` blocks above must be initialized */
  /* before ready() can possibly fire its callback synchronously.        */
  window.WebflowUploader = window.WebflowUploader || {};
  window.WebflowUploader.init = initAllUploaders;

  ready(function () {
    initAllUploaders();
    initExternalControls();
  });
})();