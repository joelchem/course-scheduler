from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import logging

from routers import traveltime, courses, professors, schedules

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all domains
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

app.include_router(traveltime.router)
app.include_router(courses.router)
app.include_router(professors.router)
app.include_router(schedules.router)


logging.basicConfig(level=logging.INFO)

@app.get("/")
async def root():
    return {"Title": "ScheduleTerp Backend", "Description": "This is the ScheduleTerp Backend!"}