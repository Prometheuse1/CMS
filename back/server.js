require("dotenv").config({ path: require("node:path").join(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const Utilisateur = require("./models/Utilisateur");
const etudiantRoutes = require("./routes/etudiantRoutes");
const statusRoutes = require("./routes/statusRoutes");
const app = express();
const PORT = process.env.PORT || 5000;
const frontendOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        ...frontendOrigins,
    ],
}));
app.use(express.json());
app.use("/", statusRoutes);
app.use("/api/etudiants", etudiantRoutes);
app.use("/api", statusRoutes);

app.post("/api/auth/register", async (req, res) => {
    try {
        const { nom, email, password } = req.body;
        if (
            typeof nom !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !nom.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires",
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                message: "Le mot de passe doit contenir au moins 8 caractères",
            });
        }

        const emailNormalise = email.trim().toLowerCase();
        const existe = await Utilisateur.findOne({ email: emailNormalise });
        if (existe) {
            return res.status(409).json({
                message: "Cette adresse e-mail est déjà utilisée",
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const utilisateur = await Utilisateur.create({
            nom,
            email: emailNormalise,
            password: passwordHash,
        });
        res.status(201).json({
            message: "Compte créé avec succès",
            utilisateur: {
                id: utilisateur._id,
                nom: utilisateur.nom,
                email: utilisateur.email,
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Cette adresse e-mail est déjà utilisée",
            });
        }
        res.status(500).json({ message: "Erreur serveur" });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "E-mail et mot de passe obligatoires",
            });
        }

        const utilisateur = await Utilisateur.findOne({
            email: email.trim().toLowerCase(),
        });
        if (!utilisateur) {
            return res.status(401).json({
                message: "Identifiants incorrects",
            });
        }

        const valide = await bcrypt.compare(password, utilisateur.password);
        if (!valide) {
            return res.status(401).json({
                message: "Identifiants incorrects",
            });
        }

        res.json({
            message: "Connexion réussie",
            utilisateur: {
                id: utilisateur._id,
                nom: utilisateur.nom,
                email: utilisateur.email,
            },
        });
    } catch (error) {
        console.error("Erreur lors de la connexion :", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

async function startServer() {
    try {
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
        console.error("Erreur MongoDB :", error.message);
        process.exit(1);
    }
}

startServer();