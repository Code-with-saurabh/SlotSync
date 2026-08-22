import { getCounsellorAnalytics } from "../services/analyticsService.js";

export async function getAnalytics(req, res, next) {
  try {
    const analytics = await getCounsellorAnalytics({
      actor: req.user,
      counsellorId: req.params.id,
    });

    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
}