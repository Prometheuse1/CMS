require("dotenv").config({ path: require("node:path").join(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { getJwtSecret } = require("./config");
const requireAuth = require("./middleware/auth");
const authRoutes = require("./routes/authRoutes");
const etudiantRoutes = require("./routes/etudiantRoutes");
const statusRoutes = require("./routes/statusRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://localhost:3000",
    "https://front-b271.vercel.app",
    "https://cms-sigma-coral.vercel.app",
    ...(process.env.FRONTEND_URL || "").split(",").map((o) => o.trim().replace(/\/+$/, "")),
].filter(Boolean));

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }
        callback(new Error("Origine non autorisée par CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

const limiterBase = { standardHeaders: "draft-7", legacyHeaders: false };
const apiLimiter = rateLimit({
    ...limiterBase,
    windowMs: 15 * 60 * 1000,
    limit: 300,
    message: { message: "Trop de requêtes, réessayez plus tard" },
});
const authLimiter = rateLimit({
    ...limiterBase,
    windowMs: 15 * 60 * 1000,
    limit: 20,
    message: { message: "Trop de tentatives, réessayez dans 15 minutes" },
});

app.set("trust proxy", 1); // derrière le proxy Vercel : IP client correcte pour le rate limit
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10kb" }));

app.use("/", statusRoutes);
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/etudiants", requireAuth, etudiantRoutes);
app.use("/api", statusRoutes);

app.use((req, res) => {
    res.status(404).json({ message: "Route introuvable" });
});

app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "JSON invalide" });
    }
    if (err.type === "entity.too.large") {
        return res.status(413).json({ message: "Requête trop volumineuse" });
    }
    if (err.message === "Origine non autorisée par CORS") {
        return res.status(403).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
});

async function startServer() {
    try {
        getJwtSecret(); // échoue au démarrage si JWT_SECRET est absent ou faible
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI est absent ou vide dans le fichier .env");
        }

        await mongoose.connect(mongoUri);
        console.log("MongoDB est connecté");
        app.listen(PORT, () => {
            console.log(`Serveur lancé sur le port ${PORT}`);
        });
    } catch (error) {
        console.error("Erreur de démarrage :", error.message);
        process.exit(1);
    }
}

if (process.env.NODE_ENV !== "test") {
    startServer();
}

module.exports = app;
