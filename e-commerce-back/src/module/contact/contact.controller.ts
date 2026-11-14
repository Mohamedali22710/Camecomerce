/** Contact routes: public contact form. */
import { Router } from "express";

import { rateLimiter } from "../../common/utils/rateLimit.js";
import { validateInput } from "../../common/utils/validate.js";

import { submitContactForm } from "./contact.service.js";
import { contactFormValidate } from "./contact.validate.js";

const router = Router();

router.post("/", rateLimiter(60, 5), validateInput(contactFormValidate), submitContactForm);

export default router;
