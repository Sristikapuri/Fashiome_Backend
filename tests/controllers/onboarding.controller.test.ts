import { Request, Response } from "express";
import { OnboardingController } from "../../src/controllers/onboarding.controller";

/**
 * See the equivalent comment in silhouette.controller.test.ts: these routes
 * always sit behind `authorizedMiddleware`, which guarantees `req.user` is
 * set before the controller runs (or rejects with 401 itself first). The
 * controller's own "if (!userId) throw 401" branch is therefore unreachable
 * through the wired app/routes and can only be exercised by calling the
 * controller directly with a bare request object.
 */
function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("OnboardingController — unauthenticated defensive branch", () => {
  const controller = new OnboardingController();

  test("getOnboardingStatus responds 401 when req.user is missing", async () => {
    const req = {} as Request;
    const res = mockResponse();

    await controller.getOnboardingStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ isSuccess: false, responseMessage: "User not authenticated" })
    );
  });

  test("completeOnboarding responds 401 when req.user is missing", async () => {
    const req = { body: { preferences: { style: "minimal" } } } as Request;
    const res = mockResponse();

    await controller.completeOnboarding(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
