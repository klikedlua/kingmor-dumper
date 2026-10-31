
const $ = id => document.getElementById(id);

let report = "";

const source = $("source");

source.addEventListener("input", () => {
  $("characterCount").textContent =
    source.value.length.toLocaleString() + " characters";
});

$("file").addEventListener("change", async event => {
  const file = event.target.files[0];

  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    alert("Maximum file size is 2 MB.");
    return;
  }

  source.value = await file.text();

  $("characterCount").textContent =
    source.value.length.toLocaleString() + " characters";
});

$("analyze").addEventListener("click", async () => {
  if (!source.value.trim()) {
    $("output").textContent = "Please enter source code first.";
    return;
  }

  const button = $("analyze");

  button.disabled = true;
  button.textContent = "ANALYZING...";

  $("status").textContent = "PROCESSING";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source: source.value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    $("output").textContent = data.summary;

    $("bytes").textContent =
      data.stats.bytes.toLocaleString();

    $("lines").textContent =
      data.stats.lines.toLocaleString();

    $("readability").textContent =
      data.stats.readability + "%";

    $("fragments").textContent =
      data.stats.fragmentCount;

    $("status").textContent = "COMPLETE";

    const list = $("fragmentList");

    list.replaceChildren();

    if (data.fragments.length === 0) {
      list.textContent = "No visible fragments found.";
    }

    data.fragments.forEach(fragment => {
      const item = document.createElement("div");

      item.className = "fragment";
      item.textContent = fragment;

      list.appendChild(item);
    });

    report =
      data.summary +
      "\n\nFRAGMENTS\n" +
      data.fragments.join("\n");

    $("download").disabled = false;

  } catch (error) {
    $("output").textContent = error.message;
    $("status").textContent = "ERROR";

  } finally {
    button.disabled = false;
    button.textContent = "ANALYZE SOURCE →";
  }
});

$("download").addEventListener("click", () => {
  if (!report) return;

  const blob = new Blob(
    [report],
    { type: "text/plain" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = "kingmor-analysis.txt";
  a.click();

  URL.revokeObjectURL(url);
});

