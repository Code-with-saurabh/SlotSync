import request from "supertest";
import bcrypt from "bcrypt";

import app from "../src/app.js";

import User from "../src/models/User.js";
import Slot from "../src/models/Slot.js";
import Booking from "../src/models/Booking.js";

import { createAccessToken } from "../src/utils/jwt.js";

describe("Booking API", () => {
  let student;
  let counsellor;
  let slot;

  let studentToken;

  beforeEach(async () => {
    /*
     * Clean test data.
     */

    await Booking.deleteMany({
      studentId: {
        $exists: true,
      },
    });

    await Slot.deleteMany({
      counsellorId: {
        $exists: true,
      },
    });

    await User.deleteMany({
      email: {
        $regex: /^booking-test-/,
      },
    });

    const passwordHash =
      await bcrypt.hash(
        "TestPassword123!",
        10
      );

    /*
     * Create counsellor.
     */

    counsellor = await User.create({
      name: "Booking Test Counsellor",

      email:
        `booking-test-counsellor-${Date.now()}@test.local`,

      passwordHash,

      role: "counsellor",

      isActive: true,
    });

    /*
     * Create student.
     */

    student = await User.create({
      name: "Booking Test Student",

      email:
        `booking-test-student-${Date.now()}@test.local`,

      passwordHash,

      role: "student",

      isActive: true,
    });

    /*
     * Create a future slot.
     *
     * Must be more than 30 minutes
     * in the future because the booking
     * service enforces the booking window.
     */

    const startAt = new Date(
      Date.now() +
        2 * 60 * 60 * 1000
    );

    const endAt = new Date(
      startAt.getTime() +
        30 * 60 * 1000
    );

    slot = await Slot.create({
      counsellorId:
        counsellor._id,

      startAt,

      endAt,

      capacity: 2,

      bookedCount: 0,

      status: "open",
    });

    /*
     * Generate student access token.
     */

    studentToken =
      createAccessToken(
        student
      );
  });

  afterEach(async () => {
    /*
     * Remove booking created by
     * this test.
     */

    await Booking.deleteMany({
      studentId: student?._id,
    });

    /*
     * Remove slot.
     */

    if (slot?._id) {
      await Slot.deleteOne({
        _id: slot._id,
      });
    }

    /*
     * Remove users.
     */

    if (student?._id) {
      await User.deleteOne({
        _id: student._id,
      });
    }

    if (counsellor?._id) {
      await User.deleteOne({
        _id: counsellor._id,
      });
    }
  });

  test("creates a booking successfully", async () => {
    const response =
      await request(app)
        .post("/api/bookings")
        .set(
          "Authorization",
          `Bearer ${studentToken}`
        )
        .send({
          slotId:
            slot._id.toString(),
        });

    expect(
      response.status
    ).toBe(201);

    expect(
      response.body.success
    ).toBe(true);

    expect(
      response.body.data.booking
    ).toBeDefined();

    expect(
      response.body.data.booking.studentId
        .toString()
    ).toBe(
      student._id.toString()
    );

    expect(
      response.body.data.booking.slotId
        .toString()
    ).toBe(
      slot._id.toString()
    );

    /*
     * Verify database state.
     */

    const savedBooking =
      await Booking.findOne({
        studentId:
          student._id,

        slotId:
          slot._id,
      }).lean();

    expect(
      savedBooking
    ).not.toBeNull();

    expect(
      savedBooking.status
    ).toBe("booked");

    /*
     * Verify slot capacity
     * was consumed.
     */

    const updatedSlot =
      await Slot.findById(
        slot._id
      ).lean();

    expect(
      updatedSlot.bookedCount
    ).toBe(1);
  });

  test(
    "rejects booking without authentication",
    async () => {
      const response =
        await request(app)
          .post("/api/bookings")
          .send({
            slotId:
              slot._id.toString(),
          });

      expect(
        response.status
      ).toBe(401);

      expect(
        response.body.success
      ).toBe(false);

      expect(
        response.body.error.code
      ).toBe("AUTH_REQUIRED");
    }
  );

  test(
    "rejects invalid slot ID",
    async () => {
      const response =
        await request(app)
          .post("/api/bookings")
          .set(
            "Authorization",
            `Bearer ${studentToken}`
          )
          .send({
            slotId: "invalid-slot-id",
          });

      expect(
        response.status
      ).toBe(422);

      expect(
        response.body.success
      ).toBe(false);

      expect(
        response.body.error.code
      ).toBe(
        "VALIDATION_ERROR"
      );
    }
  );

  test(
    "rejects missing slot ID",
    async () => {
      const response =
        await request(app)
          .post("/api/bookings")
          .set(
            "Authorization",
            `Bearer ${studentToken}`
          )
          .send({});

      expect(
        response.status
      ).toBe(422);

      expect(
        response.body.success
      ).toBe(false);

      expect(
        response.body.error.code
      ).toBe(
        "VALIDATION_ERROR"
      );
    }
  );

  test(
    "prevents duplicate booking for the same student and slot",
    async () => {
      /*
       * First booking.
       */

      const firstResponse =
        await request(app)
          .post("/api/bookings")
          .set(
            "Authorization",
            `Bearer ${studentToken}`
          )
          .send({
            slotId:
              slot._id.toString(),
          });

      expect(
        firstResponse.status
      ).toBe(201);

      /*
       * Second booking attempt.
       */

      const secondResponse =
        await request(app)
          .post("/api/bookings")
          .set(
            "Authorization",
            `Bearer ${studentToken}`
          )
          .send({
            slotId:
              slot._id.toString(),
          });

      expect(
        secondResponse.status
      ).toBe(409);

      expect(
        secondResponse.body.error.code
      ).toBe(
        "DUPLICATE_BOOKING"
      );

      /*
       * Only one booking should exist.
       */

      const bookings =
        await Booking.find({
          studentId:
            student._id,

          slotId:
            slot._id,
        }).lean();

      expect(
        bookings.length
      ).toBe(1);
    }
  );

  test(
    "returns a student's booking list",
    async () => {
      /*
       * Create booking.
       */

      const createResponse =
        await request(app)
          .post("/api/bookings")
          .set(
            "Authorization",
            `Bearer ${studentToken}`
          )
          .send({
            slotId:
              slot._id.toString(),
          });

      expect(
        createResponse.status
      ).toBe(201);

      /*
       * Fetch list.
       */

      const response =
        await request(app)
          .get("/api/bookings")
          .set(
            "Authorization",
            `Bearer ${studentToken}`
          );

      expect(
        response.status
      ).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        Array.isArray(
          response.body.data.bookings
        )
      ).toBe(true);

      expect(
        response.body.data.bookings.length
      ).toBe(1);

      expect(
        response.body.data.bookings[0]._id
      ).toBeDefined();
    }
  );

  test(
    "returns a single student booking",
    async () => {
      /*
       * Create booking.
       */

      const createResponse =
        await request(app)
          .post("/api/bookings")
          .set(
            "Authorization",
            `Bearer ${studentToken}`
          )
          .send({
            slotId:
              slot._id.toString(),
          });

      expect(
        createResponse.status
      ).toBe(201);

      const bookingId =
        createResponse.body.data
          .booking._id;

      /*
       * Fetch booking.
       */

      const response =
        await request(app)
          .get(
            `/api/bookings/${bookingId}`
          )
          .set(
            "Authorization",
            `Bearer ${studentToken}`
          );

      expect(
        response.status
      ).toBe(200);

      expect(
        response.body.success
      ).toBe(true);

      expect(
        response.body.data.booking
      ).toBeDefined();

      expect(
        response.body.data.booking._id
      ).toBe(bookingId);
    }
  );

  test(
    "does not allow one student to access another student's booking",
    async () => {
      /*
       * First student creates booking.
       */

      const createResponse =
        await request(app)
          .post("/api/bookings")
          .set(
            "Authorization",
            `Bearer ${studentToken}`
          )
          .send({
            slotId:
              slot._id.toString(),
          });

      expect(
        createResponse.status
      ).toBe(201);

      const bookingId =
        createResponse.body.data
          .booking._id;

      /*
       * Create second student.
       */

      const passwordHash =
        await bcrypt.hash(
          "TestPassword123!",
          10
        );

      const secondStudent =
        await User.create({
          name:
            "Booking Test Student Two",

          email:
            `booking-test-second-${Date.now()}@test.local`,

          passwordHash,

          role: "student",

          isActive: true,
        });

      const secondToken =
        createAccessToken(
          secondStudent
        );

      /*
       * Second student tries to access
       * first student's booking.
       */

      const response =
        await request(app)
          .get(
            `/api/bookings/${bookingId}`
          )
          .set(
            "Authorization",
            `Bearer ${secondToken}`
          );

      expect(
        response.status
      ).toBe(404);

      expect(
        response.body.success
      ).toBe(false);

      expect(
        response.body.error.code
      ).toBe(
        "RESOURCE_NOT_FOUND"
      );

      await User.deleteOne({
        _id:
          secondStudent._id,
      });
    }
  );
});