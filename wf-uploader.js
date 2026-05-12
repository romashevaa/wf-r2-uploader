(function () {
  const SELECTOR = '[uploader="r2"]';

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(SELECTOR).forEach(initUploader);
  });

  function initUploader(root) {
    const config = readConfig(root);

    root.classList.add("wf-up");

    root.innerHTML = `
      <div class="wf-up__dropzone" data-wf-up-dropzone>
        <div class="wf-up__title">${escapeHtml(config.title)}</div>
        <div class="wf-up__description">${escapeHtml(config.description)}</div>
        <button type="button" class="wf-up__button" data-wf-up-trigger>
          ${escapeHtml(config.buttonText)}
        </button>
        <div class="wf-up__helper">${escapeHtml(config.helperText)}</div>
      </div>

      <input type="file" hidden data-wf-up-input ${config.multiple ? "multiple" : ""} accept="${escapeHtml(config.accept)}">
      <div class="wf-up__list" data-wf-up-list></div>
      <div class="wf-up__error" data-wf-up-error></div>
      <input type="hidden" name="${escapeHtml(config.fieldName)}" data-wf-up-output>
    `;

    const input = root.querySelector("[data-wf-up-input]");
    const trigger = root.querySelector("[data-wf-up-trigger]");
    const dropzone = root.querySelector("[data-wf-up-dropzone]");
    const list = root.querySelector("[data-wf-up-list]");
    const errorBox = root.querySelector("[data-wf-up-error]");
    const output = root.querySelector("[data-wf-up-output]");

    const uploadedFiles = [];

    trigger.addEventListener("click", function () {
      input.click();
    });

    input.addEventListener("change", function () {
      handleFiles(Array.from(input.files || []));
      input.value = "";
    });

    dropzone.addEventListener("dragover", function (event) {
      event.preventDefault();
      root.classList.add("is-dragover");
    });

    dropzone.addEventListener("dragleave", function () {
      root.classList.remove("is-dragover");
    });

    dropzone.addEventListener("drop", function (event) {
      event.preventDefault();
      root.classList.remove("is-dragover");

      const files = Array.from(event.dataTransfer.files || []);
      handleFiles(files);
    });

    async function handleFiles(files) {
      clearError();

      if (!files.length) return;

      if (!config.multiple && files.length > 1) {
        showError("Only one file is allowed.");
        return;
      }

      if (uploadedFiles.length + files.length > config.maxFiles) {
        showError(`You can upload up to ${config.maxFiles} file(s).`);
        return;
      }

      for (const file of files) {
        const validationError = validateFile(file, config);

        if (validationError) {
          showError(validationError);
          continue;
        }

        const row = addFileRow(file, list);

        try {
          row.status.textContent = "Signing...";

          const signed = await getSignedUploadUrl(file, config);

          row.status.textContent = "Uploading...";

          await uploadToR2(file, signed.uploadUrl);

          const fileData = {
            url: signed.publicUrl,
            key: signed.key,
            name: file.name,
            size: file.size,
            type: file.type,
          };

          uploadedFiles.push(fileData);
          updateOutput(output, uploadedFiles, config);

          row.status.textContent = "Uploaded";
          row.element.classList.add("is-uploaded");

          root.dispatchEvent(
            new CustomEvent("wf-up:upload-success", {
              bubbles: true,
              detail: { file: fileData, files: uploadedFiles },
            })
          );
        } catch (error) {
          console.error(error);
          row.status.textContent = "Failed";
          row.element.classList.add("is-error");
          showError(error.message || "Upload failed.");
        }
      }
    }
  }

  function readConfig(root) {
    return {
      endpoint: root.getAttribute("data-wf-up-endpoint") || "",
      variant: root.getAttribute("data-wf-up-variant") || "dropzone",
      title: root.getAttribute("data-wf-up-title") || "Upload files",
      description:
        root.getAttribute("data-wf-up-description") ||
        "Drag and drop files here or click to browse",
      buttonText: root.getAttribute("data-wf-up-button-text") || "Choose files",
      helperText: root.getAttribute("data-wf-up-helper-text") || "",
      accept: root.getAttribute("data-wf-up-accept") || "",
      maxSizeMb: Number(root.getAttribute("data-wf-up-max-size-mb") || 10),
      maxFiles: Number(root.getAttribute("data-wf-up-max-files") || 1),
      multiple: root.getAttribute("data-wf-up-multiple") === "true",
      folder: root.getAttribute("data-wf-up-folder") || "uploads",
      fieldName: root.getAttribute("data-wf-up-field-name") || "uploaded_files",
      outputFormat: root.getAttribute("data-wf-up-output-format") || "json",
    };
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
    const rules = accept.split(",").map((item) => item.trim()).filter(Boolean);

    if (!rules.length) return true;

    return rules.some((rule) => {
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not create upload URL.");
    }

    return data;
  }

  function uploadToR2(file, uploadUrl) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("PUT", uploadUrl);

      if (file.type) {
        xhr.setRequestHeader("Content-Type", file.type);
      }

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

  function addFileRow(file, list) {
    const element = document.createElement("div");
    element.className = "wf-up__file";

    element.innerHTML = `
      <span class="wf-up__file-name">${escapeHtml(file.name)}</span>
      <span class="wf-up__file-size">${formatBytes(file.size)}</span>
      <span class="wf-up__file-status">Waiting...</span>
    `;

    list.appendChild(element);

    return {
      element,
      status: element.querySelector(".wf-up__file-status"),
    };
  }

  function updateOutput(output, files, config) {
    if (config.outputFormat === "urls") {
      output.value = files.map((file) => file.url).filter(Boolean).join(",");
      return;
    }

    if (config.outputFormat === "keys") {
      output.value = files.map((file) => file.key).filter(Boolean).join(",");
      return;
    }

    output.value = JSON.stringify(files);
  }

  function showError(message) {
    document.querySelectorAll("[data-wf-up-error]").forEach((box) => {
      box.textContent = message;
    });
  }

  function clearError() {
    document.querySelectorAll("[data-wf-up-error]").forEach((box) => {
      box.textContent = "";
    });
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, index);

    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();