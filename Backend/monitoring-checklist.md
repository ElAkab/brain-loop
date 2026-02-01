# Backend Monitoring Checklist

**Purpose:** Track critical metrics to ensure backend health, cost control, and user satisfaction  
**Owner:** DevOps/Backend Team  
**Frequency:** Daily (automated), Weekly (manual review)

---

## 🚨 Critical Alerts (Immediate Action Required)

### Cost Alerts
- [ ] OpenRouter API costs > $50/month
- [ ] OpenRouter API costs > $100/month  
- [ ] OpenRouter API costs > $200/month
- [ ] Vercel serverless costs > $20/month
- [ ] Supabase storage > 500MB (FREE tier limit approaching)

**Action:** Investigate usage patterns, consider cheaper models, implement rate limiting

---

### Performance Alerts
- [ ] API response time > 5 seconds (p95)
- [ ] Database query time > 500ms (p95)
- [ ] RLS policy causing > 15% overhead
- [ ] OpenRouter API timeout rate > 5%

**Action:** Check query plans, optimize indexes, add caching

---

### Security Alerts
- [ ] Failed RLS policy check (user accessing others' data)
- [ ] Abnormal hint usage pattern (> 10 hints in 1 hour)
- [ ] Service role key exposed in client code (critical!)
- [ ] Supabase Auth errors > 10% of attempts

**Action:** Review logs, revoke compromised keys, investigate abuse

---

## 📊 Weekly Metrics Review

### Usage Analytics (from `usage_logs` table)

```sql
-- Total API calls this week
SELECT COUNT(*) as total_calls, 
       SUM(tokens_input + tokens_output) as total_tokens,
       AVG(tokens_input + tokens_output) as avg_tokens_per_call
FROM usage_logs
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Targets:**
- [ ] Total calls < 100K/week (cost control)
- [ ] Average tokens/call < 1000 (efficiency)
- [ ] Quiz:Hint:Chat ratio ≈ 10:1:5 (expected pattern)

---

### Quota Compliance

```sql
-- Users hitting hint limit
SELECT COUNT(*) as users_at_limit
FROM profiles
WHERE subscription_tier = 'FREE' AND hint_credits >= 3;

-- Percentage of users hitting limit
SELECT 
  (COUNT(*) FILTER (WHERE hint_credits >= 3) * 100.0 / COUNT(*)) as pct_at_limit
FROM profiles
WHERE subscription_tier = 'FREE';
```

**Targets:**
- [ ] < 30% of users hitting hint limit (too restrictive if higher)
- [ ] > 5% of users hitting hint limit (too generous if lower)

**Action:** Adjust hint limit (2/week or 5/week) if targets not met

---

### Hint Reset Verification

```sql
-- Check cron job ran successfully
SELECT COUNT(*) as users_reset_this_week
FROM profiles
WHERE hint_credits_reset_at > NOW() - INTERVAL '7 days' 
  AND hint_credits = 0;
```

**Target:**
- [ ] At least one user reset per day (indicates cron is running)

**Action:** If 0, check cron logs and trigger manual reset

---

### Conversion Rate (PRO Signups)

```sql
-- Count PRO users
SELECT COUNT(*) as pro_users
FROM profiles
WHERE subscription_tier = 'PRO';

-- Conversion rate
SELECT 
  (COUNT(*) FILTER (WHERE subscription_tier = 'PRO') * 100.0 / COUNT(*)) as conversion_rate
FROM profiles;
```

**Targets:**
- [ ] Conversion rate > 2% (industry minimum)
- [ ] Conversion rate > 5% (sustainable)
- [ ] Conversion rate > 10% (excellent)

**Action:** If < 2%, review PRO features and pricing

---

## 🔍 Database Health Checks

### Index Usage

```sql
-- Unused indexes (candidates for removal)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND idx_scan = 0;
```

**Action:** If index unused for 30+ days, consider removing

---

### Table Bloat

```sql
-- Estimate table size
SELECT 
  schemaname, 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Targets:**
- [ ] `notes` table < 1GB (at 10K users)
- [ ] `usage_logs` table < 500MB (at 10K users)

**Action:** If exceeding, consider archiving old data

---

### RLS Policy Performance

```sql
-- Slow queries (> 1 second)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Action:** Optimize queries or add indexes

---

## 🛡️ Security Audit

### Weekly Checks
- [ ] Review Supabase Auth logs for failed attempts
- [ ] Check for API keys in client-side code (GitHub search)
- [ ] Verify RLS policies still active on all tables
- [ ] Review service role key usage (should be backend-only)

### Monthly Checks
- [ ] Rotate service role key (best practice)
- [ ] Review user permissions (ensure least privilege)
- [ ] Audit database backups (Supabase automatic)
- [ ] Test disaster recovery (restore from backup)

---

## 📈 Growth Tracking

### User Metrics

```sql
-- New users this week
SELECT COUNT(*) as new_users
FROM profiles
WHERE created_at > NOW() - INTERVAL '7 days';

-- Active users (made API call this week)
SELECT COUNT(DISTINCT user_id) as active_users
FROM usage_logs
WHERE created_at > NOW() - INTERVAL '7 days';

-- Retention rate (active last week AND this week)
WITH last_week AS (
  SELECT DISTINCT user_id FROM usage_logs
  WHERE created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
),
this_week AS (
  SELECT DISTINCT user_id FROM usage_logs
  WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT 
  (SELECT COUNT(*) FROM this_week WHERE user_id IN (SELECT user_id FROM last_week)) * 100.0 /
  (SELECT COUNT(*) FROM last_week) as retention_rate;
```

**Targets:**
- [ ] Weekly new users growing (month-over-month)
- [ ] Active users > 30% of total users
- [ ] Retention rate > 40% (week-over-week)

---

## ⚙️ Automated Monitoring Setup

### Recommended Tools

1. **Vercel Analytics** (built-in)
   - API response times
   - Error rates
   - Regional latency

2. **Supabase Dashboard** (built-in)
   - Database performance
   - Auth metrics
   - Storage usage

3. **OpenRouter Dashboard** (built-in)
   - API costs
   - Token usage
   - Model usage breakdown

4. **Optional: Sentry** (error tracking)
   ```bash
   pnpm add @sentry/nextjs
   ```

5. **Optional: Mixpanel/PostHog** (user analytics)
   - Conversion funnels
   - User journeys
   - A/B testing

---

## 🔔 Alert Configuration

### Vercel (vercel.json)
```json
{
  "crons": [{
    "path": "/api/cron/weekly-report",
    "schedule": "0 9 * * 1"
  }]
}
```

### Supabase Edge Function
```typescript
// Check database health daily
Deno.cron("health-check", "0 0 * * *", async () => {
  const { data } = await supabase.from('profiles').select('count');
  if (data.count > 50000) {
    await sendAlert('Database approaching capacity');
  }
});
```

---

## ✅ Monthly Review Checklist

- [ ] Review all metrics above
- [ ] Update cost projections
- [ ] Adjust quotas if needed (hint limits)
- [ ] Archive old usage_logs (> 90 days)
- [ ] Review and update this checklist

---

**Last Updated:** 2026-02-01  
**Next Review:** 2026-02-08  
**Owner:** Winston (Architect)
