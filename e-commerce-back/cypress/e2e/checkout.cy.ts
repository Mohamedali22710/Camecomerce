/**
 * Checkout end-to-end flow (MVP-23).
 *
 * Prerequisites:
 *   1. API running against a disposable replica-set database with
 *      `PAYMENT_PROVIDER=mock` (see docs/runbooks/PAYMENT_OPERATIONS.md).
 *   2. `npm run seed:e2e` run against the same database.
 *
 * Run:
 *   npm run cy:run -- --spec cypress/e2e/checkout.cy.ts
 *
 * The spec covers the launch flow: product -> cart -> COD order -> admin
 * visibility -> customer tracking, then the mock-card order envelope. It never
 * contacts Paymob and never completes a real payment.
 */

const userEmail = (Cypress.env("e2eUserEmail") as string) || "e2e.user@example.test";
const userPassword = (Cypress.env("e2eUserPassword") as string) || "E2eUser123!";
const adminEmail = (Cypress.env("e2eAdminEmail") as string) || "e2e.admin@example.test";
const adminPassword = (Cypress.env("e2eAdminPassword") as string) || "E2eAdmin123!";
const productName = "E2E CCTV Camera";

const shippingAddress = {
  fullName: "E2E Customer",
  phone: "+201000000000",
  street: "1 Test Street",
  city: "Cairo",
  country: "Egypt",
};

const login = (email: string, password: string) =>
  cy
    .request({
      method: "POST",
      url: "/auth/login",
      body: { email, password },
      failOnStatusCode: false,
    })
    .then((response) => {
      expect(response.status, `login for ${email}`).to.eq(200);
      return response.body.data.accessToken as string;
    });

const asUser = (token: string) => ({ Authorization: `user ${token}` });
const asAdmin = (token: string) => ({ Authorization: `admin ${token}` });

describe("Checkout E2E — product to tracked order", () => {
  let userToken: string;
  let adminToken: string;
  let product: any;

  before(() => {
    login(userEmail, userPassword).then((token) => {
      userToken = token;
    });
    login(adminEmail, adminPassword).then((token) => {
      adminToken = token;
    });

    cy.request({ method: "GET", url: "/products?limit=100" }).then((response) => {
      expect(response.status).to.eq(200);
      product = response.body.data.products.find((item: any) => item.en_name === productName);
      expect(
        product,
        `fixture product "${productName}" is missing; run npm run seed:e2e against this database`,
      ).to.exist;
    });
  });

  beforeEach(() => {
    cy.request({
      method: "DELETE",
      url: "/cart",
      headers: asUser(userToken),
      failOnStatusCode: false,
    });
  });

  it("creates a COD order from the cart, exposes it to admin, and tracks it for the customer", () => {
    const idempotencyKey = `e2e-cod-${Date.now()}`;

    cy.request({
      method: "POST",
      url: "/cart",
      headers: asUser(userToken),
      body: { productId: product._id, color: "White", size: "Default", quantity: 1 },
    }).then((response) => {
      expect([200, 201]).to.include(response.status);
    });

    cy.request({ method: "GET", url: "/cart", headers: asUser(userToken) }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.data.items).to.have.length(1);
      expect(response.body.data.currency).to.be.a("string");
    });

    cy.request({
      method: "POST",
      url: "/order",
      headers: asUser(userToken),
      body: {
        useCart: true,
        paymentMethod: "cod",
        shippingAddress,
        idempotencyKey,
      },
    }).then((response) => {
      expect(response.status).to.eq(201);
      const order = response.body.data;
      expect(order.orderNumber).to.match(/^CCTV-/);
      expect(order.paymentStatus).to.eq("pending");
      expect(order.totalAmount).to.be.greaterThan(0);

      cy.request({ method: "GET", url: "/cart", headers: asUser(userToken) }).then((cart) => {
        expect(cart.body.data.items).to.have.length(0);
      });

      cy.request({
        method: "GET",
        url: `/order/track/${order.orderNumber}`,
        headers: asUser(userToken),
      }).then((tracking) => {
        expect(tracking.status).to.eq(200);
        expect(tracking.body.data.orderNumber).to.eq(order.orderNumber);
        expect(tracking.body.data.events.length).to.be.greaterThan(0);

        cy.request({
          method: "GET",
          url: `/order/${order._id}/tracking`,
          headers: asUser(userToken),
        }).then((byId) => {
          expect(byId.status).to.eq(200);
          expect(byId.body.data.orderNumber).to.eq(order.orderNumber);
        });
      });

      cy.request({
        method: "PATCH",
        url: `/order/admin/${order._id}`,
        headers: asAdmin(adminToken),
        body: {
          shippingStatus: "shipped",
          shippingCarrier: "E2E Carrier",
          trackingNumber: "E2E-TRACK-1",
          reason: "End-to-end checkout test",
        },
      }).then((updated) => {
        expect(updated.status).to.eq(200);
        expect(updated.body.data.shippingStatus).to.eq("shipped");
      });

      cy.request({
        method: "GET",
        url: `/order/admin?paymentStatus=pending&limit=100`,
        headers: asAdmin(adminToken),
      }).then((adminList) => {
        expect(adminList.status).to.eq(200);
        const visible = adminList.body.data.orders.some((item: any) => item._id === order._id);
        expect(visible, "admin order list must include the new order").to.eq(true);
      });

      cy.request({
        method: "GET",
        url: `/order/track/${order.orderNumber}`,
        headers: asUser(userToken),
      }).then((tracking) => {
        expect(tracking.body.data.shippingStatus).to.eq("shipped");
        expect(tracking.body.data.shippingCarrier).to.eq("E2E Carrier");
        expect(tracking.body.data.trackingNumber).to.eq("E2E-TRACK-1");
      });
    });
  });

  it("creates a mock-card order and exposes only the hosted redirect envelope", () => {
    cy.request({ method: "GET", url: "/payment/methods" }).then((methods) => {
      expect(methods.status).to.eq(200);
      expect(methods.body.data.cod).to.eq(true);
      expect(methods.body.data.provider).to.eq("mock");
      expect(methods.body.data.methods.map((method: any) => method.code)).to.include("card");
    });

    cy.request({
      method: "POST",
      url: "/cart",
      headers: asUser(userToken),
      body: { productId: product._id, color: "White", size: "Default", quantity: 1 },
    }).then((response) => {
      expect([200, 201]).to.include(response.status);
    });

    cy.request({
      method: "POST",
      url: "/order",
      headers: asUser(userToken),
      body: {
        useCart: true,
        paymentMethod: "card",
        paymentMethodCode: "card",
        shippingAddress,
        idempotencyKey: `e2e-card-${Date.now()}`,
      },
    }).then((response) => {
      expect(response.status).to.eq(201);
      const order = response.body.data;
      expect(order.provider).to.eq("mock");
      expect(order.paymentStatus).to.eq("pending");
      expect(order.redirectUrl).to.include("/checkout/mock");
      expect(order).not.to.have.property("clientSecret");

      cy.request({
        method: "GET",
        url: `/payment/status/${order.orderNumber}`,
        headers: asUser(userToken),
      }).then((status) => {
        expect(status.status).to.eq(200);
        expect(status.body.data.paymentStatus).to.eq("pending");
        expect(status.body.data.nextAction).to.eq("complete_payment");
      });

      cy.request({
        method: "POST",
        url: "/payment/session",
        headers: asUser(userToken),
        body: { orderNumber: order.orderNumber, method: "card" },
      }).then((retry) => {
        expect(retry.status).to.eq(200);
        expect(retry.body.data.redirectUrl).to.include("/checkout/mock");
      });
    });
  });
});
