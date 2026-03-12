let editMovieId = null;

const backBtn = document.getElementById("backToAdmin");

if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "/index.html";
  });
}

/* ===============================
LOAD MOVIE FROM URL
=============================== */

const params = new URLSearchParams(window.location.search);
const urlMovieId = params.get("edit");

if (urlMovieId) {
  window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("movieIdSearch").value = urlMovieId;

    /* trigger search automatically */
    document.getElementById("searchMovieBtn").click();
  });
}

/* ===============================
UPLOAD TIME
=============================== */

function updateUploadTime() {
  const now = new Date();

  const formatted =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0") +
    " " +
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0") +
    ":" +
    String(now.getSeconds()).padStart(2, "0");

  document.getElementById("uploadTimeDisplay").value = formatted;
  document.getElementById("uploadTime").value = formatted;
}

updateUploadTime();
setInterval(updateUploadTime, 1000);

/* ===============================
SEARCH MOVIE BY ID
=============================== */

document.getElementById("searchMovieBtn").onclick = async () => {
  const movieId = document.getElementById("movieIdSearch").value.trim();

  if (!movieId) {
    window.location.href=`/admin/admin.html`;
    return;
  }

  history.replaceState(null, "", "?edit=" + movieId);

  const res = await fetch("/movies.json");
  const movies = await res.json();

  const movie = movies.find((m) => m.id == movieId);

  if (!movie) {
    alert("Movie not found");
    return;
  }

  editMovieId = movie.id;

  /* show movie id in field */
  document.getElementById("movieIdSearch").value = movie.id;

  /* FILL FORM */

  document.querySelector("[name=title]").value = movie.title || "";
  document.querySelector("[name=year]").value = movie.year || "";
  document.querySelector("[name=genre]").value = movie.genre || "";
  document.querySelector("[name=edition]").value = movie.edition || "Standard";
  document.querySelector("[name=dualAudio]").value = movie.dualAudio
    ? "true"
    : "false";

  /* QUALITIES */

  document.querySelectorAll("[name=qualities]").forEach((q) => {
    q.checked = movie.qualities.includes(q.value);
  });

  /* LANGUAGES */

  document.querySelectorAll("[name=language]").forEach((l) => {
    l.checked = movie.languages.includes(l.value);
  });

  /* DOWNLOAD LINKS */

  movie.downloads.forEach((d, i) => {
    const n = i + 1;

    document.querySelector(`[name=btn${n}name]`).value = d.buttonName;
    document.querySelector(`[name=btn${n}size]`).value = d.size;
    document.querySelector(`[name=btn${n}link]`).value = d.link;
  });
};

/* ===============================
UPLOAD / UPDATE MOVIE
=============================== */

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  /* FORCE UPPERCASE BEFORE SUBMIT */
  
  document.querySelectorAll("input[name^='btn'][name$='size']").forEach(input=>{
    input.value = input.value.toUpperCase();
  });
  
  document.querySelectorAll("input[name^='btn'][name$='name']").forEach(input=>{
    input.value = input.value.toUpperCase();
  });

  const formData = new FormData(e.target);

  /* send checkbox state */
  formData.append("replaceImages", document.getElementById("replaceImages").checked);

  /* editing existing movie */
  if (editMovieId) {
    formData.append("editId", editMovieId);
  }

  const res = await fetch("/upload-movie", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (data.success) {
    alert("Movie Uploaded Successfully");
  } else {
    alert("Upload Failed");
  }
});

/* ===============================
REPLACE IMAGE TOGGLE
=============================== */

document.addEventListener("DOMContentLoaded", () => {
  const checkbox = document.getElementById("replaceImages");
  const poster = document.getElementById("posterInput");
  const screenshots = document.getElementById("screenshotsInput");

  if (!checkbox || !poster || !screenshots) return;

  // check inputs initially
  if(checkbox.checked){
    poster.disabled = false;
    screenshots.disabled = false;
  }else{
    poster.disabled = true;
    screenshots.disabled = true;
  }

  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      poster.disabled = false;
      screenshots.disabled = false;
    } else {
      poster.disabled = true;
      screenshots.disabled = true;

      // clear selected files
      poster.value = "";
      screenshots.value = "";
    }
  });
});
