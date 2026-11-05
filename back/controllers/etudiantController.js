const Etudiant = require("../models/Etudiant");
const { validateEtudiant } = require("../utils/validation");

function handleWriteError(error, res, fallback) {
    if (error && error.code === 11000) {
        return res.status(409).json({ message: "Cette adresse e-mail est déjà utilisée" });
    }
    console.error(fallback, error);
    res.status(500).json({ message: "Erreur serveur" });
}

async function getEtudiants(req, res) {
    try {
        res.json(await Etudiant.find());
    } catch (error) {
        console.error("getEtudiants :", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
}

async function createEtudiant(req, res) {
    const { data, errors } = validateEtudiant(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join(". ") });

    try {
        const resultat = await new Etudiant(data).save();
        res.status(201).json(resultat);
    } catch (error) {
        handleWriteError(error, res, "createEtudiant :");
    }
}

async function getEtudiant(req, res) {
    try {
        const etudiant = await Etudiant.findById(req.params.id);
        if (!etudiant) return res.status(404).json({ message: "Étudiant introuvable" });
        res.json(etudiant);
    } catch (error) {
        console.error("getEtudiant :", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
}

function updateWith(partial) {
    return async function (req, res) {
        const { data, errors } = validateEtudiant(req.body, partial);
        if (errors.length) return res.status(400).json({ message: errors.join(". ") });

        try {
            const etudiant = await Etudiant.findByIdAndUpdate(
                req.params.id,
                { $set: data },
                { new: true, runValidators: true }
            );
            if (!etudiant) return res.status(404).json({ message: "Étudiant introuvable" });
            res.json(etudiant);
        } catch (error) {
            handleWriteError(error, res, "updateEtudiant :");
        }
    };
}

async function deleteEtudiant(req, res) {
    try {
        const etudiant = await Etudiant.findByIdAndDelete(req.params.id);
        if (!etudiant) return res.status(404).json({ message: "Étudiant introuvable" });
        res.json({ message: "Étudiant supprimé" });
    } catch (error) {
        console.error("deleteEtudiant :", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
}

module.exports = {
    getEtudiants,
    createEtudiant,
    getEtudiant,
    updateEtudiant: updateWith(false),
    patchEtudiant: updateWith(true),
    deleteEtudiant,
};
