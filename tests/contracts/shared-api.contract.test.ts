import fs from "node:fs";
import path from "node:path";

type Contract = { routeFile: string; method: string; route: string; flutter: string };

const contracts: Contract[] = [
  { routeFile: "user.route.ts", method: "post", route: "/register", flutter: "authRegister" },
  { routeFile: "user.route.ts", method: "post", route: "/login", flutter: "authLogin" },
  { routeFile: "user.route.ts", method: "get", route: "/whoami", flutter: "authWhoami" },
  { routeFile: "user.route.ts", method: "put", route: "/update", flutter: "authUpdate" },
  { routeFile: "user.route.ts", method: "delete", route: "/delete", flutter: "authDelete" },
  { routeFile: "onboarding.routes.ts", method: "get", route: "/status", flutter: "onboardingStatus" },
  { routeFile: "onboarding.routes.ts", method: "post", route: "/complete", flutter: "onboardingComplete" },
  { routeFile: "silhouette.routes.ts", method: "get", route: "/profile", flutter: "silhouetteProfile" },
  { routeFile: "upload.routes.ts", method: "post", route: "/upload-photo", flutter: "itemUploadPhoto" },
  { routeFile: "cart.route.ts", method: "get", route: "/", flutter: "cart" },
  { routeFile: "cart.route.ts", method: "put", route: "/", flutter: "cart" },
  { routeFile: "order.route.ts", method: "post", route: "/", flutter: "orders" },
  { routeFile: "order.route.ts", method: "get", route: "/me", flutter: "myOrders" },
  { routeFile: "esewa.route.ts", method: "get", route: "/payment-url", flutter: "esewaPaymentUrl" },
  { routeFile: "esewa.route.ts", method: "post", route: "/verify", flutter: "esewaVerify" },
];

const backendRoutes = path.resolve(__dirname, "../../src/routes");
const flutterEndpoints = path.resolve(__dirname, "../../../lib/core/api/api_endpoints.dart");

describe("shared Flutter/web API contract", () => {
  const flutterSource = fs.readFileSync(flutterEndpoints, "utf8");

  test.each(contracts)("$method $routeFile$route is represented by Flutter endpoint $flutter", (contract) => {
    const routeSource = fs.readFileSync(path.join(backendRoutes, contract.routeFile), "utf8");
    expect(routeSource).toContain(`router.${contract.method}("${contract.route}"`);
    expect(flutterSource).toMatch(new RegExp(`static const String ${contract.flutter}\\s*=`));
  });
});
