const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valide et nettoie un étudiant. partial=true pour PATCH (champs optionnels).
function validateEtudiant(body, partial = false) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { errors: ["Corps de requête invalide"] };
    }

    const data = {};
    const errors = [];
    const has = (key) => body[key] !== undefined;

    if (!partial || has("nom")) {
        if (typeof body.nom !== "string" || !body.nom.trim() || body.nom.trim().length > 100) {
            errors.push("Nom invalide (1 à 100 caractères)");
        } else {
            data.nom = body.nom.trim();
        }
    }

    if (!partial || has("email")) {
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        if (!EMAIL_RE.test(email) || email.length > 254) {
            errors.push("Adresse e-mail invalide");
        } else {
            data.email = email;
        }
    }

    if (!partial || has("age")) {
        if (!Number.isInteger(body.age) || body.age < 1 || body.age > 120) {
            errors.push("Âge invalide (entier entre 1 et 120)");
        } else {
            data.age = body.age;
        }
    }

    if (partial && Object.keys(data).length === 0 && errors.length === 0) {
        errors.push("Aucun champ à modifier");
    }

    return { data, errors };
}

module.exports = { validateEtudiant, EMAIL_RE };
