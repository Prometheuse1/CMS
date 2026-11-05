function getHome(req, res) {
    res.send("Mon premier serveur MERN !");
}

function getApiStatus(req, res) {
    res.json({ message: "L'API fonctionne correctement" });
}

module.exports = {
    getHome,
    getApiStatus,
};
