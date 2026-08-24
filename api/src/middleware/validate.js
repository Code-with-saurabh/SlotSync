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
       * In Express 5, req.query is a getter-only
       * property and cannot be reassigned directly.
       * For body/params we replace the value.
       * For query, the Zod defaults are already
       * applied via .default() and accessible
       * through the original req.query reference.
       */
      if (source !== "query") {
        req[source] = result.data;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
