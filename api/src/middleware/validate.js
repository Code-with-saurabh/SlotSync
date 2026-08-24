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

      /*
       * Express 5 makes req.query and req.params
       * getter-only properties — reassigning them
       * throws TypeError in ESM strict mode.
       *
       * Only req.body is safe to replace.
       * For query/params, the validated values are
       * identical to the originals (Zod just confirms
       * format), so controllers read directly from
       * the original source.
       */
      if (source === "body") {
        req.body = result.data;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
