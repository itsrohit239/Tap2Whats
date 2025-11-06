document.addEventListener("DOMContentLoaded", function () {
  const dynamicIsland = document.getElementById("dynamicIsland");
  const formContent = document.getElementById("formContent");
  const sendBtn = document.getElementById("sendBtn");
  const mobileInput = document.getElementById("mobileNumber");
  const messageInput = document.getElementById("customMessage");
  const countrySelect = document.getElementById("countryCode");
  const generateQrBtn = document.getElementById("generateQrBtn");
  const downloadQrBtn = document.getElementById("downloadQrBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const qrPreview = document.getElementById("qrPreview");

  const countries = [
    { name: "United States", code: "1" },
    { name: "United Kingdom", code: "44" },
    { name: "India", code: "91" },
    { name: "Australia", code: "61" },
    { name: "Canada", code: "1" },
    { name: "Germany", code: "49" },
    { name: "France", code: "33" },
  ];

  function populateCountryCodes() {
    countries.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.code;
      opt.textContent = `${c.name} (+${c.code})`;
      countrySelect.appendChild(opt);
    });
    countrySelect.value = "91";
  }

  function openForm() {
    if (!dynamicIsland.classList.contains("active")) {
      dynamicIsland.classList.add("active");
      formContent.classList.add("show");
    }
  }

  dynamicIsland.addEventListener("click", openForm);
  dynamicIsland.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") openForm();
  });

  function normalizeNumber(countryCode, number) {
    let n = String(number || "").replace(/\D/g, "");
    if (!n) return "";
    if (n.startsWith("0")) n = n.replace(/^0+/, "");
    if (n.startsWith(countryCode)) return n;
    return countryCode + n;
  }

  function buildWhatsappUrl(fullNumber, message) {
    const encoded = encodeURIComponent(message || "Hi");
    return `https://wa.me/${fullNumber}?text=${encoded}`;
  }

  function validateNumber(fullNumber) {
    return /^\d{8,15}$/.test(fullNumber);
  }

  const errorEl = document.getElementById("errorMsg");

  function setError(msg) {
    if (!errorEl) return;
    errorEl.classList.remove("d-none");
    errorEl.classList.remove("text-success");
    errorEl.classList.add("text-danger");
    errorEl.textContent = msg;
    mobileInput.classList.add("is-invalid");
    mobileInput.classList.remove("is-valid");
    clearTimeout(setError._t);
    setError._t = setTimeout(() => {
      errorEl.classList.add("d-none");
      errorEl.textContent = "";
    }, 3500);
  }

  function setSuccess(msg) {
    if (!errorEl) return;
    errorEl.classList.remove("d-none");
    errorEl.classList.remove("text-danger");
    errorEl.classList.add("text-success");
    errorEl.textContent = msg;
    mobileInput.classList.add("is-valid");
    mobileInput.classList.remove("is-invalid");
    clearTimeout(setSuccess._t);
    setSuccess._t = setTimeout(() => {
      errorEl.classList.add("d-none");
      errorEl.textContent = "";
    }, 2500);
  }

  function sendMessage() {
    const selectedCode = countrySelect.value || "91";
    const normalized = normalizeNumber(selectedCode, mobileInput.value.trim());
    if (!validateNumber(normalized)) {
      setError(
        "Please insert a valid mobile number (remove spaces/symbols and include the correct country code)."
      );
      return;
    }
    const url = buildWhatsappUrl(normalized, messageInput.value.trim());
    window.open(url, "_blank");
    sendBtn.classList.remove("btn-animate");
    void sendBtn.offsetWidth;
    sendBtn.classList.add("btn-animate");
    saveRecent(normalized, messageInput.value.trim());
    setSuccess("Opened WhatsApp. Saved to recent.");
  }

  function clearQrPreview() {
    qrPreview.innerHTML = "";
    downloadQrBtn.disabled = true;
  }

  let lastQrDataUrl = null;

  function generateQr() {
    clearQrPreview();
    const selectedCode = countrySelect.value || "91";
    const normalized = normalizeNumber(selectedCode, mobileInput.value.trim());
    if (!validateNumber(normalized)) {
      setError("Please insert a valid mobile number to generate a QR code.");
      return;
    }
    const url = buildWhatsappUrl(normalized, messageInput.value.trim());
    const qr = new QRious({
      value: url,
      size: 300,
      level: "H",
    });
    const img = document.createElement("img");
    img.src = qr.toDataURL("image/png");
    img.alt = "WhatsApp QR code";
    img.style.width = "100%";
    img.style.maxWidth = "300px";
    qrPreview.appendChild(img);
    lastQrDataUrl = qr.toDataURL("image/png");
    downloadQrBtn.disabled = false;
  }

  function downloadQr() {
    if (!lastQrDataUrl) return;
    const a = document.createElement("a");
    a.href = lastQrDataUrl;
    a.download = "whatsapp-qr.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setSuccess("QR downloaded");
  }

  function copyLink() {
    const selectedCode = countrySelect.value || "91";
    const normalized = normalizeNumber(selectedCode, mobileInput.value.trim());
    if (!validateNumber(normalized)) {
      setError("Please insert a valid mobile number to copy the link.");
      return;
    }
    const url = buildWhatsappUrl(normalized, messageInput.value.trim());
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        copyLinkBtn.textContent = "Link Copied";
        setTimeout(
          () =>
            (copyLinkBtn.innerHTML = '<i class="fas fa-link"></i> Copy Link'),
          1500
        );
        setSuccess("Link copied to clipboard");
      });
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    copyLinkBtn.textContent = "Link Copied";
    setTimeout(
      () => (copyLinkBtn.innerHTML = '<i class="fas fa-link"></i> Copy Link'),
      1500
    );
    setSuccess("Link copied to clipboard");
  }

  // Recent history stored in localStorage (max 5 entries)
  const RECENT_KEY = "tap2whats_recent_v1";

  function loadRecent() {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveRecent(number, message) {
    if (!number) return;
    const list = loadRecent();
    const entry = { number, message: message || "", ts: Date.now() };
    const filtered = list.filter((i) => i.number !== number);
    filtered.unshift(entry);
    const trimmed = filtered.slice(0, 5);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
    } catch (e) {}
    renderRecentList();
  }

  function renderRecentList() {
    const container = document.getElementById("recentList");
    if (!container) return;
    const items = loadRecent();
    container.innerHTML = "";
    if (!items.length) {
      container.innerHTML = '<div class="text-muted">No recent numbers</div>';
      return;
    }
    const ul = document.createElement("div");
    ul.className = "list-group";
    items.forEach((it, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
      btn.innerHTML = `<div class="small"><strong>+${
        it.number
      }</strong><div class="text-muted small">${
        it.message || ""
      }</div></div><div><button data-idx="${idx}" class="btn btn-sm btn-link text-danger remove-recent" aria-label="Remove recent">&times;</button></div>`;
      btn.addEventListener("click", function (e) {
        if (e.target && e.target.closest(".remove-recent")) return;
        mobileInput.value = it.number
          .replace(new RegExp("^" + countrySelect.value), "")
          .replace(/^\+/, "");
        messageInput.value = it.message || "";
        setSuccess("Loaded from recent");
      });
      ul.appendChild(btn);
    });
    container.appendChild(ul);
    container.querySelectorAll(".remove-recent").forEach((el) => {
      el.addEventListener("click", function (ev) {
        ev.stopPropagation();
        const idx = Number(el.getAttribute("data-idx"));
        const list = loadRecent();
        list.splice(idx, 1);
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(list));
        } catch (e) {}
        renderRecentList();
      });
    });
  }

  populateCountryCodes();
  clearQrPreview();
  renderRecentList();

  sendBtn.addEventListener("click", sendMessage);
  generateQrBtn.addEventListener("click", generateQr);
  downloadQrBtn.addEventListener("click", downloadQr);
  copyLinkBtn.addEventListener("click", copyLink);

  mobileInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
  });
  messageInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
  });

  sendBtn.addEventListener("animationend", function () {
    sendBtn.classList.remove("btn-animate");
  });
});
