const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Utilisateur = require("../models/Utilisateur");
const { getJwtSecret, JWT_EXPIRES_IN } = require("../config");
const { EMAIL_RE } = require("../utils/validation");

// Hash factice : comparaison à temps constant quand l'utilisateur n'existe pas.
const DUMMY_HASH = bcrypt.hashSync("mot-de-passe-factice", 12);

function signToken(utilisateur) {
    return jwt.sign({ nom: utilisateur.nom }, getJwtSecret(), {
        subject: String(utilisateur._id),
        expiresIn: JWT_EXPIRES_IN,
        algorithm: "HS256",
    });
}

function publicUser(u) {
    return { id: u._id, nom: u.nom, email: u.email };
}

async function register(req, res) {
    try {
        const { nom, email, password } = req.body || {};
        if (
            typeof nom !== "string" || typeof email !== "string" || typeof password !== "string" ||
            !nom.trim() || nom.trim().length > 100
        ) {
            return res.status(400).json({ message: "Tous les champs sont obligatoires" });
        }
        const emailNormalise = email.trim().toLowerCase();
        if (!EMAIL_RE.test(emailNormalise)) {
            return res.status(400).json({ message: "Adresse e-mail invalide" });
        }
        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({ message: "Le mot de passe doit contenir entre 8 et 72 caractères" });
        }

        // Inscription ouverte uniquement pour le 1er compte, ou si ALLOW_REGISTRATION=true.
        const total = await Utilisateur.countDocuments();
        if (total > 0 && process.env.ALLOW_REGISTRATION !== "true") {
            return res.status(403).json({ message: "Les inscriptions sont fermées" });
        }

        if (await Utilisateur.findOne({ email: emailNormalise })) {
            return res.status(409).json({ message: "Cette adresse e-mail est déjà utilisée" });
        }

        const utilisateur = await Utilisateur.create({
            nom: nom.trim(),
            email: emailNormalise,
            password: await bcrypt.hash(password, 12),
        });
        res.status(201).json({
            message: "Compte créé avec succès",
            token: signToken(utilisateur),
            utilisateur: publicUser(utilisateur),
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Cette adresse e-mail est déjà utilisée" });
        }
        console.error("register :", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body || {};
        if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
            return res.status(400).json({ message: "E-mail et mot de passe obligatoires" });
        }

        const utilisateur = await Utilisateur.findOne({ email: email.trim().toLowerCase() });
        const valide = await bcrypt.compare(password, utilisateur ? utilisateur.password : DUMMY_HASH);
        if (!utilisateur || !valide) {
            return res.status(401).json({ message: "Identifiants incorrects" });
        }

        res.json({
            message: "Connexion réussie",
            token: signToken(utilisateur),
            utilisateur: publicUser(utilisateur),
        });
    } catch (error) {
        console.error("login :", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
}

module.exports = { register, login };
