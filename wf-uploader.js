(function () {
  "use strict";

  var ROOT_SELECTOR = '[upload="file"]';

  var VARIANTS = {
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

  var VARIANT_COPY = {
    "file-dropzone": {
      title: "Upload files",
      description: "Drag & drop or click to browse",
      helperText: "All files ∙ Max 10 files ∙ Up to 100MB",
      buttonText: "Add files",
      emptyText: "No file chosen",
    },

    "file-list": {
      title: "Upload files",
      description: "Drag & drop or click to browse",
      helperText: "All files ∙ Max 10 files ∙ Up to 100MB",
      buttonText: "Add files",
      emptyText: "No file chosen",
    },

    "file-list-inside": {
      title: "Uploaded Files",
      description: "",
      buttonText: "Add more",
      addMoreText: "Add more",
      removeAllText: "Remove all",
      emptyText: "No file chosen",
    },

    "file-table": {
      title: "Files",
      description: "",
      buttonText: "Add files",
      addFilesText: "Add files",
      removeAllText: "Remove all",
      emptyText: "No file chosen",
    },

    "file-card": {
      title: "Upload file",
      description: "Drag & drop or click to browse (max. 10MB)",
      buttonText: "Upload file",
      helperText: "",
      emptyText: "No file chosen",
    },

    "progress-list": {
      title: "Files",
      description: "",
      buttonText: "Add files",
      addFilesText: "Add files",
      removeAllText: "Remove all",
      emptyText: "No file chosen",
    },

    "image-dropzone": {
      title: "Drop your images here",
      description: "SVG, PNG, JPG or GIF (max. 5MB)",
      buttonText: "Select images",
      helperText: "",
      addMoreText: "Add more",
      removeAllText: "Remove all files",
      emptyText: "No file chosen",
    },

    "image-single": {
      title: "Drop your image here",
      description: "SVG, PNG, JPG or GIF (max. 2MB)",
      buttonText: "Select image",
      helperText: "Max size: 5MB",
      emptyText: "No file chosen",
    },

    "image-grid": {
      title: "Uploaded Files",
      description: "",
      buttonText: "Add more",
      addMoreText: "Add more",
      removeAllText: "Remove all files",
      emptyText: "No file chosen",
    },

    "image-list": {
      title: "Drop your images here",
      description: "SVG, PNG, JPG or GIF (max. 5MB)",
      buttonText: "Select images",
      helperText: "",
      addMoreText: "Add more",
      removeAllText: "Remove all files",
      emptyText: "No file chosen",
    },

    avatar: {
      title: "Avatar upload button",
      description: "",
      buttonText: "Upload image",
      helperText: "",
      emptyText: "No file chosen",
    },

    minimal: {
      title: "Upload file",
      description: "",
      buttonText: "Upload file",
      helperText: "No file chosen",
      emptyText: "No file chosen",
    },
  };

  ready(function () {
    initAllUploaders();
    initExternalControls();
  });

  window.WebflowUploader = window.WebflowUploader || {};
  window.WebflowUploader.init = initAllUploaders;

  function initAllUploaders() {
    var roots = document.querySelectorAll(ROOT_SELECTOR);

    roots.forEach(function (root) {
      initUploader(root);
    });
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

    root.innerHTML =
      '<input class="wf-up__native-input" type="file" hidden data-wf-up-native-input>' +
      '<input type="hidden" name="' +
      escapeAttr(config.fieldName) +
      '" data-wf-up-output>' +
      '<div class="wf-up__view" data-wf-up-view></div>';

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

    bindRequiredValidation(state);
    render(state);

    dispatch(root, "wf-up:ready", {
      files: [],
    });
  }

  function readConfig(root) {
    var maxFiles = numberAttr(root, "data-wf-up-max-files", 1);
    var variant = normalizeVariant(attr(root, "data-wf-up-variant", "file-dropzone"));
    var copy = VARIANT_COPY[variant] || {};

    return {
      endpoint: attr(root, "data-wf-up-endpoint", ""),
      variant: variant,

      title: attr(root, "data-wf-up-title", copy.title || "Upload files"),
      description: attr(root, "data-wf-up-description", copy.description || ""),
      buttonText: attr(root, "data-wf-up-button-text", copy.buttonText || "Add files"),
      helperText: attr(root, "data-wf-up-helper-text", copy.helperText || ""),

      addMoreText: attr(root, "data-wf-up-add-more-text", copy.addMoreText || "Add more"),
      addFilesText: attr(root, "data-wf-up-add-files-text", copy.addFilesText || "Add files"),
      removeText: attr(root, "data-wf-up-remove-text", "Remove"),
      removeAllText: attr(root, "data-wf-up-remove-all-text", copy.removeAllText || "Remove all"),
      emptyText: attr(root, "data-wf-up-empty-text", copy.emptyText || "No file chosen"),

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
      maxFiles: maxFiles,
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
    if (!state.view) return;

    var renderer = VARIANTS[state.config.variant] || renderFileDropzone;

    state.view.innerHTML = renderer(state);

    bindRenderedActions(state);
    updateOutput(state);
  }

  function bindRenderedActions(state) {
    var actions = state.view.querySelectorAll("[data-wf-up-action]");

    actions.forEach(function (el) {
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
        }
      });
    });

    var dropzones = state.view.querySelectorAll("[data-wf-up-dropzone]");

    dropzones.forEach(function (zone) {
      zone.addEventListener("click", function (event) {
        if (event.target.closest && event.target.closest("[data-wf-up-action]")) {
          return;
        }

        state.input.click();
      });

      zone.addEventListener("dragover", function (event) {
        event.preventDefault();
        state.root.classList.add("is-dragging");
      });

      zone.addEventListener("dragleave", function () {
        state.root.classList.remove("is-dragging");
      });

      zone.addEventListener("drop", function (event) {
        event.preventDefault();
        state.root.classList.remove("is-dragging");

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
      addedRecords.forEach(function (record) {
        uploadRecord(record, state);
      });
    }
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
      render(state);

      var signed = await getSignedUploadUrl(record.file, state.config);

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
      record.error = error && error.message ? error.message : state.config.errorText;

      setError(state, record.error);
      render(state);

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

  function bindRequiredValidation(state) {
    if (!state.config.required) return;

    var form = state.root.closest("form");

    if (!form) return;

    form.addEventListener("submit", function (event) {
      var hasUploadedFile = getUploadedFiles(state).length > 0;

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

  function renderFileDropzone(state) {
    var c = state.config;

    return (
      '<div class="wf-up__panel">' +
      renderDropzone(state, {
        icon: "upload",
        title: c.title,
        description: c.description,
        button: c.buttonText,
        helper: c.helperText || buildDefaultHelper(c),
      }) +
      renderFileRows(state, "default") +
      renderFooterActions(state) +
      renderError(state) +
      "</div>"
    );
  }

  function renderFileList(state) {
    var c = state.config;

    return (
      '<div class="wf-up__panel">' +
      '<div class="wf-up__header">' +
      "<div>" +
      '<div class="wf-up__title">' +
      escapeHtml(c.title) +
      "</div>" +
      '<div class="wf-up__description">' +
      escapeHtml(c.description) +
      "</div>" +
      "</div>" +
      renderOpenButton(c.buttonText, c) +
      "</div>" +
      renderCompactDropzone(state) +
      renderFileRows(state, "default") +
      renderFooterActions(state) +
      renderError(state) +
      "</div>"
    );
  }

  function renderFileListInside(state) {
    var c = state.config;
    var count = state.files.length;

    return (
      '<div class="wf-up__panel">' +
      renderCompactDropzone(state) +
      '<div class="wf-up__inside">' +
      '<div class="wf-up__inside-head">' +
      '<div class="wf-up__title">Uploaded Files (' +
      count +
      ")</div>" +
      '<div class="wf-up__actions">' +
      '<button class="wf-up__link-button" data-wf-up-action="open">' +
      escapeHtml(c.addMoreText) +
      "</button>" +
      (count
        ? '<button class="wf-up__link-button is-danger" data-wf-up-action="remove-all">' +
          escapeHtml(c.removeAllText) +
          "</button>"
        : "") +
      "</div>" +
      "</div>" +
      renderFileRows(state, "inside") +
      "</div>" +
      renderError(state) +
      "</div>"
    );
  }

  function renderFileTable(state) {
    var c = state.config;

    var rows = state.files.length
      ? state.files
          .map(function (file) {
            return (
              "<tr>" +
              "<td>" +
              escapeHtml(file.name) +
              "</td>" +
              "<td>" +
              escapeHtml(getFileExtension(file.name)) +
              "</td>" +
              "<td>" +
              formatBytes(file.size) +
              "</td>" +
              "<td>" +
              renderRemoveButton(file, c) +
              "</td>" +
              "</tr>"
            );
          })
          .join("")
      : '<tr><td colspan="4" class="wf-up__empty">' +
        escapeHtml(c.emptyText) +
        "</td></tr>";

    return (
      '<div class="wf-up__panel">' +
      '<div class="wf-up__header">' +
      "<div>" +
      '<div class="wf-up__title">Files (' +
      state.files.length +
      ")</div>" +
      "</div>" +
      '<div class="wf-up__actions">' +
      renderOpenButton(c.addFilesText, c) +
      (state.files.length
        ? '<button class="wf-up__secondary-button" data-wf-up-action="remove-all">' +
          escapeHtml(c.removeAllText) +
          "</button>"
        : "") +
      "</div>" +
      "</div>" +
      '<div class="wf-up__table-wrap">' +
      '<table class="wf-up__table">' +
      "<thead>" +
      "<tr>" +
      "<th>Name</th>" +
      "<th>Type</th>" +
      "<th>Size</th>" +
      "<th>Actions</th>" +
      "</tr>" +
      "</thead>" +
      "<tbody>" +
      rows +
      "</tbody>" +
      "</table>" +
      "</div>" +
      renderError(state) +
      "</div>"
    );
  }

  function renderFileCard(state) {
    var c = state.config;
    var file = state.files[0];

    return (
      '<div class="wf-up__card">' +
      '<div class="wf-up__card-icon">' +
      renderIcon("file", c) +
      "</div>" +
      '<div class="wf-up__card-body">' +
      '<div class="wf-up__title">' +
      escapeHtml(c.title) +
      "</div>" +
      '<div class="wf-up__description">' +
      escapeHtml(c.description || c.helperText) +
      "</div>" +
      (file ? renderSingleFileSummary(file, c) : renderOpenButton(c.buttonText, c)) +
      "</div>" +
      renderError(state) +
      "</div>"
    );
  }

  function renderProgressList(state) {
    var c = state.config;

    var rows = state.files.length
      ? state.files
          .map(function (file) {
            return renderProgressRow(file, c);
          })
          .join("")
      : renderEmptyState(c.emptyText);

    return (
      '<div class="wf-up__panel">' +
      '<div class="wf-up__header">' +
      "<div>" +
      '<div class="wf-up__title">Files (' +
      state.files.length +
      ")</div>" +
      "</div>" +
      '<div class="wf-up__actions">' +
      renderOpenButton(c.addFilesText, c) +
      (state.files.length
        ? '<button class="wf-up__secondary-button" data-wf-up-action="remove-all">' +
          escapeHtml(c.removeAllText) +
          "</button>"
        : "") +
      "</div>" +
      "</div>" +
      '<div class="wf-up__progress-list">' +
      rows +
      "</div>" +
      renderError(state) +
      "</div>"
    );
  }

  function renderImageDropzone(state) {
    var c = state.config;

    return (
      '<div class="wf-up__panel">' +
      renderDropzone(state, {
        icon: "image",
        title: c.title,
        description: c.description,
        button: c.buttonText,
        helper: c.helperText,
      }) +
      renderImagePreviewArea(state) +
      renderError(state) +
      "</div>"
    );
  }

  function renderImageSingle(state) {
    var c = state.config;
    var file = state.files[0];

    return (
      '<div class="wf-up__image-single">' +
      (file && file.previewUrl
        ? '<div class="wf-up__image-single-preview">' +
          '<img src="' +
          escapeAttr(file.previewUrl) +
          '" alt="' +
          escapeAttr(file.name) +
          '">' +
          renderRemoveButton(file, c) +
          "</div>"
        : '<div class="wf-up__image-single-empty" data-wf-up-dropzone>' +
          renderIcon("image", c) +
          '<div class="wf-up__title">' +
          escapeHtml(c.title) +
          "</div>" +
          '<div class="wf-up__description">' +
          escapeHtml(c.description) +
          "</div>" +
          renderOpenButton(c.buttonText, c) +
          "</div>") +
      (file ? renderSingleFileSummary(file, c) : "") +
      renderError(state) +
      "</div>"
    );
  }

  function renderImageGrid(state) {
    var c = state.config;

    var tiles = state.files
      .map(function (file) {
        return renderImageTile(file, c);
      })
      .join("");

    var add =
      state.files.length < c.maxFiles
        ? '<button class="wf-up__image-add" data-wf-up-action="open">' +
          renderIcon("upload", c) +
          "<span>" +
          escapeHtml(c.addMoreText) +
          "</span>" +
          "</button>"
        : "";

    return (
      '<div class="wf-up__panel">' +
      '<div class="wf-up__header">' +
      "<div>" +
      '<div class="wf-up__title">Uploaded Files (' +
      state.files.length +
      ")</div>" +
      "</div>" +
      '<div class="wf-up__actions">' +
      '<button class="wf-up__link-button" data-wf-up-action="open">' +
      escapeHtml(c.addMoreText) +
      "</button>" +
      (state.files.length
        ? '<button class="wf-up__link-button is-danger" data-wf-up-action="remove-all">' +
          escapeHtml(c.removeAllText) +
          "</button>"
        : "") +
      "</div>" +
      "</div>" +
      '<div class="wf-up__image-grid">' +
      tiles +
      add +
      "</div>" +
      renderError(state) +
      "</div>"
    );
  }

  function renderImageList(state) {
    return (
      '<div class="wf-up__panel">' +
      renderCompactDropzone(state) +
      renderImageRows(state) +
      renderFooterActions(state) +
      renderError(state) +
      "</div>"
    );
  }

  function renderAvatar(state) {
    var c = state.config;
    var file = state.files[0];

    return (
      '<div class="wf-up__avatar-wrap">' +
      '<button class="wf-up__avatar" data-wf-up-action="open" aria-label="' +
      escapeAttr(c.buttonText) +
      '">' +
      (file && file.previewUrl
        ? '<img src="' +
          escapeAttr(file.previewUrl) +
          '" alt="' +
          escapeAttr(file.name) +
          '">'
        : renderIcon("image", c)) +
      "</button>" +
      '<div class="wf-up__avatar-content">' +
      '<div class="wf-up__title">' +
      escapeHtml(c.title) +
      "</div>" +
      (c.description
        ? '<div class="wf-up__description">' + escapeHtml(c.description) + "</div>"
        : "") +
      '<div class="wf-up__actions">' +
      renderOpenButton(c.buttonText, c) +
      (file ? renderRemoveButton(file, c, "secondary") : "") +
      "</div>" +
      (file ? renderStatus(file, c) : "") +
      renderError(state) +
      "</div>" +
      "</div>"
    );
  }

  function renderMinimal(state) {
    var c = state.config;

    return (
      '<div class="wf-up__minimal">' +
      renderOpenButton(c.buttonText, c) +
      '<div class="wf-up__minimal-meta">' +
      (state.files.length
        ? state.files.length + " file(s) selected"
        : escapeHtml(c.helperText || c.emptyText)) +
      "</div>" +
      renderFileRows(state, "minimal") +
      renderError(state) +
      "</div>"
    );
  }

  /* -------------------------------------------------------------------------- */
  /* Render helpers                                                             */
  /* -------------------------------------------------------------------------- */

  function renderOpenButton(text, c, className) {
    return (
      '<button class="' +
      (className || "wf-up__button") +
      '" data-wf-up-action="open">' +
      renderIcon("upload", c) +
      "<span>" +
      escapeHtml(text) +
      "</span>" +
      "</button>"
    );
  }

  function renderDropzone(state, options) {
    var c = state.config;

    return (
      '<div class="wf-up__dropzone" data-wf-up-dropzone>' +
      '<div class="wf-up__dropzone-icon">' +
      renderIcon(options.icon || "upload", c) +
      "</div>" +
      '<div class="wf-up__title">' +
      escapeHtml(options.title) +
      "</div>" +
      (options.description
        ? '<div class="wf-up__description">' +
          escapeHtml(options.description) +
          "</div>"
        : "") +
      renderOpenButton(options.button, c) +
      (options.helper
        ? '<div class="wf-up__helper">' + escapeHtml(options.helper) + "</div>"
        : "") +
      "</div>"
    );
  }

  function renderCompactDropzone(state) {
    var c = state.config;

    return (
      '<div class="wf-up__compact-dropzone" data-wf-up-dropzone>' +
      '<div class="wf-up__compact-icon">' +
      renderIcon("upload", c) +
      "</div>" +
      "<div>" +
      '<div class="wf-up__title">' +
      escapeHtml(c.title) +
      "</div>" +
      (c.description
        ? '<div class="wf-up__description">' +
          escapeHtml(c.description) +
          "</div>"
        : "") +
      (c.helperText
        ? '<div class="wf-up__helper">' +
          escapeHtml(c.helperText) +
          "</div>"
        : "") +
      "</div>" +
      renderOpenButton(c.buttonText, c) +
      "</div>"
    );
  }

  function renderFileRows(state, mode) {
    if (!state.files.length) {
      return renderEmptyState(state.config.emptyText);
    }

    return (
      '<div class="wf-up__file-list wf-up__file-list--' +
      escapeAttr(mode || "default") +
      '">' +
      state.files
        .map(function (file) {
          return renderFileRow(file, state.config);
        })
        .join("") +
      "</div>"
    );
  }

  function renderFileRow(file, c) {
    return (
      '<div class="wf-up__file">' +
      '<div class="wf-up__file-icon">' +
      renderIcon("file", c) +
      "</div>" +
      '<div class="wf-up__file-info">' +
      '<div class="wf-up__file-name">' +
      escapeHtml(file.name) +
      "</div>" +
      '<div class="wf-up__file-meta">' +
      formatBytes(file.size) +
      "</div>" +
      "</div>" +
      '<div class="wf-up__file-status">' +
      renderStatus(file, c) +
      "</div>" +
      renderRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderImageRows(state) {
    if (!state.files.length) {
      return renderEmptyState(state.config.emptyText);
    }

    return (
      '<div class="wf-up__image-list">' +
      state.files
        .map(function (file) {
          return (
            '<div class="wf-up__image-row">' +
            '<div class="wf-up__image-thumb">' +
            (file.previewUrl
              ? '<img src="' +
                escapeAttr(file.previewUrl) +
                '" alt="' +
                escapeAttr(file.name) +
                '">'
              : renderIcon("image", state.config)) +
            "</div>" +
            '<div class="wf-up__file-info">' +
            '<div class="wf-up__file-name">' +
            escapeHtml(file.name) +
            "</div>" +
            '<div class="wf-up__file-meta">' +
            formatBytes(file.size) +
            "</div>" +
            "</div>" +
            '<div class="wf-up__file-status">' +
            renderStatus(file, state.config) +
            "</div>" +
            renderRemoveButton(file, state.config) +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderImagePreviewArea(state) {
    if (!state.files.length) return "";

    return (
      '<div class="wf-up__image-preview-row">' +
      state.files
        .map(function (file) {
          return renderImageTile(file, state.config);
        })
        .join("") +
      "</div>"
    );
  }

  function renderImageTile(file, c) {
    return (
      '<div class="wf-up__image-tile">' +
      (file.previewUrl
        ? '<img src="' +
          escapeAttr(file.previewUrl) +
          '" alt="' +
          escapeAttr(file.name) +
          '">'
        : renderIcon("image", c)) +
      '<div class="wf-up__image-tile-overlay">' +
      "<span>" +
      renderStatus(file, c) +
      "</span>" +
      renderRemoveButton(file, c) +
      "</div>" +
      "</div>"
    );
  }

  function renderSingleFileSummary(file, c) {
    return (
      '<div class="wf-up__single-summary">' +
      "<div>" +
      '<div class="wf-up__file-name">' +
      escapeHtml(file.name) +
      "</div>" +
      '<div class="wf-up__file-meta">' +
      formatBytes(file.size) +
      "</div>" +
      "</div>" +
      '<div class="wf-up__file-status">' +
      renderStatus(file, c) +
      "</div>" +
      renderRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderProgressRow(file, c) {
    return (
      '<div class="wf-up__progress-row">' +
      '<div class="wf-up__file-icon">' +
      renderIcon(isImageType(file.type) ? "image" : "file", c) +
      "</div>" +
      '<div class="wf-up__progress-body">' +
      '<div class="wf-up__progress-head">' +
      '<div class="wf-up__file-name">' +
      escapeHtml(file.name) +
      "</div>" +
      '<div class="wf-up__file-meta">' +
      formatBytes(file.size) +
      "</div>" +
      "</div>" +
      '<div class="wf-up__progress-track">' +
      '<div class="wf-up__progress-fill" style="width:' +
      Number(file.progress || 0) +
      '%;"></div>' +
      "</div>" +
      '<div class="wf-up__progress-foot">' +
      renderStatus(file, c) +
      "</div>" +
      "</div>" +
      renderRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderFooterActions(state) {
    var c = state.config;

    if (!state.files.length) return "";

    return (
      '<div class="wf-up__footer">' +
      '<button class="wf-up__link-button" data-wf-up-action="open">' +
      escapeHtml(c.addMoreText) +
      "</button>" +
      '<button class="wf-up__link-button is-danger" data-wf-up-action="remove-all">' +
      escapeHtml(c.removeAllText) +
      "</button>" +
      "</div>"
    );
  }

  function renderStatus(file, c) {
    if (file.status === "pending") return "Waiting";
    if (file.status === "signing") return "Preparing";
    if (file.status === "uploading") {
      return escapeHtml(c.uploadingText) + " " + (file.progress || 0) + "%";
    }
    if (file.status === "uploaded") return escapeHtml(c.successText);
    if (file.status === "error") return escapeHtml(file.error || c.errorText);

    return "";
  }

  function renderRemoveButton(file, c, style) {
    if (!c.allowRemove) return "";

    var className =
      style === "secondary" ? "wf-up__secondary-button" : "wf-up__remove-button";

    return (
      '<button class="' +
      className +
      '" data-wf-up-action="remove" data-wf-up-id="' +
      escapeAttr(file.id) +
      '" aria-label="' +
      escapeAttr(c.removeText) +
      '">' +
      (c.iconRemove ? renderIcon("remove", c) : "×") +
      "</button>"
    );
  }

  function renderError(state) {
    if (!state.error) return "";

    return '<div class="wf-up__error">' + escapeHtml(state.error) + "</div>";
  }

  function renderEmptyState(text) {
    return '<div class="wf-up__empty">' + escapeHtml(text) + "</div>";
  }

  function renderIcon(type, c) {
    var url = "";

    if (type === "upload") {
      url = c.iconUpload;
    } else if (type === "image") {
      url = c.iconImage;
    } else if (type === "remove") {
      url = c.iconRemove;
    } else {
      url = c.iconFile;
    }

    if (url) {
      return '<img class="wf-up__custom-icon" src="' + escapeAttr(url) + '" alt="">';
    }

    if (type === "image") {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-13Z" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
        '<path d="M8 15l2.2-2.2a1 1 0 0 1 1.4 0L14 15.2l1.2-1.2a1 1 0 0 1 1.4 0L20 17.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
        '<circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/>' +
        "</svg>"
      );
    }

    if (type === "remove") {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        "</svg>"
      );
    }

    if (type === "file") {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M7 3h7l5 5v13H7V3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
        '<path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>' +
        "</svg>"
      );
    }

    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 13v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="m8 17 4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>"
    );
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
    if (!bytes) return "0 B";

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
})();