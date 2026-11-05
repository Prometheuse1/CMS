process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "x".repeat(48);

jest.mock("../models/Utilisateur", () => ({
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
}));
jest.mock("../models/Etudiant", () => {
    const Model = jest.fn().mockImplementation((data) => ({
        save: jest.fn().mockResolvedValue({ _id: "a".repeat(24), ...data }),
    }));
    Model.find = jest.fn().mockResolvedValue([]);
    Model.findById = jest.fn();
    Model.findByIdAndUpdate = jest.fn();
    Model.findByIdAndDelete = jest.fn();
    return Model;
});

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../server");
const Utilisateur = require("../models/Utilisateur");
const Etudiant = require("../models/Etudiant");

const ID = "a".repeat(24);
let token;

beforeAll(async () => {
    const password = await bcrypt.hash("motdepasse123", 4);
    Utilisateur.findOne.mockResolvedValue({ _id: ID, nom: "Admin", email: "a@b.com", password });
    const res = await request(app).post("/api/auth/login").send({ email: "A@b.com", password: "motdepasse123" });
    token = res.body.token;
});

const auth = (req) => req.set("Authorization", `Bearer ${token}`);

describe("authentification", () => {
    test("login valide renvoie un JWT", () => {
        expect(token).toEqual(expect.any(String));
    });

    test("mauvais mot de passe → 401", async () => {
        const res = await request(app).post("/api/auth/login").send({ email: "a@b.com", password: "mauvais-mdp" });
        expect(res.status).toBe(401);
        expect(res.body.token).toBeUndefined();
    });

    test("utilisateur inconnu → 401 (même message)", async () => {
        Utilisateur.findOne.mockResolvedValueOnce(null);
        const res = await request(app).post("/api/auth/login").send({ email: "x@y.com", password: "motdepasse123" });
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Identifiants incorrects");
    });

    test("injection NoSQL dans le login → 400", async () => {
        const res = await request(app).post("/api/auth/login").send({ email: { $gt: "" }, password: { $gt: "" } });
        expect(res.status).toBe(400);
    });

    test("inscription fermée quand un compte existe → 403", async () => {
        Utilisateur.countDocuments.mockResolvedValueOnce(1);
        const res = await request(app)
            .post("/api/auth/register")
            .send({ nom: "Eve", email: "eve@x.com", password: "motdepasse123" });
        expect(res.status).toBe(403);
    });

    test("1er compte autorisé → 201 + token", async () => {
        Utilisateur.countDocuments.mockResolvedValueOnce(0);
        Utilisateur.findOne.mockResolvedValueOnce(null);
        Utilisateur.create.mockResolvedValueOnce({ _id: ID, nom: "Eve", email: "eve@x.com" });
        const res = await request(app)
            .post("/api/auth/register")
            .send({ nom: "Eve", email: "eve@x.com", password: "motdepasse123" });
        expect(res.status).toBe(201);
        expect(res.body.token).toEqual(expect.any(String));
    });

    test("mot de passe trop court → 400", async () => {
        const res = await request(app).post("/api/auth/register").send({ nom: "E", email: "e@x.com", password: "court" });
        expect(res.status).toBe(400);
    });
});

describe("routes protégées", () => {
    test("sans token → 401", async () => {
        expect((await request(app).get("/api/etudiants")).status).toBe(401);
    });

    test("token invalide → 401", async () => {
        const res = await request(app).get("/api/etudiants").set("Authorization", "Bearer abc.def.ghi");
        expect(res.status).toBe(401);
    });

    test("token valide → 200", async () => {
        expect((await auth(request(app).get("/api/etudiants"))).status).toBe(200);
    });

    test("route de statut publique", async () => {
        expect((await request(app).get("/api/test")).status).toBe(200);
    });
});

describe("validation des entrées", () => {
    test("e-mail invalide → 400", async () => {
        const res = await auth(request(app).post("/api/etudiants")).send({ nom: "A", email: "nope", age: 20 });
        expect(res.status).toBe(400);
    });

    test("objet injecté à la place d'un champ → 400", async () => {
        const res = await auth(request(app).post("/api/etudiants")).send({ nom: { $ne: 1 }, email: "a@b.com", age: 20 });
        expect(res.status).toBe(400);
    });

    test("âge hors limites → 400", async () => {
        const res = await auth(request(app).post("/api/etudiants")).send({ nom: "A", email: "a@b.com", age: 500 });
        expect(res.status).toBe(400);
    });

    test("création valide → 201, e-mail normalisé", async () => {
        const res = await auth(request(app).post("/api/etudiants")).send({ nom: " Ali ", email: "ALI@X.COM", age: 21 });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ nom: "Ali", email: "ali@x.com", age: 21 });
    });

    test("doublon d'e-mail → 409", async () => {
        Etudiant.mockImplementationOnce(() => ({ save: jest.fn().mockRejectedValue({ code: 11000 }) }));
        const res = await auth(request(app).post("/api/etudiants")).send({ nom: "A", email: "a@b.com", age: 20 });
        expect(res.status).toBe(409);
    });

    test("id invalide → 400", async () => {
        expect((await auth(request(app).delete("/api/etudiants/123"))).status).toBe(400);
    });

    test("PATCH sans champ → 400", async () => {
        expect((await auth(request(app).patch(`/api/etudiants/${ID}`)).send({})).status).toBe(400);
    });

    test("JSON invalide → 400", async () => {
        const res = await auth(request(app).post("/api/etudiants")).set("Content-Type", "application/json").send("{bad");
        expect(res.status).toBe(400);
    });
});

describe("durcissement HTTP", () => {
    test("en-têtes helmet, pas de x-powered-by", async () => {
        const res = await request(app).get("/api/test");
        expect(res.headers["x-powered-by"]).toBeUndefined();
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    test("origine CORS inconnue → 403", async () => {
        const res = await request(app).get("/api/test").set("Origin", "https://evil.vercel.app");
        expect(res.status).toBe(403);
    });

    test("origine autorisée acceptée", async () => {
        const res = await request(app).get("/api/test").set("Origin", "http://localhost:3000");
        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    });
});
