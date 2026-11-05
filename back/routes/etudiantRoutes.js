const express = require("express");
const {
    getEtudiants,
    createEtudiant,
    getEtudiant,
    updateEtudiant,
    patchEtudiant,
    deleteEtudiant,
} = require("../controllers/etudiantController");
const validateId = require("../middleware/validateId");

const router = express.Router();

router.get("/", getEtudiants);
router.post("/", createEtudiant);
router.get("/:id", validateId, getEtudiant);
router.put("/:id", validateId, updateEtudiant);
router.patch("/:id", validateId, patchEtudiant);
router.delete("/:id", validateId, deleteEtudiant);

module.exports = router;
