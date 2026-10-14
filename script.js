
const STORAGE_KEY = "pageturn-books-v1";
const STATUSES = ["To read", "Reading", "Finished"];

const form = document.getElementById("bookForm");
const bookList = document.getElementById("bookList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("search");
const filterSelect = document.getElementById("filter");

let books = loadBooks();

function loadBooks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];

    return saved
      .filter(book => book && typeof book.title === "string"
        && typeof book.author === "string")
      .map(book => ({
        id: String(book.id || `${Date.now()}-${Math.random()}`),
        title: book.title,
        author: book.author,
        status: STATUSES.includes(book.status) ? book.status : "To read",
        createdAt: book.createdAt || new Date().toISOString()
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    return [];
  }
}

function saveBooks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  } catch {
    alert("Unable to save books in this browser.");
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function updateStats() {
  document.getElementById("totalCount").textContent = books.length;
  document.getElementById("readingCount").textContent =
    books.filter(book => book.status === "Reading").length;
  document.getElementById("finishedCount").textContent =
    books.filter(book => book.status === "Finished").length;
  document.getElementById("libraryCount").textContent = books.length;
}

function renderBooks() {
  updateStats();

  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = filterSelect.value;

  const visibleBooks = books
    .filter(book => selectedStatus === "All" || book.status === selectedStatus)
    .filter(book =>
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query)
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  emptyState.style.display = visibleBooks.length ? "none" : "block";
  emptyState.querySelector("h3").textContent =
    books.length ? "No books found" : "Your shelf is waiting";
  emptyState.querySelector("p").textContent =
    books.length
      ? "Try another search or clear your filters."
      : "Add your first book to start your reading journey.";

  bookList.innerHTML = visibleBooks.map(book => {
    const statusClass =
      book.status === "Finished" ? "finished" :
      book.status === "Reading" ? "reading" : "";

    return `
      <article class="book-card">
        <div class="book-cover" aria-hidden="true">
          ${book.status === "Finished" ? "✓" : "📘"}
        </div>
        <div class="book-info">
          <h3>${escapeHTML(book.title)}</h3>
          <p class="author">by ${escapeHTML(book.author)}</p>
          <span class="status ${statusClass}">
            ${escapeHTML(book.status)}
          </span>
        </div>
        <div class="book-actions">
          <button class="small-btn" type="button"
            data-action="update" data-id="${escapeHTML(book.id)}">
            Update
          </button>
          <button class="small-btn" type="button"
            data-action="delete" data-id="${escapeHTML(book.id)}">
            Delete
          </button>
        </div>
      </article>`;
  }).join("");
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const titleInput = document.getElementById("title");
  const authorInput = document.getElementById("author");
  const title = titleInput.value.trim();
  const author = authorInput.value.trim();

  document.getElementById("titleError").textContent =
    title ? "" : "Please enter a title.";
  document.getElementById("authorError").textContent =
    author ? "" : "Please enter an author.";

  titleInput.setAttribute("aria-invalid", String(!title));
  authorInput.setAttribute("aria-invalid", String(!author));

  if (!title || !author) {
    (!title ? titleInput : authorInput).focus();
    return;
  }

  const selectedStatus = document.getElementById("status").value;

  books.unshift({
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    title,
    author,
    status: STATUSES.includes(selectedStatus) ? selectedStatus : "To read",
    createdAt: new Date().toISOString()
  });

  saveBooks();
  form.reset();

  document.getElementById("titleError").textContent = "";
  document.getElementById("authorError").textContent = "";
  titleInput.removeAttribute("aria-invalid");
  authorInput.removeAttribute("aria-invalid");

  searchInput.value = "";
  filterSelect.value = "All";
  renderBooks();
  titleInput.focus();
});

bookList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const book = books.find(item => item.id === button.dataset.id);
  if (!book) return;

  if (button.dataset.action === "delete") {
    books = books.filter(item => item.id !== book.id);
  } else if (button.dataset.action === "update") {
    const index = STATUSES.indexOf(book.status);
    book.status = STATUSES[(index + 1) % STATUSES.length];
  }

  saveBooks();
  renderBooks();
});

searchInput.addEventListener("input", renderBooks);
filterSelect.addEventListener("change", renderBooks);

document.getElementById("clearSearch").addEventListener("click", () => {
  searchInput.value = "";
  filterSelect.value = "All";
  renderBooks();
});

renderBooks();
