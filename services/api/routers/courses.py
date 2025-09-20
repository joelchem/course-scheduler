from fastapi import APIRouter

import re
import orjson

import db

RESULT_LIMIT = 20

router = APIRouter()

@router.get("/latest-semester")
async def latest_semester():
    cache_key = "latest-semester"
    cached = db.cache.get(cache_key)
    if cached:
        return orjson.loads(cached)
    
    collection = db.mongo["Metadata"]["all-semesters"]
    all_semesters = collection.find()

    latest = 202508
    for semester in all_semesters:
        if semester["active"]:
            latest = max(int(semester["_id"]), latest)
    
    latest = {"latest": str(latest)}
    db.cache.setex(cache_key, 24*60*60, orjson.dumps(latest))

    return latest


@router.get("/search/{semester}")
async def search(semester: int, query: str, offset: int = 0): 

    if query.strip() == "":
        return {"size": 0, "courses": []}
    
    cache_key = f"{semester}:{offset}:{query}"
    cached = db.cache.get(cache_key)
    if cached:
        return orjson.loads(cached)

    if not await db.verify_semester(semester):
        return {"error": "invalid semester"}

    collection = db.mongo["CourseNotifierCluster"][f"courses-{semester}"]

    res=None
    if re.search(r'^([A-Z]{4}\d{3}[A-Z]?|[A-Z]{1,4}|[A-Z]{4}\d{1,3})$', query.strip().upper()):

        pipeline = [
            {
                "$match": {
                    "$or": [
                        {"_id": {"$regex": f"^{re.escape(query.strip().upper())}"}},
                        {"name": {"$regex": re.escape(query.strip()), "$options": "i"}}
                    ]
                }
            },
            {
                "$addFields": {
                    "sortKey": {
                        "$cond": {
                            "if": {
                                "$regexMatch": {
                                    "input": "$_id",
                                    "regex": f"^{re.escape(query.strip().upper())}"
                                }
                            },
                            "then": 0,
                            "else": 1
                        }
                    }
                }
            },
            {
                "$sort": {"sortKey": 1, "_id": 1}
            },
            {"$skip": offset},
            {"$limit": RESULT_LIMIT}
        ]

        res = list(collection.aggregate(pipeline))
    else:
        res = list(
            collection.find({"name": {"$regex": re.escape(query.strip()), "$options": "i"}})
            .skip(offset)
            .limit(RESULT_LIMIT)
        )

    await hydrate_courses(res, semester)

    out = {"size": len(res), "courses": res}

    db.cache.setex(cache_key, 5*60, orjson.dumps(out))
    return out

    
async def hydrate_courses(courses, semester):
    
    collection = db.mongo["CourseNotifierCluster"][f"sections-{semester}"]

    ids = [course["_id"] for course in courses]
    res = collection.find({"_id": {"$in": ids}})

    sections_map = {sections["_id"]:sections["sections"] for sections in res}
    
    for course in courses:
        course["sections"] = [] if course["_id"] not in sections_map else sections_map[course["_id"]]
