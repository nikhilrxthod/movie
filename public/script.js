const adminIndicator = document.getElementById("adminIndicator");

let isAdmin = false;

fetch("/admin-status")
.then(res=>res.json())
.then(data=>{

isAdmin = data.admin;

if(adminIndicator){
if(isAdmin){
adminIndicator.classList.remove("hidden");
}else{
adminIndicator.classList.add("hidden");
}
}

/* run filters only if movies already loaded */
if(movies.length){
applyFilters();
}

});

/* ================================
  DOM ELEMENTS
================================ */

const movieGrid = document.getElementById("movieGrid");
const pagination = document.getElementById("pagination");
const searchBox = document.getElementById("searchBox");
const navLinks = document.querySelectorAll("#navMenu li");
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");
const genreFilter = document.getElementById("genreFilter");

const modal = document.getElementById("movieModal");
const modalTitle = document.getElementById("modalTitle");
const modalImage = document.getElementById("modalImage");
const modalMeta = document.getElementById("modalMeta");
const modalDescription = document.getElementById("modalDescription");
const technicalGrid = document.getElementById("technicalGrid");
const screenshotContainer = document.getElementById("mobileScreenshot");
const downloadContainer = document.getElementById("downloadContainer");

/* ================================
  STATE
================================ */

const urlParams = new URLSearchParams(window.location.search);

let movies = [];
let filteredMovies = [];

/* URL ALWAYS HAS PRIORITY */
let currentPage =
  parseInt(urlParams.get("page")) ||
  parseInt(sessionStorage.getItem("page")) ||
  1;

let currentCategory =
  urlParams.get("category") ||
  sessionStorage.getItem("category") ||
  "home";

let currentSearch =
  urlParams.get("search") ||
  sessionStorage.getItem("search") ||
  "";

let currentPageView = urlParams.get("view") || "home";

const moviesPerPage = 22;

searchBox.value = currentSearch;

/* ================================
  LOAD MOVIES FROM JSON
================================ */

fetch("/movies.json")
  .then(res => res.json())
  .then(data => {
   movies = data;

   populateGenres();
   applyFilters();

   /* OPEN MOVIE FROM URL */
   const movieParam = new URLSearchParams(window.location.search).get("movie");

   if (movieParam) {
    const movie = movies.find(m => m.id == movieParam);
    if (movie) openMovieModal(movie);
   }
  });

/* ================================
  GENRE POPULATION
================================ */

function populateGenres() {
  const uniqueGenres = [...new Set(movies.map(m => m.genre))];

  uniqueGenres.forEach(g => {
   const opt = document.createElement("option");
   opt.value = g;
   opt.textContent = g;
   genreFilter.appendChild(opt);
  });
}

genreFilter.addEventListener("change", () => {
  currentPage = 1;
  applyFilters();
});

/* ================================
  PAGE NAVIGATION
================================ */

function switchPage(view) {
  currentPageView = view;
  const params = new URLSearchParams(window.location.search);

  document.querySelector("main").style.display = "none";
  document.getElementById("aboutPage").classList.add("hidden-page");
  document.getElementById("contactPage").classList.add("hidden-page");

  if (view === "about") {
   document.getElementById("aboutPage").classList.remove("hidden-page");
   params.set("view", "about");
  } else if (view === "contact") {
   document.getElementById("contactPage").classList.remove("hidden-page");
   params.set("view", "contact");
  } else {
   document.querySelector("main").style.display = "block";
   params.delete("view");
  }

  window.history.replaceState(null, "", "?" + params.toString());
}

/* ================================
  FILTER LOGIC
================================ */

function applyFilters() {
  const keyword = currentSearch.toLowerCase();
  const selectedGenre = genreFilter.value;

  filteredMovies = movies.filter(movie => {
   if(movie.hidden && !isAdmin) return false;

   let matchCategory = true;

   if (currentCategory !== "home") {
    switch (currentCategory) {
      case "4k":
       matchCategory = movie.qualities.includes("4K");
       break;
      case "1080p":
       matchCategory = movie.qualities.includes("1080p");
       break;
      case "dual":
       matchCategory = movie.dualAudio === true;
       break;
      case "english":
       matchCategory = movie.languages.includes("English");
       break;
      case "imax":
       matchCategory = movie.edition === "IMAX";
       break;
    }
   }

   const matchSearch =
    movie.title.toLowerCase().includes(keyword) ||
    movie.year.toString().includes(keyword) ||
    movie.genre.toLowerCase().includes(keyword) ||
    movie.languages.join(", ").toLowerCase().includes(keyword) ||
    movie.edition.toLowerCase().includes(keyword) ||
    movie.qualities.join(", ").toLowerCase().includes(keyword);

   const matchGenre = selectedGenre ? movie.genre === selectedGenre : true;

   return matchCategory && matchSearch && matchGenre;
  });

  filteredMovies.sort((a, b) => {
   return new Date(b.uploadTime) - new Date(a.uploadTime);
  });

  renderMovies();
}

/* ================================
  MOVIE RENDER
================================ */

function renderMovies() {
  const totalPages = Math.ceil(filteredMovies.length / moviesPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  movieGrid.classList.remove("fade-in");
  movieGrid.classList.add("fade-out");

  setTimeout(() => {
   movieGrid.innerHTML = "";

   const start = (currentPage - 1) * moviesPerPage;
   const end = start + moviesPerPage;

   filteredMovies.slice(start, end).forEach((movie, index) => {
    const audioType = movie.dualAudio ? "Dual Audio" : "Single Audio";

    let titleLine = `<i class='accent'>${movie.title}</i><br> (${movie.year}) • ${audioType} • ${movie.qualities.join(", ")} • <span class='genre'>${movie.genre}</span> • ${movie.edition}`;
    const card = document.createElement("div");
    card.classList.add("card");
    card.style.animationDelay = `${index * 50}ms`;

    card.innerHTML = `
<div class='card-img'><img src="${movie.poster}" class="fade-image" loading="lazy" alt="Movie Poster"></div>

<div class="card-body">

<span class="movie-title">${titleLine}</span>

${isAdmin ? `
<div class="admin-controls">

<button class="admin-edit">Edit</button>

${movie.hidden ? `<button class='admin-hide unhide'>Unhide</button>` : `<button class='admin-hide'>Hide</button>`}

<button class="admin-delete">Delete</button>

</div>
` : ""}

</div>
`;


if(isAdmin){

card.querySelector(".admin-edit").onclick=(e)=>{
e.stopPropagation();
window.location.href=`/admin/admin.html?edit=${movie.id}`;
};

card.querySelector(".admin-hide").onclick=async(e)=>{

e.stopPropagation();

const route = movie.hidden ? "/show-movie" : "/hide-movie";

await fetch(route,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id:movie.id})
});

location.reload();

};

card.querySelector(".admin-delete").onclick=async(e)=>{

e.stopPropagation();

if(!confirm(`Yes, delete '${movie.title}' movie?`)) return;

await fetch("/delete-movie",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id:movie.id})
});

location.reload();

};

}

    card.addEventListener("click", () => openMovieModal(movie));

    movieGrid.appendChild(card);
   });

   renderPagination(totalPages);
   saveState();

   movieGrid.classList.remove("fade-out");
   movieGrid.classList.add("fade-in");
  }, 250);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ================================
  PAGINATION
================================ */

function renderPagination(totalPages) {
  pagination.innerHTML = "";
  if (totalPages <= 1) return;

  const prev = createBtn("Prev", currentPage === 1, () => {
   currentPage--;
   renderMovies();
  });

  pagination.appendChild(prev);

  let startPage = 1;
  let endPage = totalPages;

  if (totalPages > 4) {
   startPage = currentPage - 2;
   endPage = currentPage + 1;

   if (currentPage <= 3) endPage = 4;
   if (currentPage >= totalPages - 1) startPage = totalPages - 3;

   startPage = Math.max(1, startPage);
   endPage = Math.min(totalPages, endPage);
  }

  for (let i = startPage; i <= endPage; i++) {
   const btn = createBtn(i, false, () => {
    currentPage = i;
    renderMovies();
   });

   if (i === currentPage) btn.classList.add("active");

   pagination.appendChild(btn);
  }

  if (endPage < totalPages) {
   const dots = document.createElement("button");
   dots.innerText = "...";
   dots.disabled = true;
   pagination.appendChild(dots);

   const lastBtn = createBtn(totalPages, false, () => {
    currentPage = totalPages;
    renderMovies();
   });

   if (currentPage === totalPages) lastBtn.classList.add("active");

   pagination.appendChild(lastBtn);
  }

  const next = createBtn("Next", currentPage === totalPages, () => {
   currentPage++;
   renderMovies();
  });

  pagination.appendChild(next);
}

function createBtn(text, disabled, action) {
  const btn = document.createElement("button");

  btn.innerText = text;
  btn.disabled = disabled;
  btn.onclick = action;

  return btn;
}

/* ================================
  NAVIGATION EVENTS
================================ */

navLinks.forEach(link => {
  link.addEventListener("click", () => {
   const selected = link.getAttribute("data-category");
   if (currentPageView !== "home") switchPage("home");
   navLinks.forEach(l => l.classList.remove("active"));
   link.classList.add("active");
   
   hamburger.classList.remove("active");
   navMenu.classList.remove("open");

   if (selected === "home") {
    currentCategory = "home";
    currentSearch = "";
    currentPage = 1;

    searchBox.value = "";
    genreFilter.value = "";

    window.history.replaceState(null, "", window.location.pathname);
   } else {
    currentCategory = selected;
    currentPage = 1;
   }

   highlightActiveCategory();
   applyFilters();
  });
});

/* ================================
  SEARCH
================================ */

searchBox.addEventListener("keyup", () => {
  currentSearch = searchBox.value;
  currentPage = 1;
  applyFilters();
});
document.getElementById("clear-searchBox").addEventListener("click", () => {
  searchBox.value = '';
  currentSearch = '';
  urlParams.delete('search');
  sessionStorage.removeItem('search');
  window.history.replaceState(null, "", "?" + urlParams.toString());
  applyFilters();
})
/* ================================
  HAMBURGER MENU
================================ */

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  navMenu.classList.toggle("open");
});

/* ================================
  RESPONSIVE GENRE POSITION
================================ */

function repositionGenre() {
  if (window.innerWidth <= 1100) {
   navMenu.appendChild(genreFilter);
  } else {
   document.querySelector(".search-container").appendChild(genreFilter);
  }
}

repositionGenre();
window.addEventListener("resize", repositionGenre);

/* ================================
  SAVE STATE
================================ */

function saveState() {
  sessionStorage.setItem("page", currentPage);
  sessionStorage.setItem("category", currentCategory);
  sessionStorage.setItem("search", currentSearch);

  updateURL();
}

function updateURL() {
  const params = new URLSearchParams(window.location.search);

  if (currentPageView === "home") {
   params.set("category", currentCategory);
   params.set("page", currentPage);

   if (currentSearch) params.set("search", currentSearch);
   else params.delete("search");
  }

  window.history.replaceState(null, "", "?" + params.toString());
}

/* ================================
  MOVIE MODAL
================================ */

function openMovieModal(movie) {
  const params = new URLSearchParams(window.location.search);

  params.set("movie", movie.id);

  window.history.pushState(
   { movieId: movie.id },
   "",
   "?" + params.toString()
  );

  modalTitle.innerText = `${movie.title} (${movie.year})`;
  modalImage.src = movie.poster;

  const highestQuality = movie.qualities[movie.qualities.length - 1];

  const metaParts = [
   `<strong>Genre:</strong> ${movie.genre}`,
   `<strong>Language:</strong> ${movie.languages.join(", ")}`,
   `<strong>Edition:</strong> ${movie.edition}`,
   `<strong>Available Qualities:</strong> ${movie.qualities.join(", ")}`
  ];

  if (movie.dualAudio) metaParts.push("Dual Audio Available");

  modalMeta.innerHTML = metaParts.join(" | ");

  modalDescription.innerHTML = `
Download <strong class='accent'>${movie.title} (${movie.year})</strong> in <strong>${movie.qualities.join(", ")}</strong> UHD x264Dual Audio with ORG Audios. <strong>VEGAMUSE</strong> is one of the best websites to download High-quality content directly through Google Drive. Here you can grab 4k & 1080p UHD contents easily and save them in your google drive.

<br><br>

Here you can download <strong>1080p x264 UHD, 1080p 60FPS, 1080p x265 10Bit, 4k HDR, 4k 2160p SDR & 3D Movies</strong> through Google Drive Links. High-quality movies with the best quality options and maximum bitrates. We also focus on providing the best quality audio available. <strong>4k HEVC Dolby Atmos</strong> is one of the best High-quality formats with low file sizes. We provide a fast & safe direct google drive link to download the best quality stuff from the <strong>best Encoders</strong>. You can easily clone our files into your G-Drive and make your own collection of high-quality movies. <strong>Google Drive Direct/Login to download/Make Clone</strong> option are the best way to download or make a copy in your google drive.

<br><br>

<strong class='accent'>Note:</strong> We Do not host any files on our server. All files shared here are collected from the internet from various Encoders and hosted on third-party sites. We do not accept responsibility for content hosted on third-party websites. We just index those links which are already available on the internet..
  `;

  buildTechnicalGrid(movie);
  buildScreenshots(movie);
  buildDownloadButtons(movie);

  modal.classList.add("show");
  document.body.classList.add("scroll-lock");
}

/* ================================
  MODAL HELPERS
================================ */

function buildTechnicalGrid(movie) {
  technicalGrid.innerHTML = "";

  const uploadedDate = new Date(movie.uploadTime);

  const formattedUpload =
   uploadedDate.toLocaleDateString("en-IN") +
   " • " +
   uploadedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const technicalData = [
   { label: "Release Year", value: movie.year },
   { label: "Language", value: movie.languages.join(", ") },
   { label: "Genre", value: movie.genre },
   { label: "Audio", value: movie.dualAudio ? "Dual Audio" : "Single Audio" },
   { label: "Available Qualities", value: movie.qualities.join(", ") },
   { label: "Uploaded On", value: formattedUpload }
  ];

  technicalData.forEach(item => {
   const box = document.createElement("div");
   box.classList.add("tech-box");
   box.innerHTML = `<span class="tech-label">${item.label}</span>${item.value}`;
   technicalGrid.appendChild(box);
  });
}

function buildScreenshots(movie) {
  screenshotContainer.innerHTML = "";

  if (!movie.screenshots || movie.screenshots.length === 0) return;

  movie.screenshots.forEach(src => {
   const img = document.createElement("img");
   img.src = src;
   img.alt = movie.title;

   screenshotContainer.appendChild(img);
  });
}

function buildDownloadButtons(movie) {
  downloadContainer.innerHTML = "";

  if (!movie.downloads || movie.downloads.length === 0) return;

  movie.downloads.forEach(d => {
   const block = document.createElement("div");
   block.classList.add("download-block");

   block.innerHTML = `
    <div class="download-title">${movie.title} (${movie.year}) ${movie.languages}, ${movie.genre}, ${movie.edition}, ${movie.dualAudio ? 'Dual Audio' : 'Single Audio'}, <strong style='text-decoration:underline'>(${d.buttonName})</strong></div>
    <a href="${d.link}" target="_blank">
      <button class="download-button-large">
       Download <strong>[${d.buttonName}, ${d.size ? `${d.size}` : ""}]</strong>
      </button>
    </a>
   `;

   downloadContainer.appendChild(block);
  });
}

/* ================================
  MODAL CLOSE
================================ */

function closeModal() {
  const params = new URLSearchParams(window.location.search);
  params.delete("movie");
  window.history.replaceState(null, "", "?" + params.toString());

  modal.classList.remove("show");
  document.body.classList.remove("scroll-lock");
}

document.getElementById("closeModal").addEventListener("click", closeModal);

modal.addEventListener("click", (e) => {
  if (e.target.id === "movieModal") closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* ================================
  PAGE LINKS
================================ */

document.getElementById("aboutLink").addEventListener("click", () => switchPage("about"));
document.getElementById("contactLink").addEventListener("click", () => switchPage("contact"));

/* ================================
  INIT
================================ */

highlightActiveCategory();

if (currentPageView === "about") {
  switchPage("about");
} else if (currentPageView === "contact") {
  switchPage("contact");
} else {
  switchPage("home");
}

function highlightActiveCategory() {
  navLinks.forEach(link => {
   link.classList.toggle(
    "active",
    link.getAttribute("data-category") === currentCategory
   );
  });
}