import { getCounsellorAnalytics, getInstituteAnalytics } from "../services/analyticsService.js";
import { successResponse } from "../utils/apiResponse.js";

export async function getAnalytics(req, res, next) {
  try {
    const analytics = await getCounsellorAnalytics({
      actor: req.user,
      counsellorId: req.params.id,
    });

    /*
     * Wrap in successResponse for consistent envelope.
     * Tests access res.body.data.utilisationPercent
     * so we spread analytics at the top level of data.
     */
    return successResponse(res, analytics);
  } catch (error) {
    next(error);
  }
}


export async function getInstituteAnalyticsController(req, res, next) {
  try {
    const analytics = await getInstituteAnalytics({
      actor: req.user,
    });

    return successResponse(res, analytics);
  } catch (error) {
    next(error);
  }
}
