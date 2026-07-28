import request from "supertest";
import app from "../src/app";
import { UserModel } from "../src/models/user.model";
import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from "./setup/db";
import { createRegularUserAndToken } from "./setup/helpers";

beforeAll(async () => {
  await connectTestDatabase();
}, 60_000);

afterEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

describe("PUT /api/v1/users/update", () => {
  test("updates the logged-in user's profile and returns it without the password field", async () => {
    const { token, user } = await createRegularUserAndToken({ firstName: "Old" });

    const response = await request(app)
      .put("/api/v1/users/update")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Updated" });

    expect(response.status).toBe(200);
    expect(response.body.responseData.firstName).toBe("Updated");
    expect(response.body.responseData.password).toBeUndefined();

    const stored = await UserModel.findById(user._id);
    expect(stored!.firstName).toBe("Updated");
  });
});

describe("DELETE /api/v1/users/delete", () => {
  test("deletes the logged-in user's account and invalidates their token", async () => {
    const { token, user } = await createRegularUserAndToken();

    const deleteResponse = await request(app)
      .delete("/api/v1/users/delete")
      .set("Authorization", `Bearer ${token}`);
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.isSuccess).toBe(true);

    const stored = await UserModel.findById(user._id);
    expect(stored).toBeNull();

    const whoami = await request(app)
      .get("/api/v1/auth/whoami")
      .set("Authorization", `Bearer ${token}`);
    expect(whoami.status).toBe(401);
  });
});
