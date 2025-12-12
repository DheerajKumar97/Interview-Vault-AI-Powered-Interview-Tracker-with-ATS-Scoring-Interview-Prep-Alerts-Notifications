"""
Analytics Service - Handles all analytics and statistics queries for the dashboard
"""
from typing import Optional, Dict, Any, List
from services.supabase_service import get_admin_client


async def get_conversion_funnel(user_id: str) -> List[Dict[str, Any]]:
    """
    Overall conversion funnel with percentages
    Returns status counts with percentages and cumulative counts
    """
    supabase = get_admin_client()
    
    # Get all applications for the user
    response = supabase.table("applications").select("current_status").eq("user_id", user_id).execute()
    applications = response.data or []
    
    if not applications:
        return []
    
    total_apps = len(applications)
    
    # Count by status
    status_counts = {}
    for app in applications:
        status = app.get("current_status", "Unknown")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    # Define status order for funnel
    status_order = {
        'Applied': 1,
        'HR Screening Done': 2,
        'Shortlisted': 3,
        'Interview Scheduled': 4,
        'Interview Rescheduled': 4,
        'Selected': 5,
        'Offer Released': 6,
        'Rejected': 7,
        'Ghosted': 8
    }
    
    # Build funnel data
    funnel_data = []
    cumulative = 0
    
    sorted_statuses = sorted(status_counts.keys(), key=lambda x: status_order.get(x, 9))
    
    for status in sorted_statuses:
        count = status_counts[status]
        cumulative += count
        funnel_data.append({
            "status": status,
            "count": count,
            "percentage": round((count / total_apps) * 100, 1),
            "cumulative_count": cumulative
        })
    
    return funnel_data


async def get_stage_conversion_rates(user_id: str) -> Dict[str, Any]:
    """
    Stage-to-stage conversion rates
    Returns counts and percentages for each hiring stage
    """
    supabase = get_admin_client()
    
    response = supabase.table("applications").select("current_status").eq("user_id", user_id).execute()
    applications = response.data or []
    
    if not applications:
        return {
            "applied": 0, "progressed": 0, "shortlisted": 0,
            "interviewed": 0, "selected": 0, "offers": 0,
            "response_rate": 0, "shortlist_rate": 0, "interview_rate": 0,
            "selection_rate": 0, "offer_rate": 0, "overall_success_rate": 0
        }
    
    progressed_statuses = ['HR Screening Done', 'Shortlisted', 'Interview Scheduled', 
                          'Interview Rescheduled', 'Selected', 'Offer Released']
    shortlisted_statuses = ['Shortlisted', 'Interview Scheduled', 'Interview Rescheduled', 
                           'Selected', 'Offer Released']
    interviewed_statuses = ['Interview Scheduled', 'Interview Rescheduled', 'Selected', 'Offer Released']
    selected_statuses = ['Selected', 'Offer Released']
    
    applied = len(applications)
    progressed = sum(1 for a in applications if a.get("current_status") in progressed_statuses)
    shortlisted = sum(1 for a in applications if a.get("current_status") in shortlisted_statuses)
    interviewed = sum(1 for a in applications if a.get("current_status") in interviewed_statuses)
    selected = sum(1 for a in applications if a.get("current_status") in selected_statuses)
    offers = sum(1 for a in applications if a.get("current_status") == 'Offer Released')
    
    return {
        "applied": applied,
        "progressed": progressed,
        "shortlisted": shortlisted,
        "interviewed": interviewed,
        "selected": selected,
        "offers": offers,
        "response_rate": round((progressed / applied * 100), 1) if applied else 0,
        "shortlist_rate": round((shortlisted / applied * 100), 1) if applied else 0,
        "interview_rate": round((interviewed / applied * 100), 1) if applied else 0,
        "selection_rate": round((selected / interviewed * 100), 1) if interviewed else 0,
        "offer_rate": round((offers / interviewed * 100), 1) if interviewed else 0,
        "overall_success_rate": round((offers / applied * 100), 1) if applied else 0
    }


async def get_average_time_by_company(user_id: str) -> List[Dict[str, Any]]:
    """
    Average time between stages per company
    Uses status_history table for accurate timing
    """
    supabase = get_admin_client()
    
    # Get applications with their status history
    apps_response = supabase.table("applications").select(
        "id, name, applied_date, current_status"
    ).eq("user_id", user_id).execute()
    
    applications = apps_response.data or []
    
    if not applications:
        return []
    
    # Get status history for all user's applications
    app_ids = [app["id"] for app in applications]
    
    history_response = supabase.table("status_history").select("*").in_("application_id", app_ids).execute()
    history = history_response.data or []
    
    # Group history by application
    history_by_app = {}
    for h in history:
        app_id = h.get("application_id")
        if app_id not in history_by_app:
            history_by_app[app_id] = []
        history_by_app[app_id].append(h)
    
    # Calculate metrics per company
    company_metrics = {}
    
    for app in applications:
        company_name = app.get("name", "Unknown")
        app_id = app["id"]
        applied_date = app.get("applied_date")
        
        if company_name not in company_metrics:
            company_metrics[company_name] = {
                "total_applications": 0,
                "days_to_hr_screen": [],
                "days_to_shortlist": [],
                "days_to_interview": [],
                "days_to_selection": [],
                "days_to_offer": [],
                "offers_received": 0,
                "rejected_or_ghosted": 0
            }
        
        company_metrics[company_name]["total_applications"] += 1
        
        app_history = history_by_app.get(app_id, [])
        
        for h in app_history:
            new_status = h.get("new_status")
            changed_at = h.get("changed_at")
            
            if applied_date and changed_at:
                try:
                    from datetime import datetime
                    applied_dt = datetime.fromisoformat(applied_date.replace('Z', '+00:00'))
                    changed_dt = datetime.fromisoformat(changed_at.replace('Z', '+00:00'))
                    days_diff = (changed_dt - applied_dt).days
                    
                    if new_status == 'HR Screening Done':
                        company_metrics[company_name]["days_to_hr_screen"].append(days_diff)
                    elif new_status == 'Shortlisted':
                        company_metrics[company_name]["days_to_shortlist"].append(days_diff)
                    elif new_status in ['Interview Scheduled', 'Interview Rescheduled']:
                        company_metrics[company_name]["days_to_interview"].append(days_diff)
                    elif new_status == 'Selected':
                        company_metrics[company_name]["days_to_selection"].append(days_diff)
                    elif new_status == 'Offer Released':
                        company_metrics[company_name]["days_to_offer"].append(days_diff)
                        company_metrics[company_name]["offers_received"] += 1
                    elif new_status in ['Rejected', 'Ghosted']:
                        company_metrics[company_name]["rejected_or_ghosted"] += 1
                except Exception:
                    pass
    
    # Calculate averages
    results = []
    for company, metrics in company_metrics.items():
        def avg_or_none(lst):
            return round(sum(lst) / len(lst), 1) if lst else None
        
        results.append({
            "company_name": company,
            "total_applications": metrics["total_applications"],
            "avg_days_to_hr_screen": avg_or_none(metrics["days_to_hr_screen"]),
            "avg_days_to_shortlist": avg_or_none(metrics["days_to_shortlist"]),
            "avg_days_to_interview": avg_or_none(metrics["days_to_interview"]),
            "avg_days_to_selection": avg_or_none(metrics["days_to_selection"]),
            "avg_days_to_offer": avg_or_none(metrics["days_to_offer"]),
            "offers_received": metrics["offers_received"],
            "rejected_or_ghosted": metrics["rejected_or_ghosted"]
        })
    
    # Sort by avg_days_to_offer ascending (fastest to offer first)
    results.sort(key=lambda x: (x["avg_days_to_offer"] is None, x["avg_days_to_offer"] or 999))
    
    return results


async def get_time_to_hire_statistics(user_id: str) -> List[Dict[str, Any]]:
    """
    Overall time-to-hire statistics (all companies combined)
    Returns transition timing stats with average, median, min, max
    """
    supabase = get_admin_client()
    
    apps_response = supabase.table("applications").select("id, applied_date").eq("user_id", user_id).execute()
    applications = apps_response.data or []
    
    if not applications:
        return []
    
    app_ids = [app["id"] for app in applications]
    history_response = supabase.table("status_history").select("*").in_("application_id", app_ids).execute()
    history = history_response.data or []
    
    # Map applied dates by app_id
    applied_dates = {app["id"]: app.get("applied_date") for app in applications}
    
    # Calculate days for each transition
    transitions = {
        "Applied → HR Screen": [],
        "Applied → Shortlist": [],
        "Applied → Interview": [],
        "Applied → Offer": []
    }
    
    for h in history:
        app_id = h.get("application_id")
        new_status = h.get("new_status")
        changed_at = h.get("changed_at")
        applied_date = applied_dates.get(app_id)
        
        if applied_date and changed_at:
            try:
                from datetime import datetime
                applied_dt = datetime.fromisoformat(applied_date.replace('Z', '+00:00'))
                changed_dt = datetime.fromisoformat(changed_at.replace('Z', '+00:00'))
                days_diff = (changed_dt - applied_dt).days
                
                if new_status == 'HR Screening Done':
                    transitions["Applied → HR Screen"].append(days_diff)
                elif new_status == 'Shortlisted':
                    transitions["Applied → Shortlist"].append(days_diff)
                elif new_status in ['Interview Scheduled', 'Interview Rescheduled']:
                    transitions["Applied → Interview"].append(days_diff)
                elif new_status == 'Offer Released':
                    transitions["Applied → Offer"].append(days_diff)
            except Exception:
                pass
    
    results = []
    for transition_name, days_list in transitions.items():
        if days_list:
            sorted_days = sorted(days_list)
            median_idx = len(sorted_days) // 2
            median = sorted_days[median_idx] if len(sorted_days) % 2 == 1 else \
                     (sorted_days[median_idx - 1] + sorted_days[median_idx]) / 2
            
            results.append({
                "transition": transition_name,
                "avg_days": round(sum(days_list) / len(days_list), 1),
                "median_days": round(median, 1),
                "min_days": min(days_list),
                "max_days": max(days_list),
                "sample_size": len(days_list)
            })
    
    return results


async def get_success_rate_by_industry(user_id: str) -> List[Dict[str, Any]]:
    """
    Success rate by industry
    """
    supabase = get_admin_client()
    
    response = supabase.table("applications").select(
        "industry, current_status"
    ).eq("user_id", user_id).execute()
    
    applications = response.data or []
    
    if not applications:
        return []
    
    industry_stats = {}
    
    for app in applications:
        industry = app.get("industry") or "Not Specified"
        status = app.get("current_status", "")
        
        if industry not in industry_stats:
            industry_stats[industry] = {
                "total_apps": 0, "responses": 0, "interviews": 0, "offers": 0
            }
        
        industry_stats[industry]["total_apps"] += 1
        
        if status in ['HR Screening Done', 'Shortlisted', 'Interview Scheduled', 
                      'Interview Rescheduled', 'Selected', 'Offer Released']:
            industry_stats[industry]["responses"] += 1
        
        if status in ['Interview Scheduled', 'Interview Rescheduled', 'Selected', 'Offer Released']:
            industry_stats[industry]["interviews"] += 1
        
        if status == 'Offer Released':
            industry_stats[industry]["offers"] += 1
    
    results = []
    for industry, stats in industry_stats.items():
        if stats["total_apps"] >= 1:  # Show all industries
            results.append({
                "industry": industry,
                "total_apps": stats["total_apps"],
                "responses": stats["responses"],
                "interviews": stats["interviews"],
                "offers": stats["offers"],
                "response_rate": round((stats["responses"] / stats["total_apps"] * 100), 1) if stats["total_apps"] else 0,
                "interview_rate": round((stats["interviews"] / stats["total_apps"] * 100), 1) if stats["total_apps"] else 0,
                "offer_rate": round((stats["offers"] / stats["total_apps"] * 100), 1) if stats["total_apps"] else 0,
                "interview_to_offer_rate": round((stats["offers"] / stats["interviews"] * 100), 1) if stats["interviews"] else 0
            })
    
    # Sort by offer_rate descending
    results.sort(key=lambda x: (-x["offer_rate"], -x["total_apps"]))
    
    return results


async def get_success_rate_by_company_size(user_id: str) -> List[Dict[str, Any]]:
    """
    Success rate by company size
    """
    supabase = get_admin_client()
    
    response = supabase.table("applications").select(
        "company_size, current_status"
    ).eq("user_id", user_id).execute()
    
    applications = response.data or []
    
    if not applications:
        return []
    
    size_order = {
        'Startup (1-50)': 1,
        'Small (51-200)': 2,
        'Medium (201-1000)': 3,
        'Large (1001-5000)': 4,
        'Enterprise (5000+)': 5,
        'Unknown': 6
    }
    
    size_stats = {}
    
    for app in applications:
        size = app.get("company_size") or "Unknown"
        status = app.get("current_status", "")
        
        if size not in size_stats:
            size_stats[size] = {"total_apps": 0, "interviews": 0, "offers": 0}
        
        size_stats[size]["total_apps"] += 1
        
        if status in ['Interview Scheduled', 'Interview Rescheduled', 'Selected', 'Offer Released']:
            size_stats[size]["interviews"] += 1
        
        if status == 'Offer Released':
            size_stats[size]["offers"] += 1
    
    results = []
    for size, stats in size_stats.items():
        results.append({
            "company_size": size,
            "total_apps": stats["total_apps"],
            "interviews": stats["interviews"],
            "offers": stats["offers"],
            "interview_rate": round((stats["interviews"] / stats["total_apps"] * 100), 1) if stats["total_apps"] else 0,
            "offer_rate": round((stats["offers"] / stats["total_apps"] * 100), 1) if stats["total_apps"] else 0
        })
    
    # Sort by predefined order
    results.sort(key=lambda x: size_order.get(x["company_size"], 6))
    
    return results


async def get_success_rate_by_day_of_week(user_id: str) -> List[Dict[str, Any]]:
    """
    Success rate by day of week applied
    """
    supabase = get_admin_client()
    
    response = supabase.table("applications").select(
        "applied_date, current_status"
    ).eq("user_id", user_id).execute()
    
    applications = response.data or []
    
    if not applications:
        return []
    
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    day_stats = {day: {"applications": 0, "responses": 0, "interviews": 0, "offers": 0} for day in day_names}
    
    from datetime import datetime
    
    for app in applications:
        applied_date = app.get("applied_date")
        status = app.get("current_status", "")
        
        if applied_date:
            try:
                dt = datetime.fromisoformat(applied_date.replace('Z', '+00:00'))
                day_name = day_names[dt.weekday()]
                
                day_stats[day_name]["applications"] += 1
                
                if status in ['HR Screening Done', 'Shortlisted', 'Interview Scheduled', 
                              'Interview Rescheduled', 'Selected', 'Offer Released']:
                    day_stats[day_name]["responses"] += 1
                
                if status in ['Interview Scheduled', 'Interview Rescheduled', 'Selected', 'Offer Released']:
                    day_stats[day_name]["interviews"] += 1
                
                if status == 'Offer Released':
                    day_stats[day_name]["offers"] += 1
            except Exception:
                pass
    
    results = []
    for idx, day in enumerate(day_names):
        stats = day_stats[day]
        results.append({
            "day_of_week": day,
            "day_num": idx + 1,
            "applications": stats["applications"],
            "responses": stats["responses"],
            "interviews": stats["interviews"],
            "offers": stats["offers"],
            "response_rate": round((stats["responses"] / stats["applications"] * 100), 1) if stats["applications"] else 0,
            "interview_rate": round((stats["interviews"] / stats["applications"] * 100), 1) if stats["applications"] else 0,
            "offer_rate": round((stats["offers"] / stats["applications"] * 100), 1) if stats["applications"] else 0
        })
    
    return results


async def get_success_rate_by_location(user_id: str) -> List[Dict[str, Any]]:
    """
    Success rate by location
    """
    supabase = get_admin_client()
    
    response = supabase.table("applications").select(
        "location, current_status"
    ).eq("user_id", user_id).execute()
    
    applications = response.data or []
    
    if not applications:
        return []
    
    location_stats = {}
    
    for app in applications:
        location = app.get("location") or "Not Specified"
        status = app.get("current_status", "")
        
        if location not in location_stats:
            location_stats[location] = {"total_apps": 0, "interviews": 0, "offers": 0}
        
        location_stats[location]["total_apps"] += 1
        
        if status in ['Interview Scheduled', 'Interview Rescheduled', 'Selected', 'Offer Released']:
            location_stats[location]["interviews"] += 1
        
        if status == 'Offer Released':
            location_stats[location]["offers"] += 1
    
    results = []
    for location, stats in location_stats.items():
        if stats["total_apps"] >= 1:
            results.append({
                "location": location,
                "total_apps": stats["total_apps"],
                "interviews": stats["interviews"],
                "offers": stats["offers"],
                "interview_rate": round((stats["interviews"] / stats["total_apps"] * 100), 1) if stats["total_apps"] else 0,
                "offer_rate": round((stats["offers"] / stats["total_apps"] * 100), 1) if stats["total_apps"] else 0
            })
    
    results.sort(key=lambda x: (-x["offer_rate"], -x["total_apps"]))
    return results[:10]  # Limit to top 10


async def get_ats_score_correlation(user_id: str) -> List[Dict[str, Any]]:
    """
    ATS Score correlation with success rates
    """
    supabase = get_admin_client()
    
    response = supabase.table("applications").select(
        "ats_score, current_status"
    ).eq("user_id", user_id).not_.is_("ats_score", "null").execute()
    
    applications = response.data or []
    
    if not applications:
        return []
    
    score_buckets = {
        "80-100 (Excellent)": {"sort": 1, "total": 0, "interviews": 0, "offers": 0},
        "60-79 (Good)": {"sort": 2, "total": 0, "interviews": 0, "offers": 0},
        "40-59 (Average)": {"sort": 3, "total": 0, "interviews": 0, "offers": 0},
        "20-39 (Below Average)": {"sort": 4, "total": 0, "interviews": 0, "offers": 0},
        "0-19 (Poor)": {"sort": 5, "total": 0, "interviews": 0, "offers": 0}
    }
    
    for app in applications:
        score = app.get("ats_score")
        status = app.get("current_status", "")
        
        if score is None:
            continue
        
        # Handle string scores (e.g., "75%")
        if isinstance(score, str):
            try:
                score = float(score.replace('%', '').strip())
            except ValueError:
                continue
        
        if score >= 80:
            bucket = "80-100 (Excellent)"
        elif score >= 60:
            bucket = "60-79 (Good)"
        elif score >= 40:
            bucket = "40-59 (Average)"
        elif score >= 20:
            bucket = "20-39 (Below Average)"
        else:
            bucket = "0-19 (Poor)"
        
        score_buckets[bucket]["total"] += 1
        
        if status in ['Interview Scheduled', 'Interview Rescheduled', 'Selected', 'Offer Released']:
            score_buckets[bucket]["interviews"] += 1
        
        if status == 'Offer Released':
            score_buckets[bucket]["offers"] += 1
    
    results = []
    for bucket, stats in score_buckets.items():
        if stats["total"] > 0:
            results.append({
                "score_range": bucket,
                "total_apps": stats["total"],
                "interviews": stats["interviews"],
                "offers": stats["offers"],
                "interview_rate": round((stats["interviews"] / stats["total"] * 100), 1),
                "offer_rate": round((stats["offers"] / stats["total"] * 100), 1)
            })
    
    results.sort(key=lambda x: score_buckets[x["score_range"]]["sort"])
    return results


async def get_daily_activity_heatmap(user_id: str) -> List[Dict[str, Any]]:
    """
    Daily application activity for heatmap visualization
    """
    supabase = get_admin_client()
    
    from datetime import datetime, timedelta
    one_year_ago = (datetime.now() - timedelta(days=365)).isoformat()
    
    response = supabase.table("applications").select(
        "applied_date, current_status"
    ).eq("user_id", user_id).gte("applied_date", one_year_ago).execute()
    
    applications = response.data or []
    
    if not applications:
        return []
    
    daily_stats = {}
    
    for app in applications:
        applied_date = app.get("applied_date")
        status = app.get("current_status", "")
        
        if applied_date:
            date_key = applied_date[:10]  # Get YYYY-MM-DD
            
            if date_key not in daily_stats:
                daily_stats[date_key] = {"count": 0, "interviews": 0, "offers": 0}
            
            daily_stats[date_key]["count"] += 1
            
            if status in ['Interview Scheduled', 'Interview Rescheduled']:
                daily_stats[date_key]["interviews"] += 1
            
            if status == 'Offer Released':
                daily_stats[date_key]["offers"] += 1
    
    results = []
    for date, stats in daily_stats.items():
        count = stats["count"]
        intensity = 0 if count == 0 else (1 if count <= 2 else (2 if count <= 4 else (3 if count <= 6 else 4)))
        
        results.append({
            "date": date,
            "application_count": count,
            "interviews_count": stats["interviews"],
            "offers_count": stats["offers"],
            "intensity_level": intensity
        })
    
    results.sort(key=lambda x: x["date"])
    return results


async def get_weekly_summary(user_id: str) -> List[Dict[str, Any]]:
    """
    Weekly summary for trends visualization
    """
    supabase = get_admin_client()
    
    from datetime import datetime, timedelta
    one_year_ago = (datetime.now() - timedelta(days=365)).isoformat()
    
    response = supabase.table("applications").select(
        "applied_date, current_status, ats_score"
    ).eq("user_id", user_id).gte("applied_date", one_year_ago).execute()
    
    applications = response.data or []
    
    if not applications:
        return []
    
    weekly_stats = {}
    
    for app in applications:
        applied_date = app.get("applied_date")
        status = app.get("current_status", "")
        ats_score = app.get("ats_score")
        
        if applied_date:
            try:
                dt = datetime.fromisoformat(applied_date.replace('Z', '+00:00'))
                # Get start of week (Monday)
                week_start = (dt - timedelta(days=dt.weekday())).strftime('%Y-%m-%d')
                
                if week_start not in weekly_stats:
                    weekly_stats[week_start] = {"count": 0, "progress": 0, "ats_scores": []}
                
                weekly_stats[week_start]["count"] += 1
                
                if status in ['Interview Scheduled', 'Interview Rescheduled', 'Selected', 'Offer Released']:
                    weekly_stats[week_start]["progress"] += 1
                
                if ats_score is not None:
                    try:
                        score = float(str(ats_score).replace('%', '').strip())
                        weekly_stats[week_start]["ats_scores"].append(score)
                    except (ValueError, TypeError):
                        pass
            except Exception:
                pass
    
    results = []
    for week_start, stats in weekly_stats.items():
        avg_ats = round(sum(stats["ats_scores"]) / len(stats["ats_scores"]), 1) if stats["ats_scores"] else None
        
        results.append({
            "week_start": week_start,
            "weekly_applications": stats["count"],
            "weekly_progress": stats["progress"],
            "avg_ats_score": avg_ats
        })
    
    results.sort(key=lambda x: x["week_start"])
    return results


async def get_monthly_summary(user_id: str) -> List[Dict[str, Any]]:
    """
    Monthly summary with trends
    """
    supabase = get_admin_client()
    
    from datetime import datetime, timedelta
    one_year_ago = (datetime.now() - timedelta(days=365)).isoformat()
    
    response = supabase.table("applications").select(
        "applied_date, current_status"
    ).eq("user_id", user_id).gte("applied_date", one_year_ago).execute()
    
    applications = response.data or []
    
    if not applications:
        return []
    
    monthly_stats = {}
    
    for app in applications:
        applied_date = app.get("applied_date")
        status = app.get("current_status", "")
        
        if applied_date:
            month_key = applied_date[:7]  # YYYY-MM
            
            if month_key not in monthly_stats:
                monthly_stats[month_key] = {"applications": 0, "offers": 0, "rejections": 0}
            
            monthly_stats[month_key]["applications"] += 1
            
            if status == 'Offer Released':
                monthly_stats[month_key]["offers"] += 1
            
            if status in ['Rejected', 'Ghosted']:
                monthly_stats[month_key]["rejections"] += 1
    
    # Sort months and calculate trends
    sorted_months = sorted(monthly_stats.keys())
    results = []
    prev_apps = None
    
    for month in sorted_months:
        stats = monthly_stats[month]
        apps = stats["applications"]
        
        app_change = (apps - prev_apps) if prev_apps is not None else None
        app_change_percent = round((app_change / prev_apps * 100), 1) if prev_apps and app_change is not None else None
        
        # Format month name
        from datetime import datetime
        month_dt = datetime.strptime(month, '%Y-%m')
        month_name = month_dt.strftime('%b %Y')
        
        results.append({
            "month_name": month_name,
            "month": month,
            "applications": apps,
            "offers": stats["offers"],
            "rejections": stats["rejections"],
            "success_rate": round((stats["offers"] / apps * 100), 1) if apps else 0,
            "app_change": app_change,
            "app_change_percent": app_change_percent
        })
        
        prev_apps = apps
    
    # Return in descending order (most recent first)
    results.reverse()
    return results


async def get_heatmap_metadata(user_id: str) -> Dict[str, Any]:
    """
    Get metadata for heatmap rendering
    """
    supabase = get_admin_client()
    
    from datetime import datetime, timedelta
    one_year_ago = (datetime.now() - timedelta(days=365)).isoformat()
    
    response = supabase.table("applications").select(
        "applied_date"
    ).eq("user_id", user_id).gte("applied_date", one_year_ago).execute()
    
    applications = response.data or []
    
    if not applications:
        return {
            "first_application_date": None,
            "last_application_date": None,
            "total_active_days": 0,
            "total_applications": 0,
            "avg_apps_per_active_day": 0
        }
    
    dates = [app.get("applied_date")[:10] for app in applications if app.get("applied_date")]
    unique_dates = set(dates)
    
    if not dates:
        return {
            "first_application_date": None,
            "last_application_date": None,
            "total_active_days": 0,
            "total_applications": 0,
            "avg_apps_per_active_day": 0
        }
    
    return {
        "first_application_date": min(dates),
        "last_application_date": max(dates),
        "total_active_days": len(unique_dates),
        "total_applications": len(applications),
        "avg_apps_per_active_day": round(len(applications) / len(unique_dates), 1) if unique_dates else 0
    }


async def get_complete_analytics(user_id: str) -> Dict[str, Any]:
    """
    Get all analytics data in a single call for the dashboard
    """
    return {
        "conversion_funnel": await get_conversion_funnel(user_id),
        "stage_conversion_rates": await get_stage_conversion_rates(user_id),
        "time_by_company": await get_average_time_by_company(user_id),
        "time_to_hire": await get_time_to_hire_statistics(user_id),
        "by_industry": await get_success_rate_by_industry(user_id),
        "by_company_size": await get_success_rate_by_company_size(user_id),
        "by_day_of_week": await get_success_rate_by_day_of_week(user_id),
        "by_location": await get_success_rate_by_location(user_id),
        "ats_correlation": await get_ats_score_correlation(user_id),
        "daily_heatmap": await get_daily_activity_heatmap(user_id),
        "weekly_summary": await get_weekly_summary(user_id),
        "monthly_summary": await get_monthly_summary(user_id),
        "heatmap_metadata": await get_heatmap_metadata(user_id)
    }
