export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const target = req[source];

      const result = schema.safeParse(target);

      if (!result.success) {
        return res.status(422).json({
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed.",
            details: result.error.flatten(),
          },
          meta: {},
        });
      }

      if (source !== "query") {
        req[source] = result.data;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// export function validate(schema, source = "body") {
//   return (req, res, next) => {
//     try {
//       const target = req[source];

//       const result = schema.safeParse(target);

//       if (!result.success) {
//         return res.status(422).json({
//           success: false,
//           data: null,
//           error: {
//             code: "VALIDATION_ERROR",
//             message: "Request validation failed.",
//             details: result.error.flatten(),
//           },
//           meta: {},
//         });
//       }

//       req[source] = result.data;

//       next();
//     } catch (error) {
//       next(error);
//     }
//   };
// }