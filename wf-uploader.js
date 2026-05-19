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
    minimal: {
      title: "Basic image uploader",
      buttonText: "Upload image",
      caption: "Basic image uploader",
      captionLinkText: "Docs",
      accept: "image/*",
      maxFiles: 1,
      multiple: false,
      icon: "avatar",
    },

    avatar: {
      title: "Avatar uploader with droppable area",
      buttonText: "Upload image",
      caption: "Avatar uploader with droppable area",
      captionLinkText: "API",
      accept: "image/*",
      maxFiles: 1,
      multiple: false,
      icon: "avatar",
    },

    "image-single": {
      title: "Drop your image here",
      description: "SVG, PNG, JPG or GIF (max. 2MB)",
      helperText: "",
      buttonText: "Select image",
      caption: "Single image uploader w/ max size (drop area + button)",
      captionLinkText: "API",
      accept: "image/svg+xml,image/png,image/jpeg,image/jpg,image/gif",
      maxSizeMb: 2,
      maxFiles: 1,
      multiple: false,
      icon: "image",
    },

    "image-dropzone": {
      title: "Drop your images here",
      description: "SVG, PNG, JPG or GIF (max. 5MB)",
      helperText: "",
      buttonText: "Select images",
      addMoreText: "Add more",
      removeAllText: "Remove all files",
      caption: "Multiple image uploader w/ image list",
      captionLinkText: "API",
      accept: "image/svg+xml,image/png,image/jpeg,image/jpg,image/gif",
      maxSizeMb: 5,
      maxFiles: 10,
      multiple: true,
      icon: "image",
    },

    "image-grid": {
      title: "Uploaded Files",
      description: "",
      buttonText: "Add more",
      addMoreText: "Add more",
      removeAllText: "Remove all files",
      caption: "Multiple image uploader w/ image grid",
      captionLinkText: "API",
      accept: "image/svg+xml,image/png,image/jpeg,image/jpg,image/gif",
      maxSizeMb: 5,
      maxFiles: 10,
      multiple: true,
      icon: "image",
    },

    "image-list": {
      title: "Drop your images here",
      description: "SVG, PNG, JPG or GIF (max. 5MB)",
      helperText: "",
      buttonText: "Select images",
      addMoreText: "Add more",
      removeAllText: "Remove all files",
      caption: "Multiple image uploader w/ image list",
      captionLinkText: "API",
      accept: "image/svg+xml,image/png,image/jpeg,image/jpg,image/gif",
      maxSizeMb: 5,
      maxFiles: 10,
      multiple: true,
      icon: "image",
    },

    "file-card": {
      title: "Upload file",
      description: "Drag & drop or click to browse (max. 10MB)",
      helperText: "",
      buttonText: "Upload file",
      caption: "Single file uploader w/ max size",
      captionLinkText: "API",
      maxSizeMb: 10,
      maxFiles: 1,
      multiple: false,
      icon: "file",
    },

    "file-dropzone": {
      title: "Upload files",
      description: "Drag & drop or click to browse",
      helperText: "All files ∙ Max 10 files ∙ Up to 100MB",
      buttonText: "Add files",
      addMoreText: "Add files",
      removeAllText: "Remove all",
      caption: "Multiple files uploader w/ list",
      captionLinkText: "API",
      maxSizeMb: 100,
      maxFiles: 10,
      multiple: true,
      icon: "upload",
    },

    "file-list": {
      title: "Upload files",
      description: "Drag & drop or click to browse",
      helperText: "All files ∙ Max 10 files ∙ Up to 100MB",
      buttonText: "Add files",
      addMoreText: "Add files",
      removeAllText: "Remove all",
      caption: "Multiple files uploader w/ list",
      captionLinkText: "API",
      maxSizeMb: 100,
      maxFiles: 10,
      multiple: true,
      icon: "upload",
    },

    "file-list-inside": {
      title: "Uploaded Files",
      description: "",
      buttonText: "Add more",
      addMoreText: "Add more",
      removeAllText: "Remove all",
      caption: "Multiple files uploader w/ list inside",
      captionLinkText: "API",
      maxSizeMb: 100,
      maxFiles: 10,
      multiple: true,
      icon: "file",
    },

    "file-table": {
      title: "Files",
      description: "",
      buttonText: "Add files",
      addFilesText: "Add files",
      removeAllText: "Remove all",
      caption: "Multiple files uploader w/ table",
      captionLinkText: "API",
      maxSizeMb: 100,
      maxFiles: 10,
      multiple: true,
      icon: "file",
    },

    "progress-list": {
      title: "Files",
      description: "",
      buttonText: "Add files",
      addFilesText: "Add files",
      removeAllText: "Remove all",
      caption: "With simulated progress track",
      captionLinkText: "API",
      maxSizeMb: 100,
      maxFiles: 10,
      multiple: true,
      icon: "file",
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
    var variant = normalizeVariant(attr(root, "data-wf-up-variant", "file-dropzone"));
    var copy = VARIANT_COPY[variant] || {};
    var maxFiles = numberAttr(root, "data-wf-up-max-files", copy.maxFiles || 1);
    var maxSizeMb = numberAttr(root, "data-wf-up-max-size-mb", copy.maxSizeMb || 10);

    return {
      endpoint: attr(root, "data-wf-up-endpoint", ""),
      variant: variant,

      title: attr(root, "data-wf-up-title", copy.title || "Upload files"),
      description: attr(root, "data-wf-up-description", copy.description || ""),
      helperText: attr(root, "data-wf-up-helper-text", copy.helperText || ""),
      buttonText: attr(root, "data-wf-up-button-text", copy.buttonText || "Add files"),

      addMoreText: attr(root, "data-wf-up-add-more-text", copy.addMoreText || "Add more"),
      addFilesText: attr(root, "data-wf-up-add-files-text", copy.addFilesText || "Add files"),
      removeText: attr(root, "data-wf-up-remove-text", "Remove"),
      removeAllText: attr(root, "data-wf-up-remove-all-text", copy.removeAllText || "Remove all"),
      emptyText: attr(root, "data-wf-up-empty-text", "No file chosen"),

      caption: attr(root, "data-wf-up-caption", copy.caption || ""),
      captionLinkText: attr(root, "data-wf-up-caption-link-text", copy.captionLinkText || "API"),
      docsUrl: attr(
        root,
        "data-wf-up-docs-url",
        "https://github.com/cosscom/coss/blob/main/apps/origin/docs/use-file-upload.md"
      ),
      showCaption: boolAttr(root, "data-wf-up-show-caption", true),

      uploadingText: attr(root, "data-wf-up-uploading-text", "Uploading"),
      preparingText: attr(root, "data-wf-up-preparing-text", "Preparing"),
      waitingText: attr(root, "data-wf-up-waiting-text", "Waiting"),
      successText: attr(root, "data-wf-up-success-text", "Uploaded"),
      errorText: attr(
        root,
        "data-wf-up-error-text",
        "Something went wrong. Please try again."
      ),
      requiredText: attr(root, "data-wf-up-required-text", "Please upload a file."),

      accept: attr(root, "data-wf-up-accept", copy.accept || ""),
      maxSizeMb: maxSizeMb,
      maxFiles: maxFiles,
      multiple: boolAttr(root, "data-wf-up-multiple", copy.multiple !== undefined ? copy.multiple : maxFiles > 1),

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
  /* Coss-like renderers                                                        */
  /* -------------------------------------------------------------------------- */

  function renderMinimal(state) {
    var c = state.config;
    var file = state.files[0];

    var body =
      '<div class="wf-up__center-stack">' +
      '<div class="wf-up__inline-row">' +
      '<div class="wf-up__avatar-icon" aria-label="Default user avatar">' +
      (file && file.previewUrl
        ? '<img src="' + escapeAttr(file.previewUrl) + '" alt="' + escapeAttr(file.name) + '">'
        : renderIcon("avatar", c)) +
      "</div>" +
      '<div class="wf-up__relative-inline">' +
      renderActionButton(c.buttonText, c, "md", "upload") +
      "</div>" +
      "</div>" +
      "</div>";

    return renderComponent(state, body);
  }

  function renderAvatar(state) {
    var c = state.config;
    var file = state.files[0];

    var body =
      '<div class="wf-up__center-stack">' +
      '<div class="wf-up__relative-inline">' +
      '<button class="wf-up__avatar-button" data-wf-up-action="open" aria-label="' +
      escapeAttr(c.buttonText) +
      '">' +
      (file && file.previewUrl
        ? '<img src="' + escapeAttr(file.previewUrl) + '" alt="' + escapeAttr(file.name) + '">'
        : renderIcon("avatar", c)) +
      "</button>" +
      "</div>" +
      "</div>";

    return renderComponent(state, body);
  }

  function renderImageSingle(state) {
    var c = state.config;
    var file = state.files[0];

    var body =
      '<div class="wf-up__field-stack">' +
      '<div class="wf-up__relative">' +
      '<div class="wf-up__drop-area wf-up__drop-area--large' +
      (file && file.previewUrl ? " has-file" : "") +
      '" data-wf-up-dropzone role="button" tabindex="-1">' +
      (file && file.previewUrl
        ? renderSingleImagePreview(file, c)
        : renderDropContent(c, {
            icon: "image-up",
            title: c.title,
            description: c.description,
            buttonText: c.buttonText,
            showButton: true,
          })) +
      "</div>" +
      "</div>" +
      (file ? renderSingleFileSummary(file, c) : "") +
      "</div>";

    return renderComponent(state, body);
  }

  function renderImageDropzone(state) {
    var c = state.config;
    var hasFiles = state.files.length > 0;

    var body =
      '<div class="wf-up__field-stack">' +
      '<div class="wf-up__drop-area wf-up__drop-area--large" data-wf-up-dropzone ' +
      (hasFiles ? 'data-files="true"' : "") +
      ">" +
      (hasFiles
        ? renderImageListContent(state)
        : renderDropContent(c, {
            icon: "image",
            title: c.title,
            description: c.description,
            buttonText: c.buttonText,
            showButton: true,
          })) +
      "</div>" +
      "</div>";

    return renderComponent(state, body);
  }

  function renderImageGrid(state) {
    var c = state.config;
    var hasFiles = state.files.length > 0;

    var body =
      '<div class="wf-up__field-stack">' +
      '<div class="wf-up__drop-area wf-up__drop-area--large" data-wf-up-dropzone ' +
      (hasFiles ? 'data-files="true"' : "") +
      ">" +
      (hasFiles
        ? renderImageGridContent(state)
        : renderDropContent(c, {
            icon: "image",
            title: "Drop your images here",
            description: "SVG, PNG, JPG or GIF (max. " + c.maxSizeMb + "MB)",
            buttonText: c.buttonText,
            showButton: true,
          })) +
      "</div>" +
      "</div>";

    return renderComponent(state, body);
  }

  function renderImageList(state) {
    return renderImageDropzone(state);
  }

  function renderFileCard(state) {
    var c = state.config;
    var file = state.files[0];

    var body =
      '<div class="wf-up__field-stack">' +
      '<div class="wf-up__drop-area wf-up__drop-area--compact" data-wf-up-dropzone>' +
      (file
        ? renderFileCardList(state)
        : renderDropContent(c, {
            icon: "file",
            title: c.title,
            description: c.description,
            buttonText: c.buttonText,
            showButton: true,
          })) +
      "</div>" +
      "</div>";

    return renderComponent(state, body);
  }

  function renderFileDropzone(state) {
    var c = state.config;
    var hasFiles = state.files.length > 0;

    var body =
      '<div class="wf-up__field-stack">' +
      '<div class="wf-up__drop-area wf-up__drop-area--large" data-wf-up-dropzone ' +
      (hasFiles ? 'data-files="true"' : "") +
      ">" +
      (hasFiles
        ? renderFileListContent(state)
        : renderDropContent(c, {
            icon: "upload",
            title: c.title,
            description: c.description,
            helper: c.helperText,
            buttonText: c.buttonText,
            showButton: false,
          })) +
      "</div>" +
      "</div>";

    return renderComponent(state, body);
  }

  function renderFileList(state) {
    return renderFileDropzone(state);
  }

  function renderFileListInside(state) {
    var c = state.config;

    var body =
      '<div class="wf-up__field-stack">' +
      '<div class="wf-up__files-panel" data-files="' +
      (state.files.length ? "true" : "false") +
      '">' +
      '<div class="wf-up__files-header">' +
      '<h3 class="wf-up__heading">Uploaded Files (' +
      state.files.length +
      ")</h3>" +
      (state.files.length
        ? renderActionButton(c.removeAllText, c, "sm", "trash", "remove-all")
        : "") +
      "</div>" +
      '<div class="wf-up__file-list">' +
      (state.files.length
        ? state.files.map(function (file) {
            return renderFileRow(file, c);
          }).join("")
        : renderEmptyState(c.emptyText)) +
      "</div>" +
      '<div class="wf-up__files-footer">' +
      renderActionButton(c.addMoreText, c, "sm", "upload") +
      "</div>" +
      "</div>" +
      "</div>";

    return renderComponent(state, body);
  }

  function renderFileTable(state) {
    var c = state.config;

    var rows = state.files.length
      ? state.files
          .map(function (file) {
            return renderTableRow(file, c);
          })
          .join("")
      : '<tr><td class="wf-up__table-empty" colspan="4">' +
        escapeHtml(c.emptyText) +
        "</td></tr>";

    var body =
      '<div class="wf-up__field-stack">' +
      '<div class="wf-up__table-card">' +
      '<div class="wf-up__files-header">' +
      '<h3 class="wf-up__heading">Files (' +
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
      "</div>" +
      "</div>";

    return renderComponent(state, body);
  }

  function renderProgressList(state) {
    var c = state.config;

    var body =
      '<div class="wf-up__field-stack">' +
      '<div class="wf-up__files-panel">' +
      '<div class="wf-up__files-header">' +
      '<h3 class="wf-up__heading">Files (' +
      state.files.length +
      ")</h3>" +
      '<div class="wf-up__actions">' +
      renderActionButton(c.addFilesText, c, "sm", "upload") +
      (state.files.length
        ? renderActionButton(c.removeAllText, c, "sm", "trash", "remove-all")
        : "") +
      "</div>" +
      "</div>" +
      '<div class="wf-up__progress-list">' +
      (state.files.length
        ? state.files.map(function (file) {
            return renderProgressRow(file, c);
          }).join("")
        : renderEmptyState(c.emptyText)) +
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
      renderCaption(state.config) +
      renderError(state) +
      "</div>"
    );
  }

  function renderCaption(c) {
    if (!c.showCaption || !c.caption) return "";

    return (
      '<p class="wf-up__caption" aria-live="polite" role="region">' +
      escapeHtml(c.caption) +
      " ∙ " +
      '<a class="wf-up__caption-link" href="' +
      escapeAttr(c.docsUrl) +
      '" target="_blank" rel="noreferrer">' +
      escapeHtml(c.captionLinkText) +
      "</a>" +
      "</p>"
    );
  }

  function renderDropContent(c, options) {
    return (
      '<div class="wf-up__drop-content">' +
      '<div class="wf-up__drop-icon" aria-hidden="true">' +
      renderIcon(options.icon || c.icon || "upload", c) +
      "</div>" +
      '<p class="wf-up__drop-title">' +
      escapeHtml(options.title || "") +
      "</p>" +
      (options.description
        ? '<p class="wf-up__drop-description">' +
          escapeHtml(options.description) +
          "</p>"
        : "") +
      (options.helper
        ? '<p class="wf-up__drop-helper">' +
          escapeHtml(options.helper) +
          "</p>"
        : "") +
      (options.showButton
        ? renderActionButton(options.buttonText || c.buttonText, c, "md", "upload", "open", "wf-up__button--drop")
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
      escapeHtml(text) +
      "</span>" +
      "</button>"
    );
  }

  function renderImageGridContent(state) {
    var c = state.config;

    return (
      '<div class="wf-up__files-content">' +
      '<div class="wf-up__files-header">' +
      '<h3 class="wf-up__heading">Uploaded Files (' +
      state.files.length +
      ")</h3>" +
      renderActionButton(c.addMoreText, c, "sm", "upload") +
      "</div>" +
      '<div class="wf-up__image-grid">' +
      state.files.map(function (file) {
        return renderImageGridItem(file, c);
      }).join("") +
      "</div>" +
      "</div>"
    );
  }

  function renderImageListContent(state) {
    var c = state.config;

    return (
      '<div class="wf-up__files-content">' +
      '<div class="wf-up__drop-content wf-up__drop-content--compact">' +
      '<div class="wf-up__drop-icon" aria-hidden="true">' +
      renderIcon("image", c) +
      "</div>" +
      '<p class="wf-up__drop-title">' +
      escapeHtml(c.title) +
      "</p>" +
      '<p class="wf-up__drop-description">' +
      escapeHtml(c.description) +
      "</p>" +
      renderActionButton(c.buttonText, c, "md", "upload", "open", "wf-up__button--drop") +
      "</div>" +
      '<div class="wf-up__image-list">' +
      state.files.map(function (file) {
        return renderImageListRow(file, c);
      }).join("") +
      "</div>" +
      (state.files.length
        ? '<div class="wf-up__files-footer">' +
          renderActionButton(c.removeAllText, c, "sm", "trash", "remove-all") +
          "</div>"
        : "") +
      "</div>"
    );
  }

  function renderFileListContent(state) {
    var c = state.config;

    return (
      '<div class="wf-up__files-content">' +
      '<div class="wf-up__drop-content wf-up__drop-content--compact">' +
      '<p class="wf-up__drop-title">' +
      escapeHtml(c.title) +
      "</p>" +
      '<p class="wf-up__drop-description">' +
      escapeHtml(c.description) +
      "</p>" +
      '<p class="wf-up__drop-helper">' +
      escapeHtml(c.helperText || buildDefaultHelper(c)) +
      "</p>" +
      "</div>" +
      '<div class="wf-up__file-list">' +
      state.files.map(function (file) {
        return renderFileRow(file, c);
      }).join("") +
      "</div>" +
      '<div class="wf-up__files-footer">' +
      renderActionButton(c.addMoreText, c, "sm", "upload") +
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
      '<div class="wf-up__image-grid-item">' +
      (file.previewUrl
        ? '<img src="' +
          escapeAttr(file.previewUrl) +
          '" alt="' +
          escapeAttr(file.name) +
          '">'
        : renderIcon("image", c)) +
      renderFloatingRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderImageListRow(file, c) {
    return (
      '<div class="wf-up__image-row">' +
      '<div class="wf-up__image-thumb">' +
      (file.previewUrl
        ? '<img src="' +
          escapeAttr(file.previewUrl) +
          '" alt="' +
          escapeAttr(file.name) +
          '">'
        : renderIcon("image", c)) +
      "</div>" +
      '<div class="wf-up__file-info">' +
      '<div class="wf-up__file-name">' +
      escapeHtml(file.name) +
      "</div>" +
      '<div class="wf-up__file-meta">' +
      formatBytes(file.size) +
      "</div>" +
      "</div>" +
      renderRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderFileRow(file, c) {
    return (
      '<div class="wf-up__file-row">' +
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
      '<div class="wf-up__file-status">' +
      renderStatus(file, c) +
      "</div>" +
      renderRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderSingleFileSummary(file, c) {
    return (
      '<div class="wf-up__single-summary">' +
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

  function renderSingleImagePreview(file, c) {
    return (
      '<div class="wf-up__single-image-preview">' +
      '<img src="' +
      escapeAttr(file.previewUrl) +
      '" alt="' +
      escapeAttr(file.name) +
      '">' +
      renderFloatingRemoveButton(file, c) +
      "</div>"
    );
  }

  function renderProgressRow(file, c) {
    return (
      '<div class="wf-up__progress-row">' +
      '<div class="wf-up__file-icon" aria-hidden="true">' +
      renderIcon(iconForFile(file), c) +
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

  function renderTableRow(file, c) {
    return (
      "<tr>" +
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
      renderRemoveButton(file, c, "table") +
      "</td>" +
      "</tr>"
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
      renderIcon(c.iconRemove ? "remove-custom" : "x", c) +
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
      renderIcon(c.iconRemove ? "remove-custom" : "x", c) +
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
    if (ext === "pdf") return "file";
    if (ext === "xlsx" || ext === "xls" || ext === "csv") return "file";

    return "file";
  }

  function renderIcon(type, c) {
    var url = "";

    if (type === "upload") {
      url = c.iconUpload;
    } else if (type === "image" || type === "image-up") {
      url = c.iconImage;
    } else if (type === "remove-custom") {
      url = c.iconRemove;
    } else {
      url = c.iconFile;
    }

    if (url) {
      return '<img class="wf-up__custom-icon" src="' + escapeAttr(url) + '" alt="">';
    }

    if (type === "avatar") {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M18 20a6 6 0 0 0-12 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="12" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>' +
        "</svg>"
      );
    }

    if (type === "image-up") {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="m14 19.5 3-3 3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M17 22v-5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="9" cy="9" r="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
        "</svg>"
      );
    }

    if (type === "image") {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<rect width="18" height="18" x="3" y="3" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="9" cy="9" r="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg>"
      );
    }

    if (type === "x") {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="m6 6 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        "</svg>"
      );
    }

    if (type === "trash") {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M10 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M3 6h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        "</svg>"
      );
    }

    if (type === "archive") {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M10 12v-1M10 18v-2M10 7V6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M14 2v4a2 2 0 0 0 2 2h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M15.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v18h2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M10 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="none" stroke="currentColor" stroke-width="2"/>' +
        "</svg>"
      );
    }

    if (type === "audio") {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M9 18V5l12-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="18" cy="16" r="3" fill="none" stroke="currentColor" stroke-width="2"/>' +
        "</svg>"
      );
    }

    if (type === "file") {
      return (
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M7 3h7l5 5v13H7V3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M14 3v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
        "</svg>"
      );
    }

    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 3v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="m17 8-5-5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
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
})();