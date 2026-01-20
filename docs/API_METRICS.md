# API Metrics

**Purpose**: This document lists all metrics that must be obtained from the REST API when implemented, instead of static JSON files.

**Last Updated**: 2025-01-27

---

## Summary

The metrics listed here are **time-sensitive** or require **real-time data** (updated every 15 minutes), so they must be obtained from the REST API instead of static JSON files (which are updated once per day).

**⚠️ User-Agent Required**: All REST API endpoints listed here **require a valid User-Agent** (format: `AppName/Version (Contact)`). OAuth with OSM is optional and only required for specific functionalities. See [AUTHENTICATION_STRATEGY.md](AUTHENTICATION_STRATEGY.md) for details on the hybrid authentication strategy.

---

## User Profile - API Metrics

**Endpoint**: `GET /api/v1/users/{user_id}/recent-activity`

### Recent Activity Metrics (Time-Sensitive)
- `notes_created_last_30_days` ⚠️ **API ONLY**
- `notes_resolved_last_30_days` ⚠️ **API ONLY**
- `days_since_last_action` ⚠️ **API ONLY**
- `active_notes_count` ⚠️ **API ONLY** (currently active notes)

### Current Period Metrics (Real-Time)
- `countries_open_notes_current_month` ⚠️ **API ONLY**
- `countries_solving_notes_current_month` ⚠️ **API ONLY**
- `countries_open_notes_current_day` ⚠️ **API ONLY**
- `countries_solving_notes_current_day` ⚠️ **API ONLY**

### Current Status (Real-Time)
- `currently_open_count` ⚠️ **API ONLY** (if needed for real-time display)
- `notes_backlog_size` ⚠️ **API ONLY** (if needed for real-time display)

**Note**: Some of these metrics exist in JSON but are **snapshots from the daily export**. For real-time accuracy, use the API.

---

## Country Profile - API Metrics

**Endpoint**: `GET /api/v1/countries/{country_id}/current-stats`

### Recent Activity Metrics (Time-Sensitive)
- `notes_created_last_30_days` ⚠️ **API ONLY**
- `notes_resolved_last_30_days` ⚠️ **API ONLY**

### Current Status (Real-Time)
- `currently_open_count` ⚠️ **API ONLY**
- `currently_closed_count` ⚠️ **API ONLY**
- `notes_backlog_size` ⚠️ **API ONLY**
- `active_notes_count` ⚠️ **API ONLY**
- `notes_health_score` ⚠️ **API ONLY** (if needed for real-time display)
- `new_vs_resolved_ratio` ⚠️ **API ONLY** (if needed for real-time calculation)

---

## Global Statistics - API Metrics

**Endpoint**: `GET /api/v1/global/current-stats`

### Current Statistics (Real-Time)
- `currently_open_count` ⚠️ **API ONLY**
- `currently_closed_count` ⚠️ **API ONLY**
- `notes_created_last_30_days` ⚠️ **API ONLY**
- `notes_resolved_last_30_days` ⚠️ **API ONLY**
- `notes_backlog_size` ⚠️ **API ONLY**
- `active_users_count` ⚠️ **API ONLY**
- `notes_age_distribution` ⚠️ **API ONLY** (if needed for real-time display)

---

## Dynamic Queries (API Only)

These operations require the REST API (not available in JSON):

### Search & Filter Operations
- `GET /api/v1/users?country={country_id}&min_notes={count}&sort={field}`
- `GET /api/v1/countries?health_score_min={score}&sort={field}`
- `GET /api/v1/users?hashtag={tag}&date_from={date}&date_to={date}`

### Comparison Operations
- `GET /api/v1/compare/users?ids={id1,id2,id3}`
- `GET /api/v1/compare/countries?ids={id1,id2,id3}`

### Ranking Operations (Real-Time)
- `GET /api/v1/users/rankings?metric={field}&limit={count}`
- `GET /api/v1/countries/rankings?metric={field}&limit={count}`

---

## Criteria for Identifying API Metrics

### Use REST API When:
- ⚠️ The metric contains **"last_30_days"**, **"current"**, **"today"**, **"recent"**
- ⚠️ The metric is a **count of currently active elements**
- ⚠️ The metric is **time-sensitive** (backlog, days since last action)
- ⚠️ The metric needs **real-time accuracy** (within 15 minutes)
- ⚠️ You need **dynamic queries** (search, filters, comparisons)

---

## Fallback Strategy

### When API is Not Available

If the API is not yet implemented or unavailable:

1. **Use JSON for all metrics** (including recent activity)
2. **Show a notice**: "Data updated daily. For real-time data, API coming soon."
3. **Cache JSON aggressively** (24 hours)
4. **Show timestamp**: Display `export_date` from `metadata.json` to indicate data freshness

### Implementation Pattern

```javascript
async function getMetric(metricName, userId) {
  // Try API first (if available)
  if (API_AVAILABLE && isRecentMetric(metricName)) {
    try {
      const data = await fetchFromAPI(metricName, userId);
      return data;
    } catch (error) {
      console.warn('API unavailable, falling back to JSON');
    }
  }
  
  // Fallback to JSON
  const profile = await fetchFromJSON(userId);
  return profile[metricName]; // May be snapshot from daily export
}
```

---

## API Endpoints (When Implemented)

### User Endpoints

```
GET /api/v1/users/{user_id}/recent-activity
  Returns: {
    notes_created_last_30_days: number,
    notes_resolved_last_30_days: number,
    days_since_last_action: number,
    active_notes_count: number,
    countries_open_notes_current_month: array,
    countries_solving_notes_current_month: array,
    countries_open_notes_current_day: array,
    countries_solving_notes_current_day: array
  }
```

### Country Endpoints

```
GET /api/v1/countries/{country_id}/current-stats
  Returns: {
    currently_open_count: number,
    currently_closed_count: number,
    notes_created_last_30_days: number,
    notes_resolved_last_30_days: number,
    notes_backlog_size: number,
    active_notes_count: number,
    notes_health_score: number,  // Real-time calculation
    new_vs_resolved_ratio: number  // Real-time calculation
  }
```

### Global Endpoints

```
GET /api/v1/global/current-stats
  Returns: {
    currently_open_count: number,
    currently_closed_count: number,
    notes_created_last_30_days: number,
    notes_resolved_last_30_days: number,
    notes_backlog_size: number,
    active_users_count: number,
    notes_age_distribution: object
  }
```

### Search Endpoints

```
GET /api/v1/users?country={id}&min_notes={count}&sort={field}&limit={count}
GET /api/v1/countries?health_score_min={score}&sort={field}&limit={count}
GET /api/v1/users/rankings?metric={field}&limit={count}
GET /api/v1/countries/rankings?metric={field}&limit={count}
```

---

## Summary of Metrics by Category

| Category | API Metrics | Status |
|----------|-------------|--------|
| **User - Recent Activity** | 4 metrics | ⚠️ Pending API |
| **User - Current Period** | 4 metrics | ⚠️ Pending API |
| **User - Current Status** | 2 metrics | ⚠️ Pending API |
| **Country - Recent Activity** | 2 metrics | ⚠️ Pending API |
| **Country - Current Status** | 6 metrics | ⚠️ Pending API |
| **Global - Current Stats** | 7 metrics | ⚠️ Pending API |
| **Dynamic Queries** | Multiple endpoints | ⚠️ Pending API |

**Total**: ~25+ metrics that require REST API

---

## References

- **[AUTHENTICATION_STRATEGY.md](AUTHENTICATION_STRATEGY.md)**: Hybrid authentication strategy (public historical data, recent data with User-Agent)
- **[API.md](API.md)**: Complete endpoint documentation and data structure
- **[API Proposal](https://github.com/OSM-Notes/OSM-Notes-Analytics/blob/main/docs/API_Proposal.md)**: API design and endpoints (when implemented)
- **[Metric Definitions](https://github.com/OSM-Notes/OSM-Notes-Analytics/blob/main/docs/Metric_Definitions.md)**: Business definitions for all metrics

---

## Authentication Notes

### Why User-Agent is Required

The REST API requires a valid User-Agent for:

1. **Access control**: Prevent abuse and malicious use
2. **Rate limiting**: Limit usage by IP + User-Agent
3. **Usage analysis**: Understand which applications use the platform and how
4. **Tracking**: Identify applications for analysis and improvements
5. **Continuous improvement**: Data to make informed decisions

### What About Historical Data?

Historical data remains **completely public** and accessible without authentication via static JSON files:

- `/data/metadata.json`
- `/data/indexes/users.json`
- `/data/indexes/countries.json`
- `/data/users/{user_id}.json` (complete historical data)
- `/data/countries/{country_id}.json` (complete historical data)

Only **recent real-time data** (last 30 days, current statistics) requires a valid User-Agent.

### When is OAuth Required?

OAuth with OSM is **optional** and only required for specific functionalities that need to identify specific OSM users, such as:
- User's personal profile (`/api/v1/users/me/*`)
- User's personal activity
- Premium features specific to users

For more information, see [AUTHENTICATION_STRATEGY.md](AUTHENTICATION_STRATEGY.md).

---

**Last Updated**: 2025-01-27  
**Maintained By**: OSM-Notes-Viewer Team

