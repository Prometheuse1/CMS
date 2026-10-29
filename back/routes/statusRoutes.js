const express = require("express");
const { getHome, getApiStatus } = require("../controllers/statusController");

const router = express.Router();

router.get("/", getHome);
router.get("/test", getApiStatus);

module.exports = router;
