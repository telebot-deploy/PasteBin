/* ==========================================================
    PasteBin Frontend
========================================================== */

"use strict";

/* ==========================================================
    CONFIG
========================================================== */

const CONFIG = {
    API_BASE: "/api",
    STORAGE_KEY: "pastebin_user_id",
    DRAFT_KEY: "pastebin_draft",
    THEME_KEY: "pastebin_theme",
    VERSION: "1.0"
};

/* ==========================================================
    APPLICATION STATE
========================================================== */

const State = {
    currentPage: "loading",
    currentPaste: null,
    userId: localStorage.getItem(CONFIG.STORAGE_KEY),
    editor: null,
    dashboard: [],
    filteredDashboard: [],
    deleteSlug: null,
    loading: false
};

/* ==========================================================
    DOM REFERENCES
========================================================== */

const DOM = {
    pages: document.querySelectorAll(".page"),
    createPage: document.getElementById("createPage"),
    viewPage: document.getElementById("viewPage"),
    dashboardPage: document.getElementById("dashboardPage"),
    notFoundPage: document.getElementById("notFoundPage"),
    loadingOverlay: document.getElementById("loadingOverlay"),
    loadingText: document.getElementById("loadingText"),
    toast: document.getElementById("toast"),
    toastTitle: document.getElementById("toastTitle"),
    toastMessage: document.getElementById("toastMessage"),
    themeToggle: document.getElementById("themeToggle")
};

/* ==========================================================
    API
========================================================== */

const API = {
    async request(endpoint, options = {}) {
        // Get token from state
        const token = State.userId;
        
        // Prepare headers
        const headers = {
            "Content-Type": "application/json"
        };
        if (token) {
            headers["Authorization"] = "Bearer " + token;
        }

        try {
            const response = await fetch(
                CONFIG.API_BASE + endpoint,
                {
                    headers: headers,
                    ...options
                }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(
                    data.error || "Unknown server error"
                );
            }
            return data;
        } catch (error) {
            UI.toast("Error", error.message, "error");
            throw error;
        }
    }
};

/* ==========================================================
    UI
========================================================== */

const UI = {
    showPage(page) {
        DOM.pages.forEach(
            p => p.classList.add("hidden")
        );
        page.classList.remove("hidden");
    },

    loading(show, text = "Loading...") {
        State.loading = show;
        if (show) {
            DOM.loadingText.textContent = text;
            DOM.loadingOverlay.classList.remove("hidden");
        } else {
            DOM.loadingOverlay.classList.add("hidden");
        }
    },

    toast(title, message, type = "success") {
        DOM.toastTitle.textContent = title;
        DOM.toastMessage.textContent = message;
        const icon = DOM.toast.querySelector("i");
        icon.className = "";
        switch (type) {
            case "error":
                icon.classList.add(
                    "fa-solid",
                    "fa-circle-xmark"
                );
                break;
            case "warning":
                icon.classList.add(
                    "fa-solid",
                    "fa-triangle-exclamation"
                );
                break;
            default:
                icon.classList.add(
                    "fa-solid",
                    "fa-circle-check"
                );
        }
        DOM.toast.classList.remove("hidden");
        clearTimeout(
            UI.toastTimer
        );
        UI.toastTimer = setTimeout(
            () => {
                DOM.toast.classList.add(
                    "hidden"
                );
            },
            3500
        );
    }
};

/* ==========================================================
    ROUTER
========================================================== */

const Router = {
    async start() {
        const path =
            window.location.pathname;
        if (
            path === "/" ||
            path === "/index.html"
        ) {
            State.currentPage = "create";
            UI.showPage(
                DOM.createPage
            );
            return;
        }
        if (
            path === "/dashboard"
        ) {
            State.currentPage = "dashboard";
            UI.showPage(
                DOM.dashboardPage
            );
            Dashboard.load();
            return;
        }
        const slug =
            path.replace("/", "");
        if (slug.length > 0) {
            State.currentPage = "view";
            UI.showPage(
                DOM.viewPage
            );
            Paste.load(slug);
            return;
        }
        UI.showPage(
            DOM.notFoundPage
        );
    },

    navigate(path) {
        history.pushState({}, "", path);
        this.start();
    }
};

/* ==========================================================
    UTILITIES
========================================================== */

const Utils = {
    formatDate(date) {
        return new Date(date)
            .toLocaleString();
    },

    copy(text) {
        navigator.clipboard
            .writeText(text);
    },

    download(filename, content) {
        const blob =
            new Blob(
                [content],
                {
                    type: "text/plain"
                }
            );
        const url =
            URL.createObjectURL(blob);
        const a =
            document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    debounce(func, delay = 300) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(
                () => func(...args),
                delay
            );
        };
    },

    formatBytes(bytes) {
        if (bytes < 1024)
            return bytes + " B";
        if (bytes < 1024 * 1024)
            return (bytes / 1024).toFixed(2) + " KB";
        return (bytes / 1024 / 1024).toFixed(2) + " MB";
    }
};

/* ==========================================================
    CREATE PASTE
========================================================== */

const Paste = {};

Object.assign(Paste, {
    init() {
        this.cacheDOM();
        this.bindEvents();
        this.restoreDraft();
        this.updateStats();
        this.setupPreview();
    },

    cacheDOM() {
        this.title =
            document.getElementById("pasteTitle");
        this.language =
            document.getElementById("language");
        this.expiry =
            document.getElementById("expiry");
        this.editor =
            document.getElementById("pasteContent");
        this.characters =
            document.getElementById("charCount");
        this.words =
            document.getElementById("wordCount");
        this.lines =
            document.getElementById("lineCount");
        this.createBtn =
            document.getElementById("createPasteBtn");
        this.clearBtn =
            document.getElementById("clearBtn");
        this.downloadBtn =
            document.getElementById("downloadDraftBtn");
        this.fileInput =
            document.getElementById("fileInput");
        this.dropZone =
            document.getElementById("dropZone");
        this.previewBtn =
            document.getElementById("previewBtn");
        this.chooseFileBtn = 
            document.getElementById("chooseFile");
    },

    bindEvents() {
        this.editor.addEventListener(
            "input",
            () => {
                this.updateStats();
                this.saveDraft();
            }
        );

        this.title.addEventListener(
            "input",
            () => this.saveDraft()
        );

        this.language.addEventListener(
            "change",
            () => this.saveDraft()
        );

        this.expiry.addEventListener(
            "change",
            () => this.saveDraft()
        );

        this.createBtn.addEventListener(
            "click",
            () => this.create()
        );

        this.clearBtn.addEventListener(
            "click",
            () => this.clear()
        );

        this.downloadBtn.addEventListener(
            "click",
            () => this.downloadDraft()
        );

        this.fileInput.addEventListener(
            "change",
            e => this.loadFile(e)
        );

        this.chooseFileBtn.addEventListener("click", () => {
            this.fileInput.click();
        });

        this.setupDropZone();
    },

    setupPreview() {
        if (this.previewBtn) {
            this.previewBtn.addEventListener(
                "click",
                () => {
                    const content = this.editor.value;
                    const lang = this.language.value;
                    document.getElementById("previewContainer").textContent = content || "(empty)";
                    document.getElementById("previewLanguage").textContent = lang;
                    document.getElementById("previewModal").classList.remove("hidden");
                }
            );
        }
    },

    updateStats() {
        const text = this.editor.value;
        this.characters.textContent =
            text.length;
        const words = text
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        this.words.textContent =
            words.length;
        this.lines.textContent =
            text.split("\n").length;
    },

    saveDraft() {
        localStorage.setItem(
            CONFIG.DRAFT_KEY,
            JSON.stringify({
                title: this.title.value,
                language: this.language.value,
                expiry: this.expiry.value,
                content: this.editor.value
            })
        );
    },

    restoreDraft() {
        const draft =
            localStorage.getItem(
                CONFIG.DRAFT_KEY
            );
        if (!draft) return;
        try {
            const data =
                JSON.parse(draft);
            this.title.value =
                data.title || "";
            this.language.value =
                data.language || "text";
            this.expiry.value =
                data.expiry || "never";
            this.editor.value =
                data.content || "";
        } catch {
        }
    },

    clear() {
        if (
            !confirm(
                "Clear the current draft?"
            )
        ) return;
        this.title.value = "";
        this.editor.value = "";
        this.language.value = "text";
        this.expiry.value = "never";
        localStorage.removeItem(
            CONFIG.DRAFT_KEY
        );
        this.updateStats();
    },

    downloadDraft() {
        Utils.download(
            (this.title.value || "draft") + ".txt",
            this.editor.value
        );
    },

    async loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    this.editor.value = await file.text();
    this.title.value = file.name;
    this.updateStats();
    this.saveDraft();
    this.fileInput.value = "";  // reset to allow re-upload
    UI.toast("File Loaded", `"${file.name}" loaded successfully.`);
    },

    setupDropZone() {
        const zone = this.dropZone;
        zone.addEventListener(
            "dragover",
            e => {
                e.preventDefault();
                zone.classList.add(
                    "dragover"
                );
            }
        );
        zone.addEventListener(
            "dragleave",
            () => {
                zone.classList.remove(
                    "dragover"
                );
            }
        );
        zone.addEventListener("drop", async e => {
    e.preventDefault();
    zone.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (!file) return;
    this.editor.value = await file.text();
    this.title.value = file.name;
    this.updateStats();
    this.saveDraft();
    this.fileInput.value = "";  // reset
    UI.toast("File Loaded", `"${file.name}" dropped successfully.`);
});
    },

    async create() {
    if (!this.editor.value.trim()) {
        UI.toast("Empty", "Paste content is empty.", "warning");
        return;
    }

    UI.loading(true, "Creating paste...");

    try {
        const body = {
            title: this.title.value,
            language: this.language.value,
            expiry: this.expiry.value,
            content: this.editor.value
        };
        // Only send token if we have one
        if (State.userId) {
            body.auth_token = State.userId;
        }

        const result = await API.request("/pastes", {
            method: "POST",
            body: JSON.stringify(body)
        });

        // Store the token if it's new
        if (result.auth_token && !State.userId) {
            State.userId = result.auth_token;
            localStorage.setItem(CONFIG.STORAGE_KEY, result.auth_token);
        }

        localStorage.removeItem(CONFIG.DRAFT_KEY);
        UI.toast("Success", "Paste created.");
        Router.navigate("/" + result.slug);
    } finally {
        UI.loading(false);
        }
    }
});

/* ==========================================================
    VIEW PASTE
========================================================== */

Object.assign(Paste, {
    async load(slug) {
        UI.loading(true, "Loading paste...");
        try {
            const data = await API.request(
                "/pastes/" + slug
            );
            State.currentPaste = data;
            this.render(data);

            if (data.is_owner) {
            const deleteBtn = document.getElementById("deletePasteBtn");
            const badge = document.getElementById("ownerBadge");
            if (deleteBtn) deleteBtn.classList.remove("hidden");
            if (badge) badge.classList.remove("hidden");
            }
        } catch {
            UI.showPage(
                DOM.notFoundPage
            );
        } finally {
            UI.loading(false);
        }
    },

    render(paste) {
    document.getElementById("viewTitle").textContent =
        paste.title || "Untitled Paste";
    document.getElementById("viewSlug").textContent =
        paste.slug;
    document.getElementById("viewLanguage").textContent =
        paste.language;
    document.getElementById("viewCreated").textContent =
        Utils.formatDate(paste.created_at);
    document.getElementById("viewExpiry").textContent =
        paste.expires_at
            ? Utils.formatDate(paste.expires_at)
            : "Never";

    const codeBlock = document.getElementById("codeBlock");
    codeBlock.textContent = paste.content;

    // Syntax highlighting
    if (typeof hljs !== 'undefined') {
        const langMap = {
            'javascript': 'javascript',
            'python': 'python',
            'cpp': 'cpp',
            'c': 'c',
            'java': 'java',
            'typescript': 'typescript',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'bash': 'bash',
            'sql': 'sql',
            'markdown': 'markdown',
            'text': 'plaintext'
        };
        const lang = langMap[paste.language] || 'plaintext';
        codeBlock.className = 'language-' + lang;
        try {
            hljs.highlightElement(codeBlock);
        } catch (e) {
            console.warn('Highlight.js error:', e);
        }
    }

    document.getElementById("languageBadge").textContent =
        paste.language.charAt(0).toUpperCase() + paste.language.slice(1);

    document.getElementById("pasteUrl").value =
        location.origin + "/" + paste.slug;

    this.populateStats(paste);
    this.populateInfo(paste);
    this.checkOwnership(paste);  // Now uses is_owner
    this.bindViewButtons();
},

    checkOwnership(paste) {
    const badge = document.getElementById("ownerBadge");
    const deleteBtn = document.getElementById("deletePasteBtn");
    if (!badge || !deleteBtn) {
        console.warn("Owner badge or delete button missing from DOM");
        return;
    }
    if (paste.is_owner) {
        badge.classList.remove("hidden");
        deleteBtn.classList.remove("hidden");
        // Force display in case of CSS conflicts
        badge.style.display = "flex";
        deleteBtn.style.display = "flex";
    } else {
        badge.classList.add("hidden");
        deleteBtn.classList.add("hidden");
        badge.style.display = "none";
        deleteBtn.style.display = "none";
        }
    },

    populateStats(paste) {
        const text = paste.content;
        document.getElementById("viewCharacters").textContent =
            text.length;
        document.getElementById("viewWords").textContent =
            text.trim()
                .split(/\s+/)
                .filter(Boolean).length;
        document.getElementById("viewLines").textContent =
            text.split("\n").length;
        document.getElementById("viewSize").textContent =
            (new Blob([text]).size / 1024)
                .toFixed(2) + " KB";
    },

    populateInfo(paste) {
        document.getElementById("infoSlug").textContent =
            paste.slug;
        document.getElementById("infoLanguage").textContent =
            paste.language;
        document.getElementById("infoCreated").textContent =
            Utils.formatDate(
                paste.created_at
            );
        document.getElementById("infoExpiry").textContent =
            paste.expires_at
                ? Utils.formatDate(paste.expires_at)
                : "Never";
        document.getElementById("infoChars").textContent =
            paste.content.length;
        document.getElementById("infoLines").textContent =
            paste.content.split("\n").length;
    },

    checkOwnership(paste) {
        const badge =
            document.getElementById(
                "ownerBadge"
            );
        const deleteBtn =
            document.getElementById(
                "deletePasteBtn"
            );
        if (
            State.userId &&
            paste.user_id === State.userId
        ) {
            badge.classList.remove("hidden");
            deleteBtn.classList.remove("hidden");
        }
    },

    bindViewButtons() {
        document.getElementById("copyPasteBtn").onclick = () => {
            Utils.copy(
                State.currentPaste.content
            );
            UI.toast(
                "Copied",
                "Paste copied."
            );
        };

        document.getElementById("copyLinkBtn").onclick = () => {
            Utils.copy(location.href);
            UI.toast(
                "Copied",
                "Link copied."
            );
        };

        document.getElementById("copyUrlBtn").onclick = () => {
            Utils.copy(location.href);
            UI.toast(
                "Copied",
                "URL copied."
            );
        };

        document.getElementById("downloadPasteBtn").onclick = () => {
            Utils.download(
                (State.currentPaste.title || "paste") + ".txt",
                State.currentPaste.content
            );
        };

        document.getElementById("shareBtn").onclick = () => {
            if (navigator.share) {
                navigator.share({
                    title: State.currentPaste.title,
                    url: location.href
                });
            } else {
                document
                    .getElementById("shareModal")
                    .classList
                    .remove("hidden");
                document
                    .getElementById("shareLink")
                    .value = location.href;
            }
        };


        document.getElementById("fullscreenBtn").onclick = () => {
            document
                .querySelector(".code-card")
                .classList
                .toggle("fullscreen");
        };

        document.getElementById("deletePasteBtn").onclick = () => {
            State.deleteSlug =
                State.currentPaste.slug;
            document
                .getElementById("deleteModal")
                .classList
                .remove("hidden");
        };
    }
});

/* ==========================================================
    DASHBOARD
========================================================== */

const Dashboard = {};

Object.assign(Dashboard, {
    page: 1,
    perPage: 12,

    async load() {
        UI.loading(true, "Loading your pastes...");
        try {
            const data = await API.request(
                "/pastes/mine"
            );
            State.dashboard = data;
            State.filteredDashboard = [...data];
            this.render();
            this.bind();
            this.updateStats();
        } finally {
            UI.loading(false);
        }
    },

    bind() {
        document
            .getElementById("searchInput")
            .oninput = Utils.debounce(e => {
                this.search(
                    e.target.value
                );
            });

        document
            .getElementById("sortSelect")
            .onchange = e => {
                this.sort(
                    e.target.value
                );
            };

        document
            .getElementById("prevPage")
            .onclick = () => {
                if (this.page > 1) {
                    this.page--;
                    this.render();
                }
            };

        document
            .getElementById("nextPage")
            .onclick = () => {
                const max = Math.ceil(
                    State.filteredDashboard.length /
                    this.perPage
                );
                if (this.page < max) {
                    this.page++;
                    this.render();
                }
            };
    },

    search(query) {
        query = query.toLowerCase();
        State.filteredDashboard =
            State.dashboard.filter(
                paste =>
                    paste.title.toLowerCase().includes(query) ||
                    paste.slug.toLowerCase().includes(query) ||
                    paste.language.toLowerCase().includes(query)
            );
        this.page = 1;
        this.render();
    },

    sort(type) {
        const arr = State.filteredDashboard;
        switch (type) {
            case "title":
                arr.sort((a, b) =>
                    a.title.localeCompare(b.title)
                );
                break;
            case "language":
                arr.sort((a, b) =>
                    a.language.localeCompare(b.language)
                );
                break;
            case "oldest":
                arr.sort((a, b) =>
                    new Date(a.created_at) -
                    new Date(b.created_at)
                );
                break;
            default: // newest
                arr.sort((a, b) =>
                    new Date(b.created_at) -
                    new Date(a.created_at)
                );
        }
        this.render();
    },

    render() {
        const grid =
            document.getElementById(
                "pasteGrid"
            );
        grid.innerHTML = "";

        const start =
            (this.page - 1) *
            this.perPage;
        const end =
            start +
            this.perPage;
        const data =
            State.filteredDashboard
                .slice(start, end);

        if (!data.length) {
            document
                .getElementById(
                    "emptyDashboard"
                )
                .classList
                .remove("hidden");
            document
                .getElementById("pagination")
                .classList.add("hidden");
            return;
        }

        document
            .getElementById(
                "emptyDashboard"
            )
            .classList
            .add("hidden");
        document
            .getElementById("pagination")
            .classList.remove("hidden");

        const template =
            document
                .getElementById(
                    "pasteCardTemplate"
                );

        data.forEach(paste => {
            const card =
                template.content
                    .cloneNode(true);

            card.querySelector(
                ".card-title"
            ).textContent =
                paste.title ||
                "Untitled";
            card.querySelector(
                ".card-slug"
            ).textContent =
                paste.slug;
            card.querySelector(
                ".language-pill"
            ).textContent =
                paste.language;
            card.querySelector(
                ".created-date"
            ).textContent =
                Utils.formatDate(
                    paste.created_at
                );
            card.querySelector(
                ".expiry-date"
            ).textContent =
                paste.expires_at ||
                "Never";

            card.querySelector(
                ".viewBtn"
            ).onclick = () => {
                location.href = "/" + paste.slug;
            };

            card.querySelector(
                ".copyBtn"
            ).onclick = () => {
                Utils.copy(
                    location.origin +
                    "/" + paste.slug
                );
                UI.toast(
                    "Copied",
                    "URL copied."
                );
            };

            card.querySelector(
                ".downloadBtn"
            ).onclick = () => {
                window.open(
                    CONFIG.API_BASE +
                    "/pastes/" +
                    paste.slug +
                    "/raw"
                );
            };

            card.querySelector(
                ".deleteBtn"
            ).onclick = () => {
                State.deleteSlug =
                    paste.slug;
                document
                    .getElementById(
                        "deleteModal"
                    )
                    .classList
                    .remove(
                        "hidden"
                    );
            };

            grid.appendChild(card);
        });

        document
            .getElementById(
                "pageInfo"
            ).textContent =
            `Page ${this.page}`;
    },

    updateStats() {
        document
            .getElementById(
                "totalPastes"
            )
            .textContent =
            State.dashboard.length;

        document
            .getElementById(
                "activePastes"
            )
            .textContent =
            State.dashboard.filter(
                p => !p.expired
            ).length;

        document
            .getElementById(
                "expiredPastes"
            )
            .textContent =
            State.dashboard.filter(
                p => p.expired
            ).length;

        const total =
            State.dashboard.reduce(
                (a, p) => a + (p.bytes || 0),
                0
            );
        document
            .getElementById(
                "storageUsed"
            )
            .textContent =
            Utils.formatBytes(total);
    }
});

/* ==========================================================
    GLOBAL UI
========================================================== */

const Global = {
    init() {
        this.toast();
        this.deleteModal();
        this.shareModal();
        this.previewModal();
        this.theme();
        this.shortcuts();
    },

    toast() {
        document
            .getElementById("toastClose")
            .onclick = () =>
                DOM.toast.classList.add("hidden");
    },

    deleteModal() {
        const modal =
            document.getElementById(
                "deleteModal"
            );
        document
            .getElementById(
                "cancelDelete"
            )
            .onclick = () => {
                modal.classList.add(
                    "hidden"
                );
            };
        document
            .getElementById(
                "confirmDelete"
            )
            .onclick = async () => {
                if (!State.deleteSlug)
                    return;
                UI.loading(
                    true,
                    "Deleting paste..."
                );
                try {
                    await API.request(
                        "/pastes/" +
                        State.deleteSlug,
                        {
                            method: "DELETE"
                        }
                    );
                    UI.toast(
                        "Deleted",
                        "Paste deleted."
                    );
                    modal.classList.add(
                        "hidden"
                    );
                    if (
                        State.currentPage ===
                        "dashboard"
                    ) {
                        Dashboard.load();
                    } else {
                        location.href = "/";
                    }
                } finally {
                    UI.loading(false);
                }
            };
    },

    shareModal() {
        const modal =
            document.getElementById(
                "shareModal"
            );
        document
            .getElementById(
                "closeShare"
            )
            .onclick = () =>
                modal.classList.add(
                    "hidden"
                );
        document
            .getElementById(
                "copyShareLink"
            )
            .onclick = () => {
                Utils.copy(
                    document
                        .getElementById(
                            "shareLink"
                        )
                        .value
                );
                UI.toast(
                    "Copied",
                    "Share link copied."
                );
            };
    },

    previewModal() {
        const modal =
            document.getElementById(
                "previewModal"
            );
        document
            .getElementById(
                "closePreview"
            )
            .onclick = () =>
                modal.classList.add(
                    "hidden"
                );
        // close on backdrop click
        modal.addEventListener("click", (e) => {
            if (e.target === modal)
                modal.classList.add("hidden");
        });
    },

    theme() {
        const current =
            localStorage.getItem(
                CONFIG.THEME_KEY
            );
        if (
            current === "light"
        ) {
            document.body
                .classList.add(
                    "light"
                );
        }
        DOM.themeToggle.onclick = () => {
            document.body
                .classList.toggle(
                    "light"
                );
            localStorage.setItem(
                CONFIG.THEME_KEY,
                document.body
                    .classList
                    .contains("light")
                    ? "light"
                    : "dark"
            );
        };
    },

    shortcuts() {
        document
            .addEventListener(
                "keydown",
                e => {
                    /* CTRL+S */
                    if (
                        e.ctrlKey &&
                        e.key === "s"
                    ) {
                        e.preventDefault();
                        if (
                            State.currentPage ===
                            "create"
                        ) {
                            Paste.create();
                        }
                    }
                    /* CTRL+D */
                    if (
                        e.ctrlKey &&
                        e.key === "d"
                    ) {
                        e.preventDefault();
                        if (
                            State.currentPaste
                        ) {
                            Utils.download(
                                State.currentPaste.title + ".txt",
                                State.currentPaste.content
                            );
                        }
                    }
                    /* CTRL+L */
                    if (
                        e.ctrlKey &&
                        e.key === "l"
                    ) {
                        e.preventDefault();
                        Utils.copy(
                            location.href
                        );
                        UI.toast(
                            "Copied",
                            "URL copied."
                        );
                    }
                    /* ESC */
                    if (
                        e.key === "Escape"
                    ) {
                        document
                            .querySelectorAll(
                                ".modal"
                            )
                            .forEach(
                                m => m.classList.add(
                                    "hidden"
                                )
                            );
                    }
                }
            );
    }
};

/* ==========================================================
    NAVIGATION
========================================================== */

const Navigation = {
    init() {
        const homeBtn =
            document.getElementById(
                "homeBtn"
            );
        const dashboardBtn =
            document.getElementById(
                "dashboardBtn"
            );
        const newPasteBtn =
            document.getElementById(
                "newPasteBtn"
            );
        const goHomeBtn =
            document.getElementById(
                "goHomeBtn"
            );
        const createFirstBtn =
            document.getElementById(
                "createFirstPasteBtn"
            );

        if (homeBtn) {
            homeBtn.onclick = () => {
                Router.navigate("/");
            };
        }

        if (dashboardBtn) {
            dashboardBtn.onclick = () => {
                Router.navigate("/dashboard");
            };
        }

        if (newPasteBtn) {
            newPasteBtn.onclick = () => {
                Router.navigate("/");
            };
        }

        if (goHomeBtn) {
            goHomeBtn.onclick = () => {
                Router.navigate("/");
            };
        }

        if (createFirstBtn) {
            createFirstBtn.onclick = () => {
                Router.navigate("/");
            };
        }

        window.onpopstate = () => {
            Router.start();
        };
    }
};

/* ==========================================================
    APP
========================================================== */

const App = {
    async init() {
        console.log(
            `PasteBin v${CONFIG.VERSION}`
        );
        Global.init();
        Navigation.init();
        Paste.init();
        await Router.start();
    }
};

/* ==========================================================
    START
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        App.init();
    }
);