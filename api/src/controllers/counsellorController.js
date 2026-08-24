import {
    listCounsellors,
    createCounsellor,
    updateCounsellor,
    setCounsellorStatus,
} from "../services/counsellorService.js";

import {
    successResponse,
} from "../utils/apiResponse.js";


export async function listCounsellorsController(
    req,
    res,
    next
) {
    try {
        const counsellors =
            await listCounsellors(
                req.query
            );

        return successResponse(
            res,
            {
                counsellors,
            }
        );
    } catch (error) {
        next(error);
    }
}


export async function createCounsellorController(
    req,
    res,
    next
) {
    try {
        const counsellor =
            await createCounsellor(
                req.body
            );

        return successResponse(
            res,
            {
                counsellor,
            },
            {},
            201
        );
    } catch (error) {
        next(error);
    }
}


export async function updateCounsellorController(
    req,
    res,
    next
) {
    try {
        const counsellor =
            await updateCounsellor({
                counsellorId:
                    req.params.id,

                ...req.body,
            });

        return successResponse(
            res,
            {
                counsellor,
            }
        );
    } catch (error) {
        next(error);
    }
}


export async function updateCounsellorStatusController(
    req,
    res,
    next
) {
    try {
        const counsellor =
            await setCounsellorStatus({
                counsellorId:
                    req.params.id,

                isActive:
                    req.body.isActive,
            });

        return successResponse(
            res,
            {
                counsellor,
            }
        );
    } catch (error) {
        next(error);
    }
}