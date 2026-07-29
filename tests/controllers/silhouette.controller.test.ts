import { Request, Response } from "express";
import { SilhouetteController } from "../../src/controllers/silhouette.controller";

/**
 * These controller methods are always wired behind `authorizedMiddleware`,
 * which already guarantees `req.user` is set (or short-circuits with 401
 * itself) before the controller ever runs. That leaves the controller's own
 * "if (!userId) throw 401" defensive checks unreachable through the actual
 * HTTP routes/app — supertest against the wired app can never exercise them.
 * Testing the controller directly (bypassing the middleware) is the only way
 * to cover this defense-in-depth branch, so we do it as a plain unit test.
 */
function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("SilhouetteController — unauthenticated defensive branch", () => {
  const controller = new SilhouetteController();

  test("getSilhouetteProfile responds 401 when req.user is missing", async () => {
    const req = {} as Request;
    const res = mockResponse();

    await controller.getSilhouetteProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ isSuccess: false, responseMessage: "User not authenticated" })
    );
  });

  test("saveSilhouetteProfile responds 401 when req.user is missing", async () => {
    const req = { body: { bodyType: "hourglass" } } as Request;
    const res = mockResponse();

    await controller.saveSilhouetteProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("clearSilhouetteProfile responds 401 when req.user is missing", async () => {
    const req = {} as Request;
    const res = mockResponse();

    await controller.clearSilhouetteProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
