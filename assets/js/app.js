
/* =====================================================
   HYLOOKS v1.2
   Homepage Renderer - Newest Videos First
   ===================================================== */

const grid = document.getElementById("videoGrid");
const loading = document.getElementById("loadingGrid");
const template = document.getElementById("videoTemplate");

let VIDEO_DATABASE = [];
let FILTERED_DATABASE = [];
let currentSearch = "";
let currentCategory = new URLSearchParams(window.location.search).get("category") || "";
const categoryFilters = document.getElementById("categoryFilters");
const allCategoriesSelect = document.getElementById("allCategoriesSelect");
// The visible count adapts to available screen width; the remaining categories
// are placed in the All categories dropdown.
function getVisibleCategoryCount() {
    // Measure the room available for category buttons beside the dropdown.
    const bar = document.querySelector(".category-bar");
    if (!bar) return 1;
    const barWidth = bar.clientWidth;
    const dropdownWidth = allCategoriesSelect?.getBoundingClientRect().width || 120;
    const gaps = 16;
    const available = Math.max(0, barWidth - dropdownWidth - gaps);
    const sample = [...new Set(VIDEO_DATABASE.flatMap(getCategories))]
        .sort((a, b) => a.localeCompare(b));
    let used = 0;
    let count = 0;
    const gap = window.innerWidth <= 480 ? 3 : window.innerWidth <= 768 ? 4 : 8;
    const maxCount = 10;
    for (const category of sample.slice(0, maxCount)) {
        // Approximate text width and chip padding, then let CSS enforce layout.
        const chipWidth = Math.min(180, Math.max(42, category.length * (window.innerWidth <= 480 ? 5.4 : 6.2) + 22));
        if (used + chipWidth + (count ? gap : 0) > available) break;
        used += chipWidth + (count ? gap : 0);
        count++;
    }
    return count;
}
let categoryResizeTimer = null;

/* ================= SORT VIDEOS ================= */

function sortNewestFirst(videos) {
    return [...videos].sort((a, b) => {
        const numA = Number(String(a.id).match(/\d+/)?.[0] || 0);
        const numB = Number(String(b.id).match(/\d+/)?.[0] || 0);
        return numB - numA;
    });
}

/* ================= LOAD DATABASE ================= */

async function loadVideos() {
    try {
        const response = await fetch("assets/data/videos.json", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("videos.json not found");
        }

        const data = await response.json();

        VIDEO_DATABASE = sortNewestFirst(data.videos || []);
        renderCategoryFilters();
        applyFilters();

    } catch (err) {
        console.error(err);

        loading.style.display = "none";

        grid.innerHTML = `
            <div class="empty-state">
                <p>Failed to load videos.</p>
            </div>
        `;
    }
}

/* ================= RENDER ================= */

function renderVideos(list) {
    loading.style.display = "none";
    grid.innerHTML = "";

    if (!list.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>No videos found.</p>
            </div>
        `;
        return;
    }

    list.forEach(video => {
        const clone = template.content.cloneNode(true);

        clone.querySelector(".thumb").src = video.thumb;
        clone.querySelector(".thumb").alt = video.title;
        clone.querySelector(".duration").textContent = video.duration;
        clone.querySelector(".title").textContent = video.title;
        clone.querySelector(".views").textContent = `${video.views} Views`;

        clone.querySelector(".video-link").href =
            `watch.html?id=${encodeURIComponent(video.id)}`;

        grid.appendChild(clone);
    });
}

/* ================= CATEGORIES & SEARCH ================= */

function getCategories(video) {
    const raw = Array.isArray(video.categories) ? video.categories : (video.category ? [video.category] : []);
    return [...new Set(raw.map(value => String(value).trim()).filter(Boolean))];
}

function renderCategoryFilters() {
    if (!categoryFilters) return;
    const categories = [...new Set(VIDEO_DATABASE.flatMap(getCategories))]
        .sort((a, b) => a.localeCompare(b));
    categoryFilters.innerHTML = "";
    const visibleCount = getVisibleCategoryCount();
    const visibleCategories = categories.slice(0, visibleCount);
    const dropdownCategories = categories.slice(visibleCount);

    visibleCategories.forEach(category => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "category-chip";
        button.textContent = category;
        button.dataset.category = category;
        button.addEventListener("click", () => setCategory(category));
        categoryFilters.appendChild(button);
    });

    if (allCategoriesSelect) {
        allCategoriesSelect.innerHTML = '<option value="">All categories</option>';
        dropdownCategories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            allCategoriesSelect.appendChild(option);
        });
        allCategoriesSelect.hidden = dropdownCategories.length === 0;
        allCategoriesSelect.onchange = () => setCategory(allCategoriesSelect.value);
    }
    updateCategoryButtons();
}

function updateCategoryButtons() {
    document.querySelectorAll(".category-chip").forEach(button => {
        const active = (button.dataset.category || "") === currentCategory;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (allCategoriesSelect) {
        const optionExists = [...allCategoriesSelect.options].some(option => option.value === currentCategory);
        allCategoriesSelect.value = optionExists && currentCategory ? currentCategory : "";
    }
}

function setCategory(category) {
    currentCategory = category || "";
    updateCategoryButtons();
    applyFilters();
    const url = new URL(window.location.href);
    if (currentCategory) url.searchParams.set("category", currentCategory);
    else url.searchParams.delete("category");
    history.replaceState({}, "", url);
}

function applyFilters() {
    const keyword = currentSearch.trim().toLowerCase();
    FILTERED_DATABASE = VIDEO_DATABASE.filter(video => {
        const titleMatch = !keyword || String(video.title || "").toLowerCase().includes(keyword);
        const categoryMatch = !currentCategory || getCategories(video).some(category => category.toLowerCase() === currentCategory.toLowerCase());
        return titleMatch && categoryMatch;
    });
    renderVideos(FILTERED_DATABASE);
    updateCategoryButtons();
}


window.addEventListener("resize", () => {
    clearTimeout(categoryResizeTimer);
    categoryResizeTimer = setTimeout(renderCategoryFilters, 120);
});

window.filterVideos = function(keyword) {
    currentSearch = String(keyword || "");
    applyFilters();
};

window.filterByCategory = function(category) {
    setCategory(category);
};


/* ================= INIT ================= */

loadVideos();
