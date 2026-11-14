# Backend Code Audit & Cleanup — CCTV E-Commerce

You are acting as a **Senior Backend Engineer and Software Architect**.

I downloaded this backend repository as a starting point for a real e-commerce project that sells CCTV surveillance cameras and offers optional installation services.

Your task is to inspect the existing codebase, understand its architecture, identify what we actually need, remove unnecessary or unused code safely, and document the final result.

## 1. Project Requirements

The target project is a CCTV e-commerce store with two types of customer requests:

1. **Product Purchase:** Customers browse cameras and accessories, add products to cart, and place orders.
2. **Purchase + Installation:** Customers can request installation alongside their purchased products. This should be handled as a separate service workflow, not mixed with payment or shipping status.

### Target Technology Stack

- Node.js
- TypeScript
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Role-Based Access Control (RBAC)

**Important:**

- Keep MongoDB and Mongoose.
- Do NOT migrate to PostgreSQL, MySQL, or any other database.
- Do NOT replace Express with NestJS.
- Do NOT rewrite the entire project just to change its structure.
- Keep TypeScript as the primary language.
- Do not introduce unnecessary dependencies or infrastructure.

## 2. Phase One — Full Codebase Audit

Before changing anything, inspect the entire backend.

Review:

- `package.json` and dependencies.
- `tsconfig.json` and build configuration.
- Project folder structure.
- Database connection and configuration.
- Mongoose models and schemas.
- Controllers, services, routes, and middleware.
- Authentication and authorization.
- Validation and error handling.
- Payment integrations.
- Product and category management.
- Cart and checkout logic.
- Order management.
- Inventory and stock management.
- Image/file uploads.
- Email and notification services.
- Redis, queues, cron jobs, and background workers.
- Logging and security middleware.
- Tests and scripts.
- Environment variables and configuration.

Do not assume that a feature works just because it exists in the repository. Trace its actual implementation and dependencies.

## 3. Phase Two — Feature Classification

Classify every existing feature into one of these categories:

### KEEP

Features that are directly useful and should remain.

Examples:

- Database connection.
- Authentication and authorization.
- User and admin management.
- Product and category CRUD.
- Product images.
- Cart.
- Checkout.
- Order creation and management.
- Stock validation.
- Basic security middleware.
- Validation and centralized error handling.

### MODIFY

Features that are useful but need changes to fit our project.

Examples:

- Payment integration: prepare the architecture for a Saudi payment provider such as Moyasar or Tap.
- Shipping: support basic shipping information and manual tracking initially.
- Order statuses: make statuses clear and consistent.
- User roles: keep only roles that are actually needed.
- Product and inventory logic: support CCTV cameras and accessories.

### REMOVE

Features that are unnecessary for our project.

Examples:

- Unused authentication providers.
- Duplicate services or utilities.
- Unused payment providers.
- Unused notification systems.
- Dead code and abandoned modules.
- Unused dependencies.
- Features that introduce unnecessary complexity without business value.

### OPTIONAL / FUTURE

Features that could be useful later but are not required for the initial release.

Examples:

- Redis caching.
- BullMQ and background jobs.
- Advanced analytics.
- Wishlist.
- Product reviews.
- Automated shipping provider integrations.
- Advanced marketing features.
- Technician assignment and scheduling.

Do not remove a feature simply because it is not currently used by another module. Check whether it is intentionally prepared for future use.

## 4. Phase Three — Cleanup and Implementation

After completing the audit:

1. Remove only confirmed unnecessary files, modules, dependencies, and code.
2. Preserve all useful business logic.
3. Refactor duplicated code where necessary.
4. Fix broken imports and references caused by cleanup.
5. Ensure all routes and middleware are correctly connected.
6. Keep a consistent separation between controllers, services, models, and routes.
7. Ensure authentication and authorization remain functional.
8. Keep validation and centralized error handling.
9. Remove unused environment variables and update `.env.example`.
10. Never expose real credentials, API keys, or secrets.
11. Do not install additional packages unless they are genuinely needed.
12. Do not implement fake payment or shipping integrations.

### Important Business Logic

Keep these concepts separate:

- Payment Status
- Order Status
- Shipping Status
- Installation Request Status

An order may contain products with installation requested, but installation must have its own workflow.

For example, an installation request may eventually have statuses such as:

- PENDING
- UNDER_REVIEW
- SCHEDULED
- IN_PROGRESS
- COMPLETED
- CANCELLED

Do not implement a complete technician management system unless the existing code already provides useful functionality that can be retained.

### Payment Requirements

Our initial target market is Saudi Arabia.

Prepare the payment architecture so that we can integrate a Saudi payment provider later, such as Moyasar or Tap.

Do not assume that an existing Stripe or PayPal integration is suitable.

Payment confirmation must not rely only on the frontend success redirect. Preserve or prepare a secure server-side webhook verification flow where applicable.

Never store card details.

## 5. Security and Quality Review

Inspect and report potential issues related to:

- Password hashing.
- JWT validation and expiration.
- Refresh token handling, if implemented.
- RBAC and authorization checks.
- Input validation.
- NoSQL injection.
- Rate limiting.
- CORS configuration.
- Helmet.
- Secure cookie configuration.
- File upload validation.
- Sensitive information in logs.
- Environment variable handling.
- Payment webhook verification.
- Order ownership and access control.
- Stock consistency and duplicate order submissions.

Do not claim a security issue is fixed unless you actually implement and verify the fix.

## 6. Testing and Verification

After cleanup:

- Run the available build command.
- Run TypeScript checks.
- Run existing tests.
- Run linting if configured.
- Check for broken imports and missing modules.
- Verify the database connection configuration.
- Verify route registration.
- Verify that the main business flows are still connected.

If you cannot run a test because a database, API key, or external service is unavailable, document that limitation clearly.

Do not fake successful test results.

## 7. Documentation

Create a detailed Markdown file at the backend root:

`BACKEND_AUDIT_AND_CLEANUP.md`

The file must include:

### A. Original Architecture

Explain the original backend structure and how its components interact.

### B. Feature Audit

A table containing:

| Feature / Module | Original Status | Decision | Reason | Changes Made |
| ---------------- | --------------- | -------- | ------ | ------------ |

### C. Removed Files and Dependencies

List everything removed and explain why it was safe to remove.

### D. Retained Features

Explain which features remain and how they support our business requirements.

### E. Modified Features

Explain what changed and why.

### F. Current Backend Architecture

Show the final folder structure and explain the responsibility of each important folder.

### G. Database Models

Document the existing models and their relationships. Highlight any models that may need future changes.

### H. API Endpoints

Document the existing endpoints, HTTP methods, authentication requirements, and their purposes.

Do not invent endpoints that do not exist.

### I. Security Review

List identified issues, fixes implemented, and remaining risks.

### J. Environment Variables

Document the required environment variables and update `.env.example` without real secrets.

### K. Testing Results

List commands executed and their actual results.

### L. Future Development

Separate future requirements from the initial release.

Prioritize:

1. Saudi payment gateway integration.
2. Shipping provider integration.
3. Installation request workflow.
4. Technician management.
5. Advanced analytics and marketing.

## 8. Critical Rules

- Do not delete anything before understanding its dependencies.
- Do not make large architectural changes without a clear reason.
- Do not change existing API behavior unnecessarily.
- Do not break working authentication or business logic.
- Do not remove functionality simply because it is not immediately visible.
- Do not claim that something works without verification.
- Do not create unnecessary abstractions or over-engineer the backend.
- Preserve existing project conventions where they are reasonable.
- If a feature's purpose is unclear, keep it and mark it for manual review.
- Do not modify frontend code or unrelated files.
- Do not overwrite existing documentation without checking it first.

## 9. Execution Strategy

Work in this order:

1. Inspect the repository and understand its architecture.
2. Produce the feature classification.
3. Identify risks and dependencies.
4. Perform the cleanup.
5. Run verification and tests.
6. Create `BACKEND_AUDIT_AND_CLEANUP.md`.
7. Provide a final summary of all changes.

If Git is available, check the current branch and working tree first. Never overwrite or discard existing user changes. Recommend creating a dedicated cleanup branch before making destructive changes.

**Final objective:** Deliver a clean, understandable, maintainable TypeScript + Express + MongoDB backend that contains only the functionality we need for the initial CCTV e-commerce release, while keeping a clear path for future development.
