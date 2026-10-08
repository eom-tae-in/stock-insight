"""Deterministic fixture processing; never represents live Google data."""

from datetime import datetime, timedelta
from typing import Literal
from uuid import NAMESPACE_URL, uuid5

from trends_worker.contracts import Point, Requested, Result


def lifecycle(
    request: Requested,
    kind: Literal["STARTED", "SUCCEEDED", "FAILED"],
) -> Result:
    """Stable event IDs make re-delivery safe for the database inbox."""
    return Result(
        event_id=uuid5(
            NAMESPACE_URL,
            f"stock-insight/{request.job_id}/{request.generation}/{kind}",
        ),
        job_id=request.job_id,
        correlation_id=request.correlation_id,
        generation=request.generation,
        attempt=request.attempt,
        kind=kind,
    )


def collect(request: Requested, now: datetime) -> Result:
    """Produce only fixture data within the job's explicit deadline."""
    if now >= request.deadline:
        return lifecycle(request, "FAILED").model_copy(
            update={"error_code": "DEADLINE_EXCEEDED"},
        )
    failure_codes: dict[str, Literal["NO_DATA", "PROVIDER_FAILED"]] = {
        "fixture:no-data": "NO_DATA",
        "fixture:failure": "PROVIDER_FAILED",
    }
    error_code = failure_codes.get(request.query.keyword)
    if error_code is not None:
        return lifecycle(request, "FAILED").model_copy(
            update={"error_code": error_code}
        )
    points = tuple(
        Point(
            date=request.completed_week - timedelta(weeks=64 - index), value=20 + index
        )
        for index in range(65)
    )
    return lifecycle(request, "SUCCEEDED").model_copy(update={"points": points})
