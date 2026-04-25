const TRANSFORMS = {
  thumb: { name: "thumb", width: 320, height: 320, quality: "balanced" },
  card: { name: "card", width: 960, height: 960, quality: "balanced" },
  detail: { name: "detail", width: 1600, height: 1600, quality: "high" },
};

const form = document.getElementById("job-form");
const fileInput = document.getElementById("source-file");
const outputFormatInput = document.getElementById("output-format");
const submitButton = document.getElementById("submit-button");
const retryButton = document.getElementById("retry-button");
const banner = document.getElementById("message-banner");
const jobStage = document.getElementById("job-stage");
const jobStageDetail = document.getElementById("job-stage-detail");
const jobIDNode = document.getElementById("job-id");
const objectKeyNode = document.getElementById("object-key");
const resultsList = document.getElementById("results-list");

let currentJobID = "";
let pollTimer = null;

form.addEventListener("submit", handleSubmit);
retryButton.addEventListener("click", handleRetry);

function selectedTransforms() {
  const values = new FormData(form).getAll("variant");
  return values.map((value) => TRANSFORMS[value]).filter(Boolean);
}

async function handleSubmit(event) {
  event.preventDefault();

  const file = fileInput.files?.[0];
  if (!file) {
    showBanner("Choose an image before submitting.");
    return;
  }

  const transforms = selectedTransforms();
  if (transforms.length === 0) {
    showBanner("Choose at least one variant.");
    return;
  }

  if (!file.type) {
    showBanner("This browser did not report an image content type. Try a PNG, JPG, WebP, or AVIF file.");
    return;
  }

  resetPolling();
  currentJobID = "";
  retryButton.hidden = true;
  jobIDNode.textContent = "Not created";
  objectKeyNode.textContent = "Not uploaded";
  resultsList.innerHTML = '<p class="muted">Outputs will appear here after the worker completes.</p>';
  setBusy(true);

  try {
    updateStage("Presigning upload", "Requesting a direct storage upload URL from the API.");
    const presign = await api("/v1/uploads/presign", {
      method: "POST",
      body: JSON.stringify({
        content_type: file.type,
        file_name: file.name,
      }),
    });

    objectKeyNode.textContent = presign.object_key;

    updateStage("Uploading source", "Sending the original file to object storage.");
    await fetch(presign.upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    }).then(assertResponse);

    updateStage("Creating job", "Persisting the job and enqueueing it for the worker.");
    const created = await api("/v1/jobs", {
      method: "POST",
      body: JSON.stringify({
        source_object_key: presign.object_key,
        requested_transforms: transforms,
        output_format: outputFormatInput.value,
      }),
    });

    currentJobID = created.job.id;
    jobIDNode.textContent = currentJobID;

    updateStage("Queued", "The job is now in Redis and waiting for worker capacity.");
    showBanner("Upload complete. The worker is processing the job now.", true);
    startPolling();
  } catch (error) {
    showBanner(error.message || "The request failed.");
    updateStage("Submission failed", "The job could not be submitted. See the error banner above.");
  } finally {
    setBusy(false);
  }
}

async function handleRetry() {
  if (!currentJobID) {
    return;
  }

  retryButton.hidden = true;
  setBusy(true);

  try {
    updateStage("Retrying", "Requeueing the failed job.");
    await api(`/v1/jobs/${currentJobID}/retry`, { method: "POST" });
    showBanner("Retry accepted. Polling the job again.", true);
    startPolling();
  } catch (error) {
    showBanner(error.message || "Retry failed.");
    retryButton.hidden = false;
  } finally {
    setBusy(false);
  }
}

function startPolling() {
  resetPolling();
  void pollJob();
  pollTimer = window.setInterval(() => {
    void pollJob();
  }, 2000);
}

function resetPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function pollJob() {
  if (!currentJobID) {
    return;
  }

  try {
    const { job } = await api(`/v1/jobs/${currentJobID}`);
    renderJob(job);

    if (job.status === "completed") {
      resetPolling();
      const results = await api(`/v1/jobs/${currentJobID}/results`);
      renderResults(results.outputs);
      showBanner("Job completed. Download links are ready.", true);
      return;
    }

    if (job.status === "failed" || job.status === "dead_lettered") {
      resetPolling();
      retryButton.hidden = false;
      showBanner(`Job ${job.status.replace("_", " ")}: ${job.failure_reason || "unknown error"}`);
    }
  } catch (error) {
    resetPolling();
    showBanner(error.message || "Polling failed.");
    updateStage("Polling failed", "The browser could not refresh job status.");
  }
}

function renderJob(job) {
  jobIDNode.textContent = job.id;
  objectKeyNode.textContent = job.source_object_key;

  switch (job.status) {
    case "queued":
      updateStage("Queued", "Waiting in Redis for the worker to claim it.");
      break;
    case "processing":
      updateStage("Processing", "The worker claimed the job and is generating variants.");
      break;
    case "completed":
      updateStage("Completed", "The outputs were uploaded back to storage and recorded.");
      break;
    case "failed":
      updateStage("Failed", job.failure_reason || "The worker reported a processing failure.");
      break;
    case "dead_lettered":
      updateStage("Dead-lettered", job.failure_reason || "The job exhausted retries and moved to the DLQ.");
      break;
    default:
      updateStage(job.status, "Job status returned by the API.");
      break;
  }
}

function renderResults(outputs) {
  if (!outputs.length) {
    resultsList.innerHTML = '<p class="muted">The job finished, but no outputs were stored.</p>';
    return;
  }

  resultsList.innerHTML = outputs
    .map(
      (output) => `
        <article class="result-item">
          <div class="result-head">
            <strong>${escapeHTML(output.variant_name)}</strong>
            <span>${escapeHTML(output.content_type)}</span>
          </div>
          <code>${escapeHTML(output.object_key)}</code>
          <a class="result-link" href="${escapeAttribute(output.download_url)}" target="_blank" rel="noreferrer">
            Download ${escapeHTML(formatBytes(output.size_bytes))}
          </a>
        </article>
      `,
    )
    .join("");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  return response.json().catch(() => {
    throw new Error("The server returned an unreadable response.");
  }).then((payload) => {
    if (!response.ok) {
      throw new Error(payload.error || `Request failed with status ${response.status}`);
    }

    return payload;
  });
}

async function assertResponse(response) {
  if (response.ok) {
    return;
  }

  const body = await response.text().catch(() => "");
  throw new Error(body || `Upload failed with status ${response.status}`);
}

function setBusy(isBusy) {
  submitButton.disabled = isBusy;
  retryButton.disabled = isBusy;
  submitButton.textContent = isBusy ? "Working…" : "Upload and process";
}

function updateStage(title, detail) {
  jobStage.textContent = title;
  jobStageDetail.textContent = detail;
}

function showBanner(message, success = false) {
  banner.hidden = false;
  banner.className = `message-banner${success ? " success" : ""}`;
  banner.textContent = message;
}

function formatBytes(value) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
