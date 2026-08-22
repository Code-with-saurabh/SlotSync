import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import { makeUser } from "./helpers.js";

afterEach(async () => {
  await User.deleteMany({});
});

describe("Auth", () => {
  it("wrong password returns 401", async () => {
    await makeUser("student", { email: "wrongpass@test.com" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "wrongpass@test.com", password: "WrongPassword!" });

    expect(res.status).toBe(401);
  });

  it("unauthenticated request to /me returns 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});