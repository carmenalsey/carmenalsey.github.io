
/* =====================================================
   HYLOOKS v1.2
   Watch Page Controller - Newest Videos First
   ===================================================== */

const player = document.getElementById("videoPlayer");
const loading = document.getElementById("playerLoading");

const titleEl = document.getElementById("videoTitle");
const viewsEl = document.getElementById("videoViews");
const categoriesEl = document.getElementById("videoCategories");

const sidebar = document.getElementById("sidebarVideos");
const template = document.getElementById("sidebarTemplate");
const relatedGrid = document.getElementById("relatedVideos");
const relatedTemplate = document.getElementById("relatedTemplate");
const RECOMMENDATION_COUNT = 16;
let sidebarRecommendedVideos = [];
let relatedRecommendedVideos = [];

const likeBtn = document.getElementById("likeBtn");
const likeCount = document.getElementById("likeCount");
const shareBtn = document.getElementById("shareBtn");
const copyBtn = document.getElementById("copyBtn");

let database = [];
let currentVideo = null;

/* ================= GET ID ================= */

const params = new URLSearchParams(window.location.search);
const videoID = params.get("id");

/* ================= SORT VIDEOS ================= */

function sortNewestFirst(videos) {
    return [...videos].sort((a, b) => {
        const numA = Number(String(a.id).match(/\d+/)?.[0] || 0);
        const numB = Number(String(b.id).match(/\d+/)?.[0] || 0);
        return numB - numA;
    });
}

/* ================= LOAD JSON ================= */

async function initWatchPage() {
    try {
        const res = await fetch("assets/data/videos.json", {
            cache: "no-store"
        });

        if (!res.ok) {
            throw new Error("videos.json failed to load");
        }

        const json = await res.json();

        database = sortNewestFirst(json.videos || []);

        if (!database.length) {
            titleEl.textContent = "No videos available";
            loading.classList.add("hide");
            return;
        }

        currentVideo =
            database.find(v => v.id === videoID) ||
            database[0];

        renderPlayer(currentVideo);
        // Ambil 32 video acak dalam satu pengacakan agar kedua bagian tidak tumpang tindih.
        // 16 pertama untuk sidebar, 16 berikutnya untuk Related Videos.
        const recommendations = chooseRandomVideos(
            database,
            currentVideo,
            RECOMMENDATION_COUNT * 2
        );
        sidebarRecommendedVideos = recommendations.slice(0, RECOMMENDATION_COUNT);
        relatedRecommendedVideos = recommendations.slice(RECOMMENDATION_COUNT, RECOMMENDATION_COUNT * 2);

        renderSidebar(sidebarRecommendedVideos);
        renderRelatedVideos(relatedRecommendedVideos);
        loadLike();

    } catch (err) {
        console.error(err);
        titleEl.textContent = "Failed to load video";
        loading.classList.add("hide");
    }
}

initWatchPage();

/* ================= PLAYER ================= */

function renderPlayer(video) {
    titleEl.textContent = video.title;
    viewsEl.textContent = `${video.views} Views`;
    renderVideoCategories(video);
    player.poster = video.thumb;

    loading.classList.remove("hide");

    const videoURL = HyLooksLoader.decode(video.video);

    player.src = videoURL;
    player.load();
}


/* ================= VIDEO CATEGORIES ================= */

function renderVideoCategories(video) {
    if (!categoriesEl) return;
    categoriesEl.innerHTML = "";
    const raw = Array.isArray(video.categories) ? video.categories : (video.category ? [video.category] : []);
    const categories = [...new Set(raw.map(value => String(value).trim()).filter(Boolean))];
    if (!categories.length) return;
    const label = document.createElement("span");
    label.className = "category-label";
    label.textContent = "Categories:";
    categoriesEl.appendChild(label);
    categories.forEach(category => {
        const link = document.createElement("a");
        link.className = "category-chip";
        link.textContent = category;
        link.href = `index.html?category=${encodeURIComponent(category)}`;
        categoriesEl.appendChild(link);
    });
}

/* ================= PLAYER EVENTS ================= */

player.addEventListener("loadeddata", () => {
    loading.classList.add("hide");
});

player.addEventListener("waiting", () => {
    loading.classList.remove("hide");
});

player.addEventListener("playing", () => {
    loading.classList.add("hide");
});

/* ================= RANDOM RECOMMENDATIONS ================= */

// Pick up to 16 random videos, excluding the video currently being watched.
function chooseRandomVideos(videos, activeVideo, limit = RECOMMENDATION_COUNT) {
    const candidates = videos.filter(video => video && video.id !== activeVideo?.id);

    // Fisher-Yates shuffle: randomize the recommendation order without changing database order.
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    return candidates.slice(0, limit);
}

function renderSidebar(videos = []) {
    sidebar.innerHTML = "";
    const fragment = document.createDocumentFragment();

    videos.forEach(video => {
        const clone = template.content.cloneNode(true);
        const thumb = clone.querySelector(".side-thumb");
        thumb.src = video.thumb || "";
        thumb.alt = video.title || "Video thumbnail";
        clone.querySelector(".side-duration").textContent = video.duration || "";
        clone.querySelector(".side-title").textContent = video.title || "Untitled video";
        clone.querySelector(".side-views").textContent = `${video.views ?? "0"} Views`;

        const card = clone.querySelector(".side-card");
        card.href = `watch.html?id=${encodeURIComponent(video.id)}`;
        fragment.appendChild(clone);
    });

    sidebar.appendChild(fragment);
}

function renderRelatedVideos(videos = []) {
    if (!relatedGrid || !relatedTemplate) return;
    relatedGrid.innerHTML = "";
    const fragment = document.createDocumentFragment();

    videos.forEach(video => {
        const clone = relatedTemplate.content.cloneNode(true);
        const thumb = clone.querySelector(".related-thumb");
        thumb.src = video.thumb || "";
        thumb.alt = video.title || "Video thumbnail";
        clone.querySelector(".related-duration").textContent = video.duration || "";
        clone.querySelector(".related-title").textContent = video.title || "Untitled video";
        clone.querySelector(".related-views").textContent = `${video.views ?? "0"} Views`;
        clone.querySelector(".related-card").href = `watch.html?id=${encodeURIComponent(video.id)}`;
        fragment.appendChild(clone);
    });

    relatedGrid.appendChild(fragment);
}

/* ================= LIKE ================= */

function loadLike() {
    const key = `like_${currentVideo.id}`;
    const count = Number(localStorage.getItem(key) || 0);

    likeCount.textContent = count;

    if (localStorage.getItem(`${key}_liked`) === "1") {
        likeBtn.classList.add("active");
    } else {
        likeBtn.classList.remove("active");
    }
}

likeBtn.addEventListener("click", () => {
    if (!currentVideo) return;

    const key = `like_${currentVideo.id}`;
    let count = Number(localStorage.getItem(key) || 0);
    const liked = localStorage.getItem(`${key}_liked`);

    if (liked === "1") {
        count--;
        localStorage.removeItem(`${key}_liked`);
        likeBtn.classList.remove("active");
    } else {
        count++;
        localStorage.setItem(`${key}_liked`, "1");
        likeBtn.classList.add("active");
    }

    if (count < 0) count = 0;

    localStorage.setItem(key, count);
    likeCount.textContent = count;
});

/* ================= SHARE ================= */

shareBtn.addEventListener("click", async () => {
    if (!currentVideo) return;

    const url = window.location.href;

    if (navigator.share) {
        try {
            await navigator.share({
                title: currentVideo.title,
                url: url
            });
        } catch (e) {}
    } else {
        try {
            await navigator.clipboard.writeText(url);
            shareBtn.textContent = "Copied!";

            setTimeout(() => {
                shareBtn.textContent = "Share";
            }, 1500);
        } catch (e) {
            console.error(e);
        }
    }
});

/* ================= COPY ================= */

copyBtn.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(window.location.href);
        copyBtn.textContent = "Copied!";

        setTimeout(() => {
            copyBtn.textContent = "Copy Link";
        }, 1500);
    } catch (e) {
        console.error(e);
    }
});

/* ================= AUTOPLAY NEXT ================= */

player.addEventListener("ended", () => {
    if (!currentVideo) return;

    const index = database.findIndex(v => v.id === currentVideo.id);

    if (index <= 0) return;

    // Play the next older video in the newest-first list.
    const next = database[index - 1];

    if (next) {
        window.location.href =
            `watch.html?id=${encodeURIComponent(next.id)}`;
    }
});
