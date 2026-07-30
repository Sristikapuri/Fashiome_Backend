import { EsewaService } from "../../src/services/esewa.service";

describe("EsewaService", () => {
  let service: EsewaService;

  beforeEach(() => {
    jest.restoreAllMocks();
    service = new EsewaService();
  });

  describe("generatePaymentFields", () => {
    test("should generate signed payment fields", () => {
      const fields = service.generatePaymentFields({
        amount: 1000,
        transactionUuid: "order123",
        productCode: "EPAYTEST",
        successUrl: "https://example.com/success",
        failureUrl: "https://example.com/failure",
      });

      expect(fields.total_amount).toBe("1000.00");
      expect(fields.transaction_uuid).toBe("order123");
      expect(fields.product_code).toBe("EPAYTEST");
      expect(fields.signature).toBe(service.generateSignature(fields));
    });
  });

  describe("verifyPaymentv2", () => {
    test("should return true when eSewa reports a COMPLETE status", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({ status: "COMPLETE", ref_id: "ref123" }),
      } as any);

      const result = await service.verifyPaymentv2({
        totalAmount: 1000,
        transactionUuid: "order123",
        productCode: "EPAYTEST",
      });

      expect(result).toBe(true);
    });
  });
});
