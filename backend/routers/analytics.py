"""
Analytics Router - Exposes analytics endpoints for the dashboard
"""
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.analytics_service import (
    get_conversion_funnel,
    get_stage_conversion_rates,
    get_average_time_by_company,
    get_time_to_hire_statistics,
    get_success_rate_by_industry,
    get_success_rate_by_company_size,
    get_success_rate_by_day_of_week,
    get_success_rate_by_location,
    get_ats_score_correlation,
    get_daily_activity_heatmap,
    get_weekly_summary,
    get_monthly_summary,
    get_heatmap_metadata,
    get_complete_analytics
)

router = APIRouter()


class AnalyticsRequest(BaseModel):
    user_id: str


@router.post("/conversion-funnel")
async def conversion_funnel(request: AnalyticsRequest):
    """Get conversion funnel data with percentages"""
    try:
        data = await get_conversion_funnel(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f"Analytics error (conversion_funnel): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stage-conversion-rates")
async def stage_conversion_rates(request: AnalyticsRequest):
    """Get stage-to-stage conversion rates"""
    try:
        data = await get_stage_conversion_rates(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (stage_conversion_rates): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/time-by-company")
async def time_by_company(request: AnalyticsRequest):
    """Get average time between stages per company"""
    try:
        data = await get_average_time_by_company(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (time_by_company): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/time-to-hire")
async def time_to_hire(request: AnalyticsRequest):
    """Get overall time-to-hire statistics"""
    try:
        data = await get_time_to_hire_statistics(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (time_to_hire): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/by-industry")
async def by_industry(request: AnalyticsRequest):
    """Get success rate by industry"""
    try:
        data = await get_success_rate_by_industry(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (by_industry): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/by-company-size")
async def by_company_size(request: AnalyticsRequest):
    """Get success rate by company size"""
    try:
        data = await get_success_rate_by_company_size(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (by_company_size): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/by-day-of-week")
async def by_day_of_week(request: AnalyticsRequest):
    """Get success rate by day of week applied"""
    try:
        data = await get_success_rate_by_day_of_week(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (by_day_of_week): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/by-location")
async def by_location(request: AnalyticsRequest):
    """Get success rate by location"""
    try:
        data = await get_success_rate_by_location(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (by_location): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ats-correlation")
async def ats_correlation(request: AnalyticsRequest):
    """Get ATS score correlation with success rates"""
    try:
        data = await get_ats_score_correlation(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (ats_correlation): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/daily-heatmap")
async def daily_heatmap(request: AnalyticsRequest):
    """Get daily activity data for heatmap visualization"""
    try:
        data = await get_daily_activity_heatmap(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (daily_heatmap): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/weekly-summary")
async def weekly_summary(request: AnalyticsRequest):
    """Get weekly summary for trends"""
    try:
        data = await get_weekly_summary(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (weekly_summary): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/monthly-summary")
async def monthly_summary(request: AnalyticsRequest):
    """Get monthly summary with trends"""
    try:
        data = await get_monthly_summary(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (monthly_summary): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/heatmap-metadata")
async def heatmap_metadata(request: AnalyticsRequest):
    """Get metadata for heatmap rendering"""
    try:
        data = await get_heatmap_metadata(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (heatmap_metadata): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete")
async def complete_analytics(request: AnalyticsRequest):
    """Get all analytics data in a single call for the dashboard"""
    try:
        data = await get_complete_analytics(request.user_id)
        return {"success": True, "data": data}
    except Exception as e:
        print(f" Analytics error (complete): {e}")
        raise HTTPException(status_code=500, detail=str(e))
