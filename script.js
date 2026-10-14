
const STORAGE_KEY = "pageturn-book-tracker-v1";
const STATUSES = ["To read", "Reading", "Finished"];

const form = document.getElementById("bookForm");
const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const statusInput = document.getElementById("status");
const searchInput = document.getElementById("search");
const filterInput = document.getElementById("filter");
const bookList = document.getElementById("bookList");
const emptyState = document.getElementById("emptyState");

let books = loadBooks();

function loadBooks() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(stored)) return [];

    return stored
      .filter(book =>
        book &&
        typeof book.title === "string" &&
        typeof book.author === "string"
      )
      .map(book => ({
        id: String(book.id || createId()),
        title: book.title,
        author: book.author,
        status: STATUSES.includes(book.status)
          ? book.status
          : "To read",
        createdAt: book.createdAt || new Date().toISOString()
      }))
      .sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );
  } catch (error) {
    console.error("Could not load saved books:", error);
    return [];
  }
}

function createId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function saveBooks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    return true;
  } catch (error) {
    console.error("Could not save books:", error);
    alert("Your browser could not save the books. Please check storage settings.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function updateCounts() {
  document.getElementById("totalCount").textContent = books.length;

  document.getElementById("toReadCount").textContent =
    books.filter(book => book.status === "To read").length;

  document.getElementById("readingCount").textContent =
    books.filter(book => book.status === "Reading").length;

  document.getElementById("finishedCount").textContent =
    books.filter(book => book.status === "Finished").length;

  document.getElementById("libraryCount").textContent = books.length;
}

function renderBooks() {
  updateCounts();

  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = filterInput.value;

  const visibleBooks = books
    .filter(book =>
      selectedStatus === "All" || book.status === selectedStatus
    )
    .filter(book =>
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query)
    )
    .sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

  document.getElementById("resultInfo").textContent =
    `${visibleBooks.length} ${visibleBooks.length === 1 ? "book" : "books"} shown`;

  emptyState.style.display = visibleBooks.length ? "none" : "block";

  if (visibleBooks.length === 0) {
    const hasFilters = query || selectedStatus !== "All";

    emptyState.querySelector("h3").textContent =
      hasFilters ? "No matching books" : "Your shelf is waiting";

    emptyState.querySelector("p").textContent =
      hasFilters
        ? "Try another search or clear your filters."
        : "Add your first book to start building your reading journey.";
  }

  bookList.innerHTML = visibleBooks.map(book => {
    const statusClass =
      book.status === "Finished"
        ? "finished"
        : book.status === "Reading"
          ? "reading"
          : "";

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
          <button
            class="small-btn"
            type="button"
            data-action="update"
            data-id="${escapeHTML(book.id)}"
            aria-label="Change status for ${escapeHTML(book.title)}">
            Update
          </button>

          <button
            class="small-btn delete-btn"
            type="button"
            data-action="delete"
            data-id="${escapeHTML(book.id)}"
            aria-label="Delete ${escapeHTML(book.title)}">
            Delete
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function showValidation() {
  const title = titleInput.value.trim();
  const author = authorInput.value.trim();

  document.getElementById("titleError").textContent =
    title ? "" : "Please enter a title.";

  document.getElementById("authorError").textContent =
    author ? "" : "Please enter an author.";

  titleInput.setAttribute("aria-invalid", String(!title));
  authorInput.setAttribute("aria-invalid", String(!author));

  return Boolean(title && author);
}

form.addEventListener("submit", event => {
  event.preventDefault();

  if (!showValidation()) {
    if (!titleInput.value.trim()) {
      titleInput.focus();
    } else {
      authorInput.focus();
    }
    return;
  }

  const newBook = {
    id: createId(),
    title: titleInput.value.trim(),
    author: authorInput.value.trim(),
    status: STATUSES.includes(statusInput.value)
      ? statusInput.value
      : "To read",
    createdAt: new Date().toISOString()
  };

  books.unshift(newBook);

  if (!saveBooks()) {
    books.shift();
    return;
  }

  form.reset();

  document.getElementById("titleError").textContent = "";
  document.getElementById("authorError").textContent = "";
  titleInput.removeAttribute("aria-invalid");
  authorInput.removeAttribute("aria-invalid");

  searchInput.value = "";
  filterInput.value = "All";

  renderBooks();
  titleInput.focus();
});

titleInput.addEventListener("input", () => {
  if (titleInput.value.trim()) {
    document.getElementById("titleError").textContent = "";
    titleInput.removeAttribute("aria-invalid");
  }
});

authorInput.addEventListener("input", () => {
  if (authorInput.value.trim()) {
    document.getElementById("authorError").textContent = "";
    authorInput.removeAttribute("aria-invalid");
  }
});

bookList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const book = books.find(item => item.id === button.dataset.id);
  if (!book) return;

  const previousBooks = books.map(item => ({ ...item }));

  if (button.dataset.action === "delete") {
    books = books.filter(item => item.id !== book.id);
  } else if (button.dataset.action === "update") {
    const currentIndex = STATUSES.indexOf(book.status);
    book.status = STATUSES[(currentIndex + 1) % STATUSES.length];
  } else {
    return;
  }

  if (!saveBooks()) {
    books = previousBooks;
  }

  renderBooks();
});

searchInput.addEventListener("input", renderBooks);
filterInput.addEventListener("change", renderBooks);

document.getElementById("clearFilters").addEventListener("click", () => {
  searchInput.value = "";
  filterInput.value = "All";
  renderBooks();
});

renderBooks();
