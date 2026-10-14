
const STORAGE_KEY = "pageturn-book-tracker-v1";
const GOAL_KEY = "pageturn-monthly-goal";
const THEME_KEY = "pageturn-theme";

const STATUSES = ["To read", "Reading", "Finished"];
const $ = id => document.getElementById(id);

const form = $("bookForm");
const titleInput = $("title");
const authorInput = $("author");
const statusInput = $("status");
const searchInput = $("search");
const filterInput = $("filter");
const bookList = $("bookList");
const emptyState = $("emptyState");
const formMessage = $("formMessage");
const goalInput = $("goalInput");
const goalText = $("goalText");
const goalBar = $("goalBar");
const goalProgress = $("goalProgress");
const themeToggle = $("themeToggle");

let books = loadBooks();
let selectedConstellationBookId = null;

// Load saved books and support books created by older versions.
function loadBooks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];

    return saved
      .filter(book => book && typeof book.title === "string")
      .map((book, index) => ({
        id: String(book.id || `book-${index}-${Date.now()}`),
        title: book.title,
        author: typeof book.author === "string" ? book.author : "",
        status: STATUSES.includes(book.status) ? book.status : "To read",
        genre: typeof book.genre === "string" ? book.genre : "Other",
        themes: Array.isArray(book.themes)
          ? book.themes.filter(theme => typeof theme === "string")
          : [],
        coverUrl: typeof book.coverUrl === "string" ? book.coverUrl : "",
        createdAt: book.createdAt || new Date().toISOString(),
        finishedAt: book.finishedAt ||
          (book.status === "Finished" ? book.createdAt : null),
        rating: Math.max(0, Math.min(5, Number(book.rating) || 0)),
        notes: typeof book.notes === "string" ? book.notes : ""
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error("Could not load saved books:", error);
    return [];
  }
}

function saveBooks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch (error) {
    console.error("Could not save books:", error);
    formMessage.textContent = "Could not save data in this browser.";
  }
}

// Escape user-provided text before inserting it into HTML.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function updateCounts() {
  $("totalCount").textContent = books.length;
  $("toReadCount").textContent =
    books.filter(book => book.status === "To read").length;
  $("readingCount").textContent =
    books.filter(book => book.status === "Reading").length;
  $("finishedCount").textContent =
    books.filter(book => book.status === "Finished").length;
}

function updateGoal() {
  let goal = Number(goalInput.value);

  if (!Number.isFinite(goal) || goal < 1) goal = 1;
  goal = Math.min(100, Math.floor(goal));
  goalInput.value = goal;

  const now = new Date();

  const finishedThisMonth = books.filter(book => {
    if (book.status !== "Finished" || !book.finishedAt) return false;

    const date = new Date(book.finishedAt);
    return !Number.isNaN(date.getTime()) &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth();
  }).length;

  const percentage = Math.min(100, finishedThisMonth / goal * 100);

  goalText.textContent =
    `${finishedThisMonth} of ${goal} books finished this month`;
  goalBar.style.width = `${percentage}%`;
  goalProgress.setAttribute("aria-valuenow", String(Math.round(percentage)));

  localStorage.setItem(GOAL_KEY, String(goal));
}

// Render the library with search and status filters.
function renderBooks() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = filterInput.value;

  const visibleBooks = books
    .filter(book => {
      const matchesSearch =
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query);

      const matchesStatus =
        selectedStatus === "All" || book.status === selectedStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  $("libraryCount").textContent = visibleBooks.length;
  $("resultInfo").textContent = `Showing ${visibleBooks.length} book${visibleBooks.length === 1 ? "" : "s"}`;

  emptyState.hidden = visibleBooks.length > 0;
  bookList.replaceChildren();

  visibleBooks.forEach(book => {
    const card = document.createElement("article");
    card.className = "book-card";

    const statusClass = book.status === "Finished"
      ? "finished"
      : book.status === "Reading" ? "reading" : "";

    const statusOptions = STATUSES.map(status =>
      `<option value="${status}" ${book.status === status ? "selected" : ""}>${status}</option>`
    ).join("");

    const ratingOptions = [0, 1, 2, 3, 4, 5].map(value =>
      `<option value="${value}" ${book.rating === value ? "selected" : ""}>${value === 0 ? "Not rated" : `${value} star${value === 1 ? "" : "s"}`}</option>`
    ).join("");

    const coverMarkup = book.coverUrl
      ? `<img class="book-cover" src="${escapeHTML(book.coverUrl)}"
          alt="Cover of ${escapeHTML(book.title)}">`
      : `<img class="book-cover" alt="" hidden>`;

    const themesText = book.themes.length
      ? `Themes: ${escapeHTML(book.themes.join(", "))}`
      : "No themes added";

    card.innerHTML = `
      <div class="book-cover-area">
        ${coverMarkup}
        <div class="cover-placeholder" ${book.coverUrl ? "hidden" : ""}>📚</div>

        <div class="cover-info">
          <h3 class="book-title">${escapeHTML(book.title)}</h3>
          <p class="book-author">by ${escapeHTML(book.author)}</p>
          <span class="book-genre">${escapeHTML(book.genre || "Other")}</span>
          <p class="book-themes">${themesText}</p>
          <span class="status-pill ${statusClass}">${escapeHTML(book.status)}</span>
        </div>
      </div>

      <p class="book-date">Added ${formatDate(book.createdAt)}</p>

      <div class="book-details">
        <label>
          ⭐ Your rating
          <select data-field="rating" data-id="${escapeHTML(book.id)}"
                  aria-label="Rate ${escapeHTML(book.title)}">
            ${ratingOptions}
          </select>
        </label>

        <label>
          📝 Personal notes
          <textarea data-field="notes" data-id="${escapeHTML(book.id)}"
                    maxlength="1000"
                    placeholder="Write your thoughts or favourite quote..."
                    aria-label="Notes for ${escapeHTML(book.title)}">${escapeHTML(book.notes)}</textarea>
        </label>
      </div>

      <div class="book-actions">
        <select data-action="status" data-id="${escapeHTML(book.id)}"
                aria-label="Change status for ${escapeHTML(book.title)}">
          ${statusOptions}
        </select>
        <button class="delete-btn" type="button"
                data-action="delete" data-id="${escapeHTML(book.id)}">
          Delete
        </button>
      </div>
    `;

    // If the remote image fails, display the local placeholder.
    const cover = card.querySelector(".book-cover");
    cover.addEventListener("error", () => {
      cover.hidden = true;
      cover.nextElementSibling.hidden = false;
    }, { once: true });

    bookList.appendChild(card);
  });

  updateCounts();
  updateGoal();
  renderConstellation();
}

// Add a book.
form.addEventListener("submit", event => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const author = authorInput.value.trim();
  const status = statusInput.value;
  const genre = $("genre").value;

  const themes = $("themes").value
    .split(",")
    .map(theme => theme.trim().toLowerCase())
    .filter(Boolean)
    .filter((theme, index, array) => array.indexOf(theme) === index)
    .slice(0, 10);

  const coverUrl = $("coverUrl").value.trim();

  if (!title || !author) {
    formMessage.textContent = "Please enter both a title and an author.";
    return;
  }

  if (!STATUSES.includes(status)) return;

  if (coverUrl) {
    try {
      const parsedUrl = new URL(coverUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid image URL");
      }
    } catch {
      formMessage.textContent =
        "Please enter a valid HTTP or HTTPS cover URL.";
      return;
    }
  }

  const now = new Date().toISOString();

  const book = {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `book-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    author,
    status,
    genre,
    themes,
    coverUrl,
    createdAt: now,
    finishedAt: status === "Finished" ? now : null,
    rating: 0,
    notes: ""
  };

  books.unshift(book);
  saveBooks();

  form.reset();
  statusInput.value = "To read";
  formMessage.textContent = "Book added successfully!";

  searchInput.value = "";
  filterInput.value = "All";
  renderBooks();
});

// Handle rating changes and status updates.
bookList.addEventListener("change", event => {
  const field = event.target.dataset.field;
  const action = event.target.dataset.action;
  const id = event.target.dataset.id;

  if (field === "rating") {
    const book = books.find(item => item.id === id);
    if (!book) return;

    book.rating = Math.max(0, Math.min(5, Number(event.target.value) || 0));
    saveBooks();
    return;
  }

  if (action === "status") {
    const book = books.find(item => item.id === id);
    if (!book || !STATUSES.includes(event.target.value)) return;

    const newStatus = event.target.value;

    if (newStatus === "Finished" && book.status !== "Finished") {
      book.finishedAt = new Date().toISOString();
    } else if (newStatus !== "Finished") {
      book.finishedAt = null;
    }

    book.status = newStatus;
    saveBooks();
    renderBooks();
  }
});

// Handle deleting a book with a confirmation prompt.
bookList.addEventListener("click", event => {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;

  const id = button.dataset.id;
  const book = books.find(item => item.id === id);
  if (!book) return;

  if (confirm(`Delete "${book.title}" from your library?`)) {
    books = books.filter(item => item.id !== id);

    if (selectedConstellationBookId === id) {
      selectedConstellationBookId = null;
    }

    saveBooks();
    renderBooks();
  }
});

// Save notes while typing.
bookList.addEventListener("input", event => {
  if (event.target.dataset.field !== "notes") return;

  const book = books.find(item => item.id === event.target.dataset.id);
  if (!book) return;

  book.notes = event.target.value;
  saveBooks();
});

searchInput.addEventListener("input", renderBooks);
filterInput.addEventListener("change", renderBooks);
goalInput.addEventListener("change", updateGoal);

$("clearFilters").addEventListener("click", () => {
  searchInput.value = "";
  filterInput.value = "All";
  renderBooks();
});

// Light and dark theme.
function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "☀️ Light mode" : "🌙 Dark mode";
  themeToggle.setAttribute("aria-pressed", String(isDark));
}

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem(THEME_KEY, nextTheme);
  applyTheme(nextTheme);
});

// Interactive Reading Constellation.
function renderConstellation() {
  const svg = $("constellationMap");
  const empty = $("constellationEmpty");

  if (!svg || !empty) return;

  svg.replaceChildren();
  empty.hidden = books.length > 0;

  if (books.length === 0) {
    $("constellationDetail").innerHTML = `
      <strong>Your reading universe is waiting ✨</strong>
      <p>Add your first book to create a constellation.</p>
    `;
    selectedConstellationBookId = null;
    return;
  }

  const NS = "http://www.w3.org/2000/svg";
  const width = 720;
  const height = 420;
  const centerX = width / 2;
  const centerY = height / 2;

  // Use a circle layout for a small collection and an ellipse for larger ones.
  const radiusX = books.length === 1 ? 0 : 245;
  const radiusY = books.length === 1 ? 0 : 145;

  const positions = books.map((book, index) => {
    const angle = -Math.PI / 2 +
      (2 * Math.PI * index) / Math.max(books.length, 1);

    return {
      x: centerX + radiusX * Math.cos(angle),
      y: centerY + radiusY * Math.sin(angle)
    };
  });

  const edgeGroup = document.createElementNS(NS, "g");

  for (let i = 0; i < books.length; i++) {
    for (let j = i + 1; j < books.length; j++) {
      const a = books[i];
      const b = books[j];

      const sameGenre =
        a.genre && a.genre !== "Other" && a.genre === b.genre;

      const sharedThemes = a.themes.filter(theme =>
        b.themes.includes(theme)
      );

      if (!sameGenre && sharedThemes.length === 0) continue;

      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", positions[i].x);
      line.setAttribute("y1", positions[i].y);
      line.setAttribute("x2", positions[j].x);
      line.setAttribute("y2", positions[j].y);

      const connectionType = sharedThemes.length > 0 ? "theme-edge" : "genre-edge";
      line.setAttribute("class", `constellation-edge ${connectionType}`);

      const description = document.createElementNS(NS, "title");
      description.textContent = sharedThemes.length > 0
        ? `Shared themes: ${sharedThemes.join(", ")}`
        : `Same genre: ${a.genre}`;

      line.appendChild(description);
      edgeGroup.appendChild(line);
    }
  }

  svg.appendChild(edgeGroup);

  books.forEach((book, index) => {
    const { x, y } = positions[index];
    const group = document.createElementNS(NS, "g");

    group.setAttribute("class", "constellation-star");
    group.setAttribute("data-book-id", book.id);
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `${book.title} by ${book.author}`);

    const circle = document.createElementNS(NS, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 25);
    group.appendChild(circle);

    const icon = document.createElementNS(NS, "text");
    icon.setAttribute("x", x);
    icon.setAttribute("y", y + 6);
    icon.setAttribute("class", "star-icon");
    icon.textContent = "✦";
    group.appendChild(icon);

    const label = document.createElementNS(NS, "text");
    label.setAttribute("x", x);
    label.setAttribute("y", y + 44);
    label.textContent = book.title.length > 19
      ? book.title.slice(0, 17) + "…"
      : book.title;
    group.appendChild(label);

    svg.appendChild(group);
  });

  if (selectedConstellationBookId &&
      books.some(book => book.id === selectedConstellationBookId)) {
    showConstellationBook(selectedConstellationBookId);
  } else {
    selectedConstellationBookId = null;
    $("constellationDetail").innerHTML = `
      <strong>Select a star</strong>
      <p>Click a book in your constellation to explore it.</p>
    `;
  }
}

function showConstellationBook(id) {
  const book = books.find(item => item.id === id);
  if (!book) return;

  selectedConstellationBookId = id;

  $("constellationMap")
    .querySelectorAll(".constellation-star")
    .forEach(star => {
      star.classList.toggle("selected", star.dataset.bookId === id);
    });

  const sharedBooks = books.filter(other => {
    if (other.id === id) return false;

    const sameGenre =
      book.genre && book.genre !== "Other" && book.genre === other.genre;

    const sharedThemes = book.themes.some(theme =>
      other.themes.includes(theme)
    );

    return sameGenre || sharedThemes;
  });

  const detail = $("constellationDetail");
  detail.replaceChildren();

  const title = document.createElement("strong");
  title.textContent = book.title;
  detail.appendChild(title);

  const details = [
    `By ${book.author}`,
    `Genre: ${book.genre || "Other"}`,
    `Themes: ${book.themes.length ? book.themes.join(", ") : "No themes added"}`,
    `Connected books: ${sharedBooks.length
      ? sharedBooks.map(item => item.title).join(", ")
      : "No connections yet. Add matching genres or themes to connect books."}`
  ];

  details.forEach(text => {
    const p = document.createElement("p");
    p.textContent = text;
    detail.appendChild(p);
  });
}

$("constellationMap").addEventListener("click", event => {
  const star = event.target.closest("[data-book-id]");
  if (star) showConstellationBook(star.dataset.bookId);
});

$("constellationMap").addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;

  const star = event.target.closest("[data-book-id]");
  if (!star) return;

  event.preventDefault();
  showConstellationBook(star.dataset.bookId);
});

// Restore saved preferences and render the application.
const savedGoal = Number(localStorage.getItem(GOAL_KEY));
if (savedGoal >= 1 && savedGoal <= 100) {
  goalInput.value = savedGoal;
}

applyTheme(localStorage.getItem(THEME_KEY) || "light");
renderBooks();
