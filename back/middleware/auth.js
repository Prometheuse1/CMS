const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../config");

function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ message: "Authentification requise" });
    }

    try {
        const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
        req.user = { id: payload.sub, nom: payload.nom };
        next();
    } catch {
        res.status(401).json({ message: "Session invalide ou expirée" });
    }
}

module.exports = requireAuth;
