import {
  joinWaitlist,
  listStudentWaitlist,
  getStudentWaitlistEntry,
  leaveWaitlist,
  listCounsellorWaitlist,
} from "../services/waitlistService.js";

import {
  successResponse,
} from "../utils/apiResponse.js";

export async function joinWaitlistController(
  req,
  res,
  next
) {
  try {
    const entry =
      await joinWaitlist({
        actor: req.user,
        slotId: req.body.slotId,
      });

    return successResponse(
      res,
      {
        entry,
      },
      {},
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function listWaitlistController(
  req,
  res,
  next
) {
  try {
    const entries =
      await listStudentWaitlist({
        actor: req.user,
        status: req.query.status,
        limit: req.query.limit,
      });

    return successResponse(
      res,
      {
        entries,
      }
    );
  } catch (error) {
    next(error);
  }
}

export async function getWaitlistController(
  req,
  res,
  next
) {
  try {
    const entry =
      await getStudentWaitlistEntry({
        actor: req.user,
        entryId: req.params.id,
      });

    return successResponse(
      res,
      {
        entry,
      }
    );
  } catch (error) {
    next(error);
  }
}

export async function leaveWaitlistController(
  req,
  res,
  next
) {
  try {
    const entry =
      await leaveWaitlist({
        actor: req.user,
        entryId: req.params.id,
      });

    return successResponse(
      res,
      {
        entry,
      }
    );
  } catch (error) {
    next(error);
  }
}

export async function listCounsellorWaitlistController(
  req,
  res,
  next
) {
  try {
    const entries =
      await listCounsellorWaitlist({
        actor: req.user,
        status: req.query.status,
        limit: req.query.limit,
      });

    return successResponse(
      res,
      {
        entries,
      }
    );
  } catch (error) {
    next(error);
  }
}