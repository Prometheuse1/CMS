const express = require("express");
const {
    getEtudiants,
    createEtudiant,
    getEtudiant,
    updateEtudiant,
    patchEtudiant,
    deleteEtudiant,
} = require("../controllers/etudiantController");

const router = express.Router();

router.get("/", getEtudiants);
router.post("/", createEtudiant);
router.get("/:id", getEtudiant);
router.put("/:id", updateEtudiant);
router.patch("/:id", patchEtudiant);
router.delete("/:id", deleteEtudiant);

module.exports = router;
