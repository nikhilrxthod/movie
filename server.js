const express = require("express");
const fs = require("fs");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use("/admin", express.static("admin"));



/* =========================
ADMIN CONFIG
========================= */

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin";

app.use(
session({
secret: "vegamuse-secret-key",
resave: false,
saveUninitialized: false,
cookie: {
httpOnly: true,
sameSite: "lax",
secure: false
}
})
);


/* ---------- STORAGE ---------- */

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const movieId = req.movieId;
        let folder = "";

        if (file.fieldname === "poster") {
            folder = `public/images/posters/${movieId}`;
        }

        if (file.fieldname === "images") {
            folder = `public/images/screenshots/${movieId}`;
        }

        fs.mkdirSync(folder, { recursive: true });
        cb(null, folder);
    },

    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
});

const upload = multer({ storage });


/* ---------- UPLOAD MOVIE ---------- */

app.post(
    "/upload-movie",
    (req, res, next) => {
        if(!req.session.admin){
        return res.status(403).json({success:false});
        }
        req.movieId = Date.now().toString();
        next();
    },
    upload.fields([
        { name: "poster", maxCount: 1 },
        { name: "images", maxCount: 10 },
    ]),
    (req, res) => {
        try {
            let movies = [];

            /* READ EXISTING MOVIES */
            if (fs.existsSync("public/movies.json")) {
                const data = fs.readFileSync("public/movies.json", "utf8");
                try {
                    movies = JSON.parse(data);
                } catch {
                    movies = [];
                }
            }

            /* POSTER */
            let poster = "";

            if (req.body.replaceImages === "true" && req.files.poster) {
                poster = `images/posters/${req.movieId}/${req.files.poster[0].filename}`;
            } else if (req.body.editId) {
                const oldMovie = movies.find((m) => m.id == req.body.editId);
                poster = oldMovie?.poster || "";
            }

            /* SCREENSHOTS */
            let screenshots = [];

            if (req.body.replaceImages === "true" && req.files.images) {
                screenshots = req.files.images.map(
                    (file) => `images/screenshots/${req.movieId}/${file.filename}`
                );
            } else if (req.body.editId) {
                const oldMovie = movies.find((m) => m.id == req.body.editId);
                screenshots = oldMovie?.screenshots || [];
            }

            /* QUALITIES */
            const qualities = Array.isArray(req.body.qualities)
                ? req.body.qualities
                : req.body.qualities
                ? [req.body.qualities]
                : [];

            /* LANGUAGES */
            const languages = Array.isArray(req.body.language)
                ? req.body.language
                : req.body.language
                ? [req.body.language]
                : [];

            /* DOWNLOAD LINKS */
            const downloads = [];

            for (let i = 1; i <= 5; i++) {
                const name = req.body[`btn${i}name`];
                const size = req.body[`btn${i}size`];
                const link = req.body[`btn${i}link`];

                if (name && link) {
                    downloads.push({
                        buttonName: name,
                        size: size || "",
                        link: link,
                    });
                }
            }

            /* CREATE MOVIE */
            const movie = {
                id: req.movieId,
                title: req.body.title ? req.body.title : null,
                year: req.body.year ? req.body.year : null,
                genre: req.body.genre ? req.body.genre : null,
                edition: req.body.edition ? parseInt(req.body.edition) : null,
                dualAudio: req.body.dualAudio === "true",
                uploadTime: new Date().toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                }),
                qualities: qualities,
                languages: languages,
                poster: poster,
                screenshots: screenshots,
                downloads: downloads,
            };

            /* SAVE */
            const existingIndex = movies.findIndex((m) => m.id == req.body.editId);

            if (existingIndex !== -1) {
                movie.id = req.body.editId;
                movies[existingIndex] = movie;
            } else {
                movies.push(movie);
            }

            fs.writeFileSync(
                "public/movies.json",
                JSON.stringify(movies, null, 2),
                "utf8"
            );

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false });
        }
    }
);

/* ---------- HIDE MOVIE ---------- */

app.post("/hide-movie", (req, res) => {
    if(!req.session.admin){
        return res.status(403).json({success:false});
    }
    try {
        const movies = JSON.parse(fs.readFileSync("public/movies.json", "utf8"));
        const movie = movies.find((m) => m.id == req.body.id);

        if (movie) movie.hidden = true;

        fs.writeFileSync(
            "public/movies.json",
            JSON.stringify(movies, null, 2),
            "utf8"
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

/* ---------- SHOW MOVIE ---------- */

app.post("/show-movie", (req, res) => {
    if(!req.session.admin){
        return res.status(403).json({success:false});
    }
    try {
        const movies = JSON.parse(fs.readFileSync("public/movies.json", "utf8"));
        const movie = movies.find((m) => m.id == req.body.id);

        if (movie) movie.hidden = false;

        fs.writeFileSync(
            "public/movies.json",
            JSON.stringify(movies, null, 2),
            "utf8"
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

/* ---------- DELETE MOVIE ---------- */

app.post("/delete-movie", (req, res) => {
    if(!req.session.admin){
        return res.status(403).json({success:false});
    }
    try {
        let movies = JSON.parse(fs.readFileSync("public/movies.json", "utf8"));
        const movie = movies.find((m) => m.id == req.body.id);

        movies = movies.filter((m) => m.id != req.body.id);

        fs.writeFileSync(
            "public/movies.json",
            JSON.stringify(movies, null, 2),
            "utf8"
        );

        /* DELETE IMAGE FOLDERS */
        if (movie) {
            const posterFolder = `public/images/posters/${movie.id}`;
            const screenshotFolder = `public/images/screenshots/${movie.id}`;

            if (fs.existsSync(posterFolder)) {
                fs.rmSync(posterFolder, { recursive: true, force: true });
            }

            if (fs.existsSync(screenshotFolder)) {
                fs.rmSync(screenshotFolder, { recursive: true, force: true });
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

/* ADMIN SECRET ROUTE */

app.get("/vmadmin",(req,res)=>{

if(req.session.admin){
return res.redirect("/");
}

res.send(`
<script>
const user = prompt("Admin Username:");
const pass = prompt("Admin Password:");

fetch("/admin-login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({user,pass})
})
.then(res=>res.json())
.then(data=>{
if(data.success){
location.href="/";
}else{
alert("Access Denied");
location.href="/";
}
});
</script>
`);

});

app.post("/admin-login",(req,res)=>{

const {user,pass} = req.body;

if(user === ADMIN_USERNAME && pass === ADMIN_PASSWORD){

req.session.admin = true;

return res.json({success:true});
}

res.json({success:false});

});

/* ---------- ADMIN STATUS ---------- */

app.get("/admin-status",(req,res)=>{

res.json({
admin: req.session.admin === true
});

});

app.get("/admin-logout",(req,res)=>{

req.session.destroy(()=>{
res.redirect("/");
});

});


/* ---------- START SERVER ---------- */

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
