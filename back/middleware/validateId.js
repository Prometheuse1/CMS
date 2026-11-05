function validateId(req, res, next) {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
        return res.status(400).json({ message: "Identifiant invalide" });
    }
    next();
}

module.exports = validateId;
