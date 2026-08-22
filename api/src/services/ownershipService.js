import Slot from "../models/Slot.js";

export async function getSlotOwnerId(
  slotId
) {
  const slot = await Slot.findById(
    slotId
  ).select("counsellorId");

  if (!slot) {
    return null;
  }

  return slot.counsellorId;
}



/*
Later we'll use:

requireOwnership({
  param: "slotId",
  getOwnerId: getSlotOwnerId,
});


*/