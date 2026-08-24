import {
  createBooking,
  listStudentBookings,
  listCounsellorBookings,
  getStudentBookingById,
  cancelBooking,
  markBookingOutcome
} from "../services/bookingService.js";
import {
  successResponse,
} from "../utils/apiResponse.js";

export async function createBookingController(
  req,
  res,
  next
) {
  try {
    const booking =
      await createBooking({
        actor: req.user,
        slotId: req.body.slotId,
      });

    return successResponse(
      res,
      {
        booking,
      },
      {},
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function listBookingsController(
  req,
  res,
  next
) {
  try {
    const bookings =
      await listStudentBookings({
        actor: req.user,
        status: req.query.status,
        limit: req.query.limit,
      });

    return successResponse(
      res,
      {
        bookings,
      }
    );
  } catch (error) {
    next(error);
  }
}

export async function getBookingController(
  req,
  res,
  next
) {
  try {
    const booking =
      await getStudentBookingById({
        actor: req.user,
        bookingId:
          req.params.id,
      });

    return successResponse(
      res,
      {
        booking,
      }
    );
  } catch (error) {
    next(error);
  }
}

export async function cancelBookingController(
  req,
  res,
  next
) {
  try {
    const booking =
      await cancelBooking({
        actor: req.user,
        bookingId: req.params.id,
      });

    return successResponse(
      res,
      {
        booking,
      },
      {
        action: "booking_cancelled",
      }
    );
  } catch (error) {
    next(error);
  }
}


export async function markOutcome(req, res, next) {
  try {
    const booking = await markBookingOutcome({
      actor: req.user,
      bookingId: req.params.id,
      outcome: req.body.outcome,
    });

    return successResponse(res, {
      booking,
    });
  } catch (error) {
    next(error);
  }
}


export async function listCounsellorBookingsController(
  req,
  res,
  next
) {
  try {
    const bookings =
      await listCounsellorBookings({
        actor: req.user,
        status: req.query.status,
        limit: req.query.limit,
      });

    return successResponse(
      res,
      {
        bookings,
      }
    );
  } catch (error) {
    next(error);
  }
}