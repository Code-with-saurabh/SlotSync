import {
  createSlot,
  listSlots,
  getSlotById,
  updateSlot,
} from "../services/slotService.js";

import {
  successResponse,
} from "../utils/apiResponse.js";

export async function createSlotController(
  req,
  res,
  next
) {
  try {
    const slot =
      await createSlot({
        actor: req.user,
        ...req.body,
      });

    return successResponse(
      res,
      { slot },
      {},
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function listSlotsController(
  req,
  res,
  next
) {
  try {
    const result =
      await listSlots(req.query);

    return successResponse(
      res,
      {
        slots: result.slots,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      }
    );
  } catch (error) {
    next(error);
  }
}

export async function getSlotController(
  req,
  res,
  next
) {
  try {
    const slot =
      await getSlotById(
        req.params.id
      );

    return successResponse(
      res,
      { slot }
    );
  } catch (error) {
    next(error);
  }
}

export async function updateSlotController(
  req,
  res,
  next
) {
  try {
    const slot =
      await updateSlot({
        actor: req.user,
        slotId: req.params.id,
        updates: req.body,
      });

    return successResponse(
      res,
      { slot }
    );
  } catch (error) {
    next(error);
  }
}