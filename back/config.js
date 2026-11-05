function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("JWT_SECRET est absent ou trop court (32 caractères minimum)");
    }
    return secret;
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

module.exports = { getJwtSecret, JWT_EXPIRES_IN };
