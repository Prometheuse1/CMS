const mongoose = require("mongoose");

const etudiantSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        maxlength: 254,
    },
    age: {
        type: Number,
        required: true,
        min: 1,
        max: 120,
    },
}, { timestamps: true });

module.exports = mongoose.model("Etudiant", etudiantSchema);
