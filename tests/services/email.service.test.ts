jest.mock("nodemailer");

describe("EmailService", () => {
  let EmailService: any;
  let mockTransporter: any;

  beforeEach(() => {
    jest.resetModules();
    const nodemailer = require("nodemailer");
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: "test-id" }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Set environment variables for testing
    process.env.EMAIL_USER = "test@example.com";
    process.env.EMAIL_PASSWORD = "testpass";
    process.env.EMAIL_HOST = "smtp.gmail.com";
    process.env.EMAIL_PORT = "587";

    const EmailServiceModule = require("../../src/services/email.service");
    EmailService = EmailServiceModule.EmailService;
  });

  afterEach(() => {
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASSWORD;
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_PORT;
  });

  describe("sendPasswordReset", () => {
    test("should send password reset email successfully", async () => {
      const emailService = new EmailService();
      const result = await emailService.sendPasswordReset("test@example.com", "http://example.com/reset?token=abc123");

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Password Reset - FashioMe",
          html: expect.stringContaining("http://example.com/reset?token=abc123"),
        })
      );
    });
  });
});
