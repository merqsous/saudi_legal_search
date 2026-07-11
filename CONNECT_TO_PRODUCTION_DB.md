# Connect Local Code to Production Database

## Steps to Connect to Railway Production Database

### 1. Get Your DATABASE_URL from Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project: **saudi_legal_search**
3. Click on the **PostgreSQL** service
4. Go to **Connect** tab
5. Copy the **DATABASE_URL** (it looks like: `postgresql://postgres:xxxxx@xxxxx.railway.app:5432/railway`)

### 2. Add DATABASE_URL to Local Environment

Edit the file: `saudi_legal_scraper/.env`

Add this line (replace with your actual URL):
```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST.railway.app:5432/railway
```

### 3. Restart Your Local Backend

```bash
# Kill the current backend
kill -9 $(lsof -ti :8000)

# Start fresh with production database
cd /Users/moaztalal/code/saudi_legal_search
source venv/bin/activate
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### 4. Verify Connection

Test that you're connected to production:
```bash
source venv/bin/activate
python3 -c "
from api.db import query_one
result = query_one('SELECT COUNT(*) as count FROM judgments;')
print(f'Total judgments in database: {result[\"count\"]}')
"
```

You should see the production count (not your local database count).

### 5. Check for المحكمة العليا

```bash
source venv/bin/activate
python3 -c "
from api.db import query_all
levels = query_all('SELECT code, name_ar FROM court_levels ORDER BY name_ar;')
print('Court Levels:')
for l in levels:
    print(f'  {l[\"code\"]}: {l[\"name_ar\"]}')
"
```

## Important Notes

⚠️ **Warning**: When connected to production:
- Any database changes will affect the live system
- Be careful with UPDATE/DELETE queries
- Test queries with SELECT first

✅ **Benefits**:
- See real production data locally
- Test features with actual المحكمة العليا cases
- No need to sync databases

## Switch Back to Local Database

To use your local database again, simply comment out or remove the `DATABASE_URL` line from `.env`:

```bash
# DATABASE_URL=postgresql://...
```

Then restart the backend.
