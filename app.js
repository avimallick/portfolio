const heatmapEl = document.getElementById("heatmap");
const monthsEl = document.getElementById("months");
const statusEl = document.getElementById("status");
const daysEl = document.getElementById("days");
const reloadEl = document.getElementById("reload");
const tooltipEl = document.getElementById("tooltip");
const totalCountEl = document.getElementById("total-count");
const githubCountEl = document.getElementById("github-count");
const gitlabCountEl = document.getElementById("gitlab-count");
const activeDaysEl = document.getElementById("active-days");

const brandEl = document.getElementById("brand");
const heroTitleEl = document.getElementById("hero-title");
const heroHeadlineEl = document.getElementById("hero-headline");
const cvLinkEl = document.getElementById("cv-link");
const aboutEl = document.getElementById("about");
const contactLineEl = document.getElementById("contact-line");
const socialsEl = document.getElementById("social-links");
const skillsEl = document.getElementById("skills-list");
const experienceEl = document.getElementById("experience-list");
const educationEl = document.getElementById("education-list");
const achievementsEl = document.getElementById("achievements-list");
const projectsEl = document.getElementById("projects-grid");

const blogSearchEl = document.getElementById("blog-search");
const blogTagsEl = document.getElementById("blog-tags");
const blogListEl = document.getElementById("blog-list");
const postDialogEl = document.getElementById("post-dialog");
const closePostEl = document.getElementById("close-post");
const postTitleEl = document.getElementById("post-title");
const postMetaEl = document.getElementById("post-meta");
const postContentEl = document.getElementById("post-content");

let siteData = null;
let selectedTag = "All";

function monthName(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}

function weekdayIndex(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

function level(value, max) {
  if (max <= 0 || value <= 0) return 0;
  const ratio = value / max;
  if (ratio < 0.25) return 0.28;
  if (ratio < 0.5) return 0.48;
  if (ratio < 0.75) return 0.68;
  return 0.9;
}

function tileBackground(github, gitlab, maxGithub, maxGitlab) {
  const gh = level(github, maxGithub);
  const gl = level(gitlab, maxGitlab);
  return `linear-gradient(135deg, rgba(46,160,67,${gh}) 0 50%, rgba(30,136,229,${gl}) 50% 100%)`;
}

function tooltipText(item) {
  const total = item.github + item.gitlab;
  return `${item.date}\nGitHub: ${item.github}\nGitLab: ${item.gitlab}\nTotal: ${total}`;
}

function moveTooltip(event) {
  tooltipEl.style.left = `${event.clientX + 12}px`;
  tooltipEl.style.top = `${event.clientY + 12}px`;
}

function renderMonths(data, startPad) {
  monthsEl.innerHTML = "";
  const totalSlots = startPad + data.length;
  const totalWeeks = Math.ceil(totalSlots / 7);
  monthsEl.style.gridTemplateColumns = `repeat(${totalWeeks}, var(--cell-size))`;

  const seen = new Set();
  for (let i = 0; i < data.length; i += 1) {
    const monthKey = data[i].date.slice(0, 7);
    if (seen.has(monthKey)) continue;
    seen.add(monthKey);

    const label = document.createElement("span");
    label.className = "month";
    label.style.gridColumn = String(Math.floor((startPad + i) / 7) + 1);
    label.textContent = monthName(data[i].date);
    monthsEl.appendChild(label);
  }
}

function setStats(data) {
  const githubTotal = data.reduce((sum, day) => sum + day.github, 0);
  const gitlabTotal = data.reduce((sum, day) => sum + day.gitlab, 0);
  const activeDays = data.filter((day) => day.github + day.gitlab > 0).length;

  totalCountEl.textContent = (githubTotal + gitlabTotal).toLocaleString();
  githubCountEl.textContent = githubTotal.toLocaleString();
  gitlabCountEl.textContent = gitlabTotal.toLocaleString();
  activeDaysEl.textContent = activeDays.toLocaleString();
}

function renderHeatmap(data) {
  const maxGithub = Math.max(...data.map((d) => d.github), 0);
  const maxGitlab = Math.max(...data.map((d) => d.gitlab), 0);
  const startPad = weekdayIndex(data[0].date);
  const totalSlots = startPad + data.length;
  const totalWeeks = Math.ceil(totalSlots / 7);

  heatmapEl.innerHTML = "";
  heatmapEl.style.gridTemplateColumns = `repeat(${totalWeeks}, var(--cell-size))`;

  for (let i = 0; i < startPad; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell empty";
    cell.style.gridColumn = String(Math.floor(i / 7) + 1);
    cell.style.gridRow = String((i % 7) + 1);
    heatmapEl.appendChild(cell);
  }

  for (let i = 0; i < data.length; i += 1) {
    const item = data[i];
    const slotIndex = startPad + i;
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.type = "button";
    cell.style.gridColumn = String(Math.floor(slotIndex / 7) + 1);
    cell.style.gridRow = String((slotIndex % 7) + 1);
    cell.style.background = tileBackground(item.github, item.gitlab, maxGithub, maxGitlab);
    cell.setAttribute("aria-label", tooltipText(item));

    cell.addEventListener("mouseenter", (event) => {
      tooltipEl.textContent = tooltipText(item);
      tooltipEl.hidden = false;
      moveTooltip(event);
    });
    cell.addEventListener("mousemove", moveTooltip);
    cell.addEventListener("mouseleave", () => {
      tooltipEl.hidden = true;
    });

    heatmapEl.appendChild(cell);
  }

  renderMonths(data, startPad);
  setStats(data);
}

function renderProfile(data) {
  const { profile, highlights, socials, skills, experience, education, achievements, projects } = data;

  brandEl.textContent = profile.name;
  heroTitleEl.textContent = `${profile.name} / ${profile.title}`;
  heroHeadlineEl.textContent = profile.headline;
  cvLinkEl.href = profile.cvPath;

  aboutEl.innerHTML = `
    <div class="section-head">
      <h2>About</h2>
    </div>
    <p>${profile.summary}</p>
    <p class="availability">${profile.availability}</p>
    <div class="highlights">${highlights
      .map((item) => `<div class="highlight"><span>${item.label}</span><strong>${item.value}</strong></div>`)
      .join("")}</div>
  `;

  contactLineEl.textContent = `${profile.name} · ${profile.location} · ${profile.email}`;
  socialsEl.innerHTML = socials.map((item) => `<a href="${item.url}" target="_blank" rel="noreferrer">${item.label}</a>`).join("");

  skillsEl.innerHTML = skills.map((skill) => `<span class="pill">${skill}</span>`).join("");

  experienceEl.innerHTML = experience
    .map(
      (item) => `
        <article class="experience-item">
          <p class="period">${item.period}</p>
          <h3>${item.role} · ${item.company}</h3>
          <ul>${item.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}</ul>
        </article>
      `,
    )
    .join("");

  educationEl.innerHTML = education
    .map(
      (item) => `
        <article class="experience-item">
          <p class="period">${item.period}</p>
          <h3>${item.degree} · ${item.institution}</h3>
          <ul>${item.details.map((detail) => `<li>${detail}</li>`).join("")}</ul>
        </article>
      `,
    )
    .join("");

  achievementsEl.innerHTML = achievements.map((item) => `<li>${item}</li>`).join("");

  projectsEl.innerHTML = projects
    .map(
      (project) => `
        <article class="project-card">
          <h3>${project.name}</h3>
          <p>${project.description}</p>
          <div class="stack">${project.stack.map((item) => `<span class="pill">${item}</span>`).join("")}</div>
          <a href="${project.link}" ${project.link === "#" ? "" : 'target="_blank" rel="noreferrer"'}>View</a>
        </article>
      `,
    )
    .join("");
}

function formatBlogDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function openPost(post) {
  postTitleEl.textContent = post.title;
  postMetaEl.textContent = `${formatBlogDate(post.date)} · ${post.tags.join(" / ")}`;
  postContentEl.innerHTML = post.content.map((line) => `<p>${line}</p>`).join("");

  if (typeof postDialogEl.showModal === "function") {
    postDialogEl.showModal();
  }
}

function currentBlogPosts() {
  const query = blogSearchEl.value.trim().toLowerCase();
  return siteData.blogs.filter((post) => {
    const tagMatch = selectedTag === "All" || post.tags.includes(selectedTag);
    const queryMatch =
      query.length === 0 ||
      post.title.toLowerCase().includes(query) ||
      post.excerpt.toLowerCase().includes(query) ||
      post.content.join(" ").toLowerCase().includes(query);
    return tagMatch && queryMatch;
  });
}

function renderBlogs() {
  const posts = currentBlogPosts();

  blogListEl.innerHTML = posts
    .map(
      (post) => `
        <article class="blog-card">
          <p class="period">${formatBlogDate(post.date)}</p>
          <h3>${post.title}</h3>
          <p>${post.excerpt}</p>
          <div class="stack">${post.tags.map((tag) => `<span class="pill">${tag}</span>`).join("")}</div>
          <button type="button" class="read-post" data-slug="${post.slug}">Read</button>
        </article>
      `,
    )
    .join("");

  for (const button of document.querySelectorAll(".read-post")) {
    button.addEventListener("click", () => {
      const slug = button.getAttribute("data-slug");
      const post = siteData.blogs.find((item) => item.slug === slug);
      if (post) {
        openPost(post);
      }
    });
  }
}

function renderBlogTags() {
  const tags = new Set(["All"]);
  for (const post of siteData.blogs) {
    for (const tag of post.tags) {
      tags.add(tag);
    }
  }

  blogTagsEl.innerHTML = [...tags]
    .map((tag) => `<button class="tag ${selectedTag === tag ? "active" : ""}" type="button" data-tag="${tag}">${tag}</button>`)
    .join("");

  for (const button of blogTagsEl.querySelectorAll("button")) {
    button.addEventListener("click", () => {
      selectedTag = button.getAttribute("data-tag") || "All";
      renderBlogTags();
      renderBlogs();
    });
  }
}

async function loadSiteContent() {
  const response = await fetch("/content/site.json");
  if (!response.ok) {
    throw new Error(`Content load failed: ${response.status}`);
  }

  siteData = await response.json();
  renderProfile(siteData);
  renderBlogTags();
  renderBlogs();
}

async function loadActivity() {
  statusEl.textContent = "Loading...";
  try {
    const days = daysEl.value;
    const response = await fetch(`/api/activity?days=${encodeURIComponent(days)}`);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Unexpected response shape");
    }

    renderHeatmap(data);

    const ghStatus = response.headers.get("X-Activity-GitHub-Status") || "unknown";
    const glStatus = response.headers.get("X-Activity-GitLab-Status") || "unknown";
    statusEl.textContent = `GitHub: ${ghStatus} | GitLab: ${glStatus}`;
  } catch (error) {
    statusEl.textContent = `Error: ${error instanceof Error ? error.message : "Failed to load"}`;
  }
}

blogSearchEl.addEventListener("input", renderBlogs);
daysEl.addEventListener("change", loadActivity);
reloadEl.addEventListener("click", loadActivity);
closePostEl.addEventListener("click", () => postDialogEl.close());

postDialogEl.addEventListener("click", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target === postDialogEl) {
    postDialogEl.close();
  }
});

(async () => {
  try {
    await loadSiteContent();
    await loadActivity();
  } catch (error) {
    statusEl.textContent = `Error: ${error instanceof Error ? error.message : "Initialization failed"}`;
  }
})();
