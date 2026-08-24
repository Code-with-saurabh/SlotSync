import { Router } from "express";

import {
    listCounsellorsController,
    createCounsellorController,
    updateCounsellorController,
    updateCounsellorStatusController,
} from "../controllers/counsellorController.js";

import {
    authenticate,
} from "../middleware/authenticate.js";

import {
    authorize,
} from "../middleware/authorize.js";

import {
    validate,
} from "../middleware/validate.js";

import {
    createCounsellorSchema,
    updateCounsellorSchema,
    counsellorStatusSchema,
    listCounsellorsSchema,
} from "../validators/counsellorSchemas.js";

const router = Router();


/*
 * GET /api/counsellors
 *
 * Admin:
 * - list all counsellors
 */
router.get(
    "/",
    authenticate,
    authorize("admin"),
    validate(
        listCounsellorsSchema,
        "query"
    ),
    listCounsellorsController
);


/*
 * POST /api/counsellors
 *
 * Admin:
 * - create counsellor
 */
router.post(
    "/",
    authenticate,
    authorize("admin"),
    validate(
        createCounsellorSchema,
        "body"
    ),
    createCounsellorController
);


/*
 * PATCH /api/counsellors/:id
 *
 * Admin:
 * - edit counsellor
 */
router.patch(
    "/:id",
    authenticate,
    authorize("admin"),
    validate(
        updateCounsellorSchema,
        "body"
    ),
    updateCounsellorController
);


/*
 * PATCH /api/counsellors/:id/status
 *
 * Admin:
 * - activate/deactivate
 */
router.patch(
    "/:id/status",
    authenticate,
    authorize("admin"),
    validate(
        counsellorStatusSchema,
        "body"
    ),
    updateCounsellorStatusController
);


export default router;