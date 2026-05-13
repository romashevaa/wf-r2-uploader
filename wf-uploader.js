(function () {
  "use strict";

  const ROOT_SELECTOR = '[upload="file"]';

  const VARIANTS = {
    "file-dropzone": renderFileDropzone,
    "file-list": renderFileList,
    "file-list-inside": renderFileListInside,
    "file-table": renderFileTable,
    "file-card": renderFileCard,
    "progress-list": renderProgressList,

    "image-dropzone": renderImageDropzone,
    "image-single": renderImageSingle,
    "image-grid": renderImageGrid,
    "image-list": renderImageList,

    avatar: renderAvatar,
    minimal: renderMinimal,
  };

  ready(function () {
    document.querySelectorAll(ROOT_SELECTOR).forEach(initUploader);
    initExternalControls();
  });

  function initUploader(root) {
    if (root.__wfUploadInitialized) return;
    root.__wfUploadInitialized = true;

    const config = readConfig(root);

    const state = {
      root,
      config,
      files: [],
      error: "",
      isDragging: false,
      input: null,
      output: null,
      view: null,
    };

    root.classList.add("wf-up");
    root.classList.add(`wf-up--${config.variant}`);
    root.setAttribute("data-wf-up-ready", "true");

    root.innerHTML = `
      <input class="wf-up__native-input" type="file" hidden data-wf-up-native-input>
      <input type="hidden" name="${escapeAttr(config.fieldName)}" data-wf-up-output>
      <div class="wf-up__view" data-wf-up-view></div>
    `;

    state.input = root.querySelector("[data-wf-up-native-input]");
    state.output = root.querySelector("[data-wf-up-output]");
    state.view = root.querySelector("[data-wf-up-view]");

    syncNativeInput(state);

    state.input.addEventListener("change", function () {
      addFiles(Array.from(state.input.files || []), state);
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

    bindRequiredValidation(state);
    render(state);
    dispatch(root, "wf-up:ready", { files: [] });
  }

  function readConfig(root) {
    const maxFiles = numberAttr(root, "data-wf-up-max-files", 1);

    return {
      endpoint: attr(root, "data-wf-up-endpoint", ""),
      variant: normalizeVariant(attr(root, "data-wf-up-variant", "file-dropzone")),

      title: attr(root, "data-wf-up-title", "Upload files"),
      description: attr(
        root,
        "data-wf-up-description",
        "Drag and drop files here or click to browse"
      ),
      buttonText: attr(root, "data-wf-up-button-text", "Choose files"),
      helperText: attr(root, "data-wf-up-helper-text", ""),

      addMoreText: attr(root, "data-wf-up-add-more-text", "Add more"),
      addFilesText: attr(root, "data-wf-up-add-files-text", "Add files"),
      removeText: attr(root, "data-wf-up-remove-text", "Remove"),
      removeAllText: attr(root, "data-wf-up-remove-all-text", "Remove all"),
      uploadingText: attr(root, "data-wf-up-uploading-text", "Uploading"),
      successText: attr(root, "data-wf-up-success-text", "Uploaded"),
      errorText: attr(
        root,
        "data-wf-up-error-text",
        "Something went wrong. Please try again."
      ),
      requiredText: attr(root, "data-wf-up-required-text", "Please upload a file."),

      accept: attr(root, "data-wf-up-accept", ""),
      maxSizeMb: numberAttr(root, "data-wf-up-max-size-mb", 10),
      maxFiles,
      multiple: boolAttr(root, "data-wf-up-multiple", maxFiles > 1),

      folder: attr(root, "data-wf-up-folder", "uploads"),
      fieldName: attr(root, "data-wf-up-field-name", "uploaded_files"),
      outputFormat: attr(root, "data-wf-up-output-format", "json"),

      autoUpload: boolAttr(root, "data-wf-up-auto-upload", true),
      allowRemove: boolAttr(root, "data-wf-up-allow-remove", true),
      required: boolAttr(root, "data-wf-up-required", false),

      iconUpload: attr(root, "data-wf-up-icon-upload", ""),
      iconFile: attr(root, "data-wf-up-icon-file", ""),
      iconImage: attr(root, "data-wf-up-icon-image", ""),
      iconRemove: attr(root, "data-wf-up-icon-remove", ""),
    };
  }

  function normalizeVariant(value) {
    return VARIANTS[value] ? value : "file-dropzone";
  }

  function render(state) {
    const renderer = VARIANTS[state.config.variant] || renderFileDropzone;

    state.view.innerHTML = renderer(state);

    bindRenderedActions(state);
    updateOutput(state);
  }

  function bindRenderedActions(state) {
    state.view.querySelectorAll("[data-wf-up-action]").forEach(function (el) {
      const action = el.getAttribute("data-wf-up-action");

      if (el.tagName === "BUTTON" && !el.getAttribute("type")) {
        el.setAttribute("type", "button");
      }

      el.addEventListener("click", function (event) {
        event.preventDefault();

        if (action === "open") {
          state.input.click();
        }

        if (action === "remove-all") {
          resetUploader(state);
        }

        if (action === "remove") {
          removeFile(state, el.getAttribute("data-wf-up-id"));
        }
      });
    });

    state.view.querySelectorAll("[data-wf-up-dropzone]").forEach(function (zone) {
      zone.addEventListener("click", function (event) {
        const actionEl = event.target.closest("[data-wf-up-action]");

        if (actionEl) return;

        state.input.click();
      });

      zone.addEventListener("dragover", function (event) {
        event.preventDefault();
        state.isDragging = true;
        state.root.classList.add("is-dragging");
      });

      zone.addEventListener("dragleave", function () {
        state.isDragging = false;
        state.root.classList.remove("is-dragging");
      });

      zone.addEventListener("drop", function (event) {
        event.preventDefault();
        state.isDragging = false;
        state.root.classList.remove("is-dragging");

        addFiles(Array.from(event.dataTransfer.files || []), state);
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

    const availableSlots = state.config.maxFiles - state.files.length;

    if (availableSlots <= 0) {
      setError(state, `You can upload up to ${state.config.maxFiles} file(s).`);
      return;
    }

    const selectedFiles = state.config.multiple ? files : files.slice(0, 1);

    if (selectedFiles.length > availableSlots) {
      setError(state, `You can upload up to ${state.config.maxFiles} file(s).`);
      return;
    }

    const addedRecords = [];

    selectedFiles.forEach(function (file) {
      const error = validateFile(file, state.config);

      if (error) {
        setError(state, error);
        return;
      }

      const record = createFileRecord(file);
      state.files.push(record);
      addedRecords.push(record);

      dispatch(state.root, "wf-up:file-added", {
        file: recordToPublicFile(record),
        files: getUploadedFiles(state),
      });
    });

    render(state);

    if (state.config.autoUpload) {
      addedRecords.forEach(function (record) {
        uploadRecord(record, state);
      });
    }
  }

  function createFileRecord(file) {
    return {
      id: uniqueId(),
      file,
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
      render(state);

      const signed = await getSignedUploadUrl(record.file, state.config);

      record.status = "uploading";
      record.progress = 0;
      render(state);

      dispatch(state.root, "wf-up:upload-start", {
        file: recordToPublicFile(record),
        files: getUploadedFiles(state),
      });

      await uploadToR2(record.file, signed.uploadUrl, function (percent) {
        record.progress = percent;
        render(state);

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
      render(state);

      dispatch(state.root, "wf-up:upload-success", {
        file: recordToPublicFile(record),
        files: getUploadedFiles(state),
      });

      dispatch(state.root, "wf-up:change", {
        files: getUploadedFiles(state),
      });
    } catch (error) {
      record.status = "error";
      record.error = error.message || state.config.errorText;

      setError(state, record.error);
      render(state);

      dispatch(state.root, "wf-up:upload-error", {
        error,
        file: recordToPublicFile(record),
        files: getUploadedFiles(state),
      });
    }
  }

  async function getSignedUploadUrl(file, config) {
    if (!config.endpoint) {
      throw new Error("Missing data-wf-up-endpoint.");
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        folder: config.folder,
      }),
    });

    const data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(data.error || "Could not create upload URL.");
    }

    return data;
  }

  function uploadToR2(file, uploadUrl, onProgress) {
    return new Promise(function (resolve, reject) {
      const xhr = new XMLHttpRequest();

      xhr.open("PUT", uploadUrl);

      if (file.type) {
        xhr.setRequestHeader("Content-Type", file.type);
      }

      xhr.upload.onprogress = function (event) {
        if (!event.lengthComputable) return;

        const percent = Math.round((event.loaded / event.total) * 100);

        if (typeof onProgress === "function") {
          onProgress(percent);
        }
      };

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}.`));
        }
      };

      xhr.onerror = function () {
        reject(new Error("Network error during upload."));
      };

      xhr.send(file);
    });
  }

  function validateFile(file, config) {
    const maxBytes = config.maxSizeMb * 1024 * 1024;

    if (file.size > maxBytes) {
      return `${file.name} is too large. Max size is ${config.maxSizeMb}MB.`;
    }

    if (config.accept && !matchesAccept(file, config.accept)) {
      return `${file.name} is not an allowed file type.`;
    }

    return "";
  }

  function matchesAccept(file, accept) {
    const rules = accept
      .split(",")
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);

    if (!rules.length) return true;

    return rules.some(function (rule) {
      if (rule.endsWith("/*")) {
        const base = rule.replace("/*", "");
        return file.type.startsWith(base + "/");
      }

      if (rule.startsWith(".")) {
        return file.name.toLowerCase().endsWith(rule.toLowerCase());
      }

      return file.type === rule;
    });
  }

  function removeFile(state, id) {
    const index = state.files.findIndex(function (file) {
      return file.id === id;
    });

    if (index === -1) return;

    const removed = state.files[index];

    if (removed.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }

    state.files.splice(index, 1);

    clearError(state);
    render(state);

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

    dispatch(state.root, "wf-up:reset", {
      files: [],
    });

    dispatch(state.root, "wf-up:change", {
      files: [],
    });
  }

  function updateOutput(state) {
    const uploaded = getUploadedFiles(state);

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

  function bindRequiredValidation(state) {
    if (!state.config.required) return;

    const form = state.root.closest("form");

    if (!form) return;

    form.addEventListener("submit", function (event) {
      const hasUploadedFile = getUploadedFiles(state).length > 0;

      if (hasUploadedFile) return;

      event.preventDefault();
      event.stopPropagation();

      setError(state, state.config.requiredText);
      render(state);

      state.root.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
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
      const reset = event.target.closest("[data-wf-up-reset]");
      const trigger = event.target.closest("[data-wf-up-trigger]");

      if (reset) {
        event.preventDefault();

        const target = reset.getAttribute("data-wf-up-target");
        const uploaders = target
          ? document.querySelectorAll(target)
          : document.querySelectorAll(ROOT_SELECTOR);

        uploaders.forEach(function (root) {
          if (root.__wfUpload) {
            root.__wfUpload.reset();
          }
        });
      }

      if (trigger) {
        const target = trigger.getAttribute("data-wf-up-target");

        if (!target) return;

        event.preventDefault();

        const root = document.querySelector(target);

        if (root && root.__wfUpload) {
          root.__wfUpload.open();
        }
      }
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Renderers                                                                  */
  /* -------------------------------------------------------------------------- */

  function renderFileDropzone(state) {
    const c = state.config;

    return `
      <div class="wf-up__panel">
        ${renderDropzone(state, {
          icon: "upload",
          title: c.title,
          description: c.description,
          button: c.buttonText,
          helper: c.helperText || buildDefaultHelper(c),
        })}

        ${renderFileRows(state, "default")}
        ${renderFooterActions(state)}
        ${renderError(state)}
      </div>
    `;
  }

  function renderFileList(state) {
    const c = state.config;

    return `
      <div class="wf-up__panel">
        <div class="wf-up__header">
          <div>
            <div class="wf-up__title">${escapeHtml(c.title)}</div>
            <div class="wf-up__description">${escapeHtml(c.description)}</div>
          </div>

          <button class="wf-up__button" data-wf-up-action="open">
            ${escapeHtml(c.buttonText)}
          </button>
        </div>

        ${renderCompactDropzone(state)}
        ${renderFileRows(state, "default")}
        ${renderFooterActions(state)}
        ${renderError(state)}
      </div>
    `;
  }

  function renderFileListInside(state) {
    const c = state.config;
    const count = state.files.length;

    return `
      <div class="wf-up__panel">
        ${renderCompactDropzone(state)}

        <div class="wf-up__inside">
          <div class="wf-up__inside-head">
            <div class="wf-up__title">Uploaded Files (${count})</div>

            <div class="wf-up__actions">
              <button class="wf-up__link-button" data-wf-up-action="open">
                ${escapeHtml(c.addMoreText)}
              </button>

              ${
                count
                  ? `<button class="wf-up__link-button is-danger" data-wf-up-action="remove-all">${escapeHtml(c.removeAllText)}</button>`
                  : ""
              }
            </div>
          </div>

          ${renderFileRows(state, "inside")}
        </div>

        ${renderError(state)}
      </div>
    `;
  }

  function renderFileTable(state) {
    const c = state.config;

    return `
      <div class="wf-up__panel">
        <div class="wf-up__header">
          <div>
            <div class="wf-up__title">${escapeHtml(c.title)}</div>
            <div class="wf-up__description">${escapeHtml(c.helperText || buildDefaultHelper(c))}</div>
          </div>

          <div class="wf-up__actions">
            <button class="wf-up__button" data-wf-up-action="open">
              ${escapeHtml(c.addFilesText)}
            </button>

            ${
              state.files.length
                ? `<button class="wf-up__secondary-button" data-wf-up-action="remove-all">${escapeHtml(c.removeAllText)}</button>`
                : ""
            }
          </div>
        </div>

        <div class="wf-up__table-wrap">
          <table class="wf-up__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${
                state.files.length
                  ? state.files.map(function (file) {
                      return `
                        <tr>
                          <td>${escapeHtml(file.name)}</td>
                          <td>${escapeHtml(getFileExtension(file.name))}</td>
                          <td>${formatBytes(file.size)}</td>
                          <td>${renderStatus(file, c)}</td>
                          <td>${renderRemoveButton(file, c)}</td>
                        </tr>
                      `;
                    }).join("")
                  : `<tr><td colspan="5" class="wf-up__empty">No files selected</td></tr>`
              }
            </tbody>
          </table>
        </div>

        ${renderError(state)}
      </div>
    `;
  }

  function renderFileCard(state) {
    const c = state.config;
    const file = state.files[0];

    return `
      <div class="wf-up__card">
        <div class="wf-up__card-icon">
          ${renderIcon("file", c)}
        </div>

        <div class="wf-up__card-body">
          <div class="wf-up__title">${escapeHtml(c.title)}</div>
          <div class="wf-up__description">${escapeHtml(c.helperText || c.description)}</div>

          ${
            file
              ? renderSingleFileSummary(file, c)
              : `<button class="wf-up__button" data-wf-up-action="open">${escapeHtml(c.buttonText)}</button>`
          }
        </div>

        ${renderError(state)}
      </div>
    `;
  }

  function renderProgressList(state) {
    const c = state.config;

    return `
      <div class="wf-up__panel">
        <div class="wf-up__header">
          <div>
            <div class="wf-up__title">${escapeHtml(c.title)}</div>
            <div class="wf-up__description">${escapeHtml(c.description)}</div>
          </div>

          <button class="wf-up__button" data-wf-up-action="open">
            ${escapeHtml(c.buttonText)}
          </button>
        </div>

        <div class="wf-up__progress-list">
          ${
            state.files.length
              ? state.files.map(function (file) {
                  return renderProgressRow(file, c);
                }).join("")
              : renderEmptyState("No files selected yet.")
          }
        </div>

        ${renderError(state)}
      </div>
    `;
  }

  function renderImageDropzone(state) {
    const c = state.config;

    return `
      <div class="wf-up__panel">
        ${renderDropzone(state, {
          icon: "image",
          title: c.title || "Upload image",
          description: c.description || "Drop your image here or click to browse",
          button: c.buttonText || "Select image",
          helper: c.helperText || buildDefaultHelper(c),
        })}

        ${renderImagePreviewArea(state)}
        ${renderError(state)}
      </div>
    `;
  }

  function renderImageSingle(state) {
    const c = state.config;
    const file = state.files[0];

    return `
      <div class="wf-up__image-single">
        ${
          file && file.previewUrl
            ? `
              <div class="wf-up__image-single-preview">
                <img src="${escapeAttr(file.previewUrl)}" alt="${escapeAttr(file.name)}">
                ${renderRemoveButton(file, c)}
              </div>
            `
            : `
              <div class="wf-up__image-single-empty" data-wf-up-dropzone>
                ${renderIcon("image", c)}
                <div class="wf-up__title">${escapeHtml(c.title || "Upload image")}</div>
                <div class="wf-up__description">${escapeHtml(c.helperText || "SVG, PNG, JPG or GIF")}</div>
                <button class="wf-up__button" data-wf-up-action="open">${escapeHtml(c.buttonText || "Select image")}</button>
              </div>
            `
        }

        ${file ? renderSingleFileSummary(file, c) : ""}
        ${renderError(state)}
      </div>
    `;
  }

  function renderImageGrid(state) {
    const c = state.config;

    return `
      <div class="wf-up__panel">
        <div class="wf-up__header">
          <div>
            <div class="wf-up__title">Uploaded Files (${state.files.length})</div>
            <div class="wf-up__description">${escapeHtml(c.helperText || buildDefaultHelper(c))}</div>
          </div>

          <div class="wf-up__actions">
            <button class="wf-up__button" data-wf-up-action="open">
              ${escapeHtml(c.addMoreText)}
            </button>

            ${
              state.files.length
                ? `<button class="wf-up__secondary-button" data-wf-up-action="remove-all">${escapeHtml(c.removeAllText)}</button>`
                : ""
            }
          </div>
        </div>

        <div class="wf-up__image-grid">
          ${state.files.map(function (file) {
            return renderImageTile(file, c);
          }).join("")}

          ${
            state.files.length < c.maxFiles
              ? `
                <button class="wf-up__image-add" data-wf-up-action="open">
                  ${renderIcon("upload", c)}
                  <span>${escapeHtml(c.addMoreText)}</span>
                </button>
              `
              : ""
          }
        </div>

        ${renderError(state)}
      </div>
    `;
  }

  function renderImageList(state) {
    const c = state.config;

    return `
      <div class="wf-up__panel">
        ${renderCompactDropzone(state)}
        ${renderImageRows(state)}
        ${renderFooterActions(state)}
        ${renderError(state)}
      </div>
    `;
  }

  function renderAvatar(state) {
    const c = state.config;
    const file = state.files[0];

    return `
      <div class="wf-up__avatar-wrap">
        <button class="wf-up__avatar" data-wf-up-action="open" aria-label="${escapeAttr(c.buttonText)}">
          ${
            file && file.previewUrl
              ? `<img src="${escapeAttr(file.previewUrl)}" alt="${escapeAttr(file.name)}">`
              : renderIcon("image", c)
          }
        </button>

        <div class="wf-up__avatar-content">
          <div class="wf-up__title">${escapeHtml(c.title || "Avatar")}</div>
          <div class="wf-up__description">${escapeHtml(c.helperText || "Upload image")}</div>

          <div class="wf-up__actions">
            <button class="wf-up__button" data-wf-up-action="open">
              ${escapeHtml(c.buttonText || "Upload image")}
            </button>

            ${file ? renderRemoveButton(file, c, "secondary") : ""}
          </div>

          ${file ? renderStatus(file, c) : ""}
          ${renderError(state)}
        </div>
      </div>
    `;
  }

  function renderMinimal(state) {
    const c = state.config;

    return `
      <div class="wf-up__minimal">
        <button class="wf-up__button" data-wf-up-action="open">
          ${renderIcon("upload", c)}
          <span>${escapeHtml(c.buttonText)}</span>
        </button>

        <div class="wf-up__minimal-meta">
          ${
            state.files.length
              ? `${state.files.length} file(s) selected`
              : escapeHtml(c.helperText || buildDefaultHelper(c))
          }
        </div>

        ${renderFileRows(state, "minimal")}
        ${renderError(state)}
      </div>
    `;
  }

  /* -------------------------------------------------------------------------- */
  /* Render helpers                                                             */
  /* -------------------------------------------------------------------------- */

  function renderDropzone(state, options) {
    const c = state.config;

    return `
      <div class="wf-up__dropzone" data-wf-up-dropzone>
        <div class="wf-up__dropzone-icon">
          ${renderIcon(options.icon || "upload", c)}
        </div>

        <div class="wf-up__title">${escapeHtml(options.title)}</div>
        <div class="wf-up__description">${escapeHtml(options.description)}</div>

        <button class="wf-up__button" data-wf-up-action="open">
          ${escapeHtml(options.button)}
        </button>

        ${
          options.helper
            ? `<div class="wf-up__helper">${escapeHtml(options.helper)}</div>`
            : ""
        }
      </div>
    `;
  }

  function renderCompactDropzone(state) {
    const c = state.config;

    return `
      <div class="wf-up__compact-dropzone" data-wf-up-dropzone>
        <div class="wf-up__compact-icon">${renderIcon("upload", c)}</div>

        <div>
          <div class="wf-up__title">${escapeHtml(c.title)}</div>
          <div class="wf-up__description">${escapeHtml(c.helperText || buildDefaultHelper(c))}</div>
        </div>

        <button class="wf-up__button" data-wf-up-action="open">
          ${escapeHtml(c.buttonText)}
        </button>
      </div>
    `;
  }

  function renderFileRows(state, mode) {
    if (!state.files.length) {
      return renderEmptyState("No files selected yet.");
    }

    return `
      <div class="wf-up__file-list wf-up__file-list--${escapeAttr(mode || "default")}">
        ${state.files.map(function (file) {
          return renderFileRow(file, state.config);
        }).join("")}
      </div>
    `;
  }

  function renderFileRow(file, c) {
    return `
      <div class="wf-up__file">
        <div class="wf-up__file-icon">${renderIcon("file", c)}</div>

        <div class="wf-up__file-info">
          <div class="wf-up__file-name">${escapeHtml(file.name)}</div>
          <div class="wf-up__file-meta">${formatBytes(file.size)} · ${escapeHtml(getFileExtension(file.name))}</div>
        </div>

        <div class="wf-up__file-status">${renderStatus(file, c)}</div>

        ${renderRemoveButton(file, c)}
      </div>
    `;
  }

  function renderImageRows(state) {
    if (!state.files.length) {
      return renderEmptyState("No images selected yet.");
    }

    return `
      <div class="wf-up__image-list">
        ${state.files.map(function (file) {
          return `
            <div class="wf-up__image-row">
              <div class="wf-up__image-thumb">
                ${
                  file.previewUrl
                    ? `<img src="${escapeAttr(file.previewUrl)}" alt="${escapeAttr(file.name)}">`
                    : renderIcon("image", state.config)
                }
              </div>

              <div class="wf-up__file-info">
                <div class="wf-up__file-name">${escapeHtml(file.name)}</div>
                <div class="wf-up__file-meta">${formatBytes(file.size)}</div>
              </div>

              <div class="wf-up__file-status">${renderStatus(file, state.config)}</div>
              ${renderRemoveButton(file, state.config)}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderImagePreviewArea(state) {
    if (!state.files.length) return "";

    return `
      <div class="wf-up__image-preview-row">
        ${state.files.map(function (file) {
          return renderImageTile(file, state.config);
        }).join("")}
      </div>
    `;
  }

  function renderImageTile(file, c) {
    return `
      <div class="wf-up__image-tile">
        ${
          file.previewUrl
            ? `<img src="${escapeAttr(file.previewUrl)}" alt="${escapeAttr(file.name)}">`
            : renderIcon("image", c)
        }

        <div class="wf-up__image-tile-overlay">
          <span>${renderStatus(file, c)}</span>
          ${renderRemoveButton(file, c)}
        </div>
      </div>
    `;
  }

  function renderSingleFileSummary(file, c) {
    return `
      <div class="wf-up__single-summary">
        <div>
          <div class="wf-up__file-name">${escapeHtml(file.name)}</div>
          <div class="wf-up__file-meta">${formatBytes(file.size)}</div>
        </div>

        <div class="wf-up__file-status">${renderStatus(file, c)}</div>
        ${renderRemoveButton(file, c)}
      </div>
    `;
  }

  function renderProgressRow(file, c) {
    return `
      <div class="wf-up__progress-row">
        <div class="wf-up__file-icon">${renderIcon(isImageType(file.type) ? "image" : "file", c)}</div>

        <div class="wf-up__progress-body">
          <div class="wf-up__progress-head">
            <div class="wf-up__file-name">${escapeHtml(file.name)}</div>
            <div class="wf-up__file-meta">${formatBytes(file.size)}</div>
          </div>

          <div class="wf-up__progress-track">
            <div class="wf-up__progress-fill" style="width:${Number(file.progress || 0)}%;"></div>
          </div>

          <div class="wf-up__progress-foot">${renderStatus(file, c)}</div>
        </div>

        ${renderRemoveButton(file, c)}
      </div>
    `;
  }

  function renderFooterActions(state) {
    const c = state.config;

    if (!state.files.length) return "";

    return `
      <div class="wf-up__footer">
        <button class="wf-up__link-button" data-wf-up-action="open">
          ${escapeHtml(c.addMoreText)}
        </button>

        <button class="wf-up__link-button is-danger" data-wf-up-action="remove-all">
          ${escapeHtml(c.removeAllText)}
        </button>
      </div>
    `;
  }

  function renderStatus(file, c) {
    if (file.status === "pending") return "Waiting";
    if (file.status === "signing") return "Preparing";
    if (file.status === "uploading") return `${escapeHtml(c.uploadingText)} ${file.progress || 0}%`;
    if (file.status === "uploaded") return escapeHtml(c.successText);
    if (file.status === "error") return escapeHtml(file.error || c.errorText);

    return "";
  }

  function renderRemoveButton(file, c, style) {
    if (!c.allowRemove) return "";

    const className =
      style === "secondary"
        ? "wf-up__secondary-button"
        : "wf-up__remove-button";

    return `
      <button
        class="${className}"
        data-wf-up-action="remove"
        data-wf-up-id="${escapeAttr(file.id)}"
        aria-label="${escapeAttr(c.removeText)}"
      >
        ${c.iconRemove ? renderIcon("remove", c) : "×"}
      </button>
    `;
  }

  function renderError(state) {
    if (!state.error) return "";

    return `<div class="wf-up__error">${escapeHtml(state.error)}</div>`;
  }

  function renderEmptyState(text) {
    return `<div class="wf-up__empty">${escapeHtml(text)}</div>`;
  }

  function renderIcon(type, c) {
    const url =
      type === "upload"
        ? c.iconUpload
        : type === "image"
        ? c.iconImage
        : type === "remove"
        ? c.iconRemove
        : c.iconFile;

    if (url) {
      return `<img class="wf-up__custom-icon" src="${escapeAttr(url)}" alt="">`;
    }

    if (type === "image") {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <path d="M8 15l2.2-2.2a1 1 0 0 1 1.4 0L14 15.2l1.2-1.2a1 1 0 0 1 1.4 0L20 17.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/>
        </svg>
      `;
    }

    if (type === "remove") {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
    }

    if (type === "file") {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h7l5 5v13H7V3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 16V4m0 0L7 9m5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
      </svg>
    `;
  }

  /* -------------------------------------------------------------------------- */
  /* Utils                                                                      */
  /* -------------------------------------------------------------------------- */

  function attr(el, name, fallback) {
    const value = el.getAttribute(name);
    return value === null || value === "" ? fallback : value;
  }

  function boolAttr(el, name, fallback) {
    const value = el.getAttribute(name);

    if (value === null || value === "") return fallback;

    return value === "true";
  }

  function numberAttr(el, name, fallback) {
    const value = Number(el.getAttribute(name));

    return Number.isFinite(value) ? value : fallback;
  }

  function buildDefaultHelper(c) {
    const parts = [];

    if (c.accept) parts.push(c.accept);
    if (c.maxFiles) parts.push(`Max ${c.maxFiles} file${c.maxFiles === 1 ? "" : "s"}`);
    if (c.maxSizeMb) parts.push(`Up to ${c.maxSizeMb}MB`);

    return parts.join(" · ");
  }

  function isImage(file) {
    return isImageType(file.type);
  }

  function isImageType(type) {
    return String(type || "").startsWith("image/");
  }

  function getFileExtension(name) {
    const parts = String(name || "").split(".");
    return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );

    const value = bytes / Math.pow(1024, index);

    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function uniqueId() {
    return `wfup_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
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
        detail,
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
})();
