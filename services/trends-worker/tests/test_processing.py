from datetime import UTC, date, datetime, timedelta
from uuid import UUID

import pytest
from pydantic import ValidationError

from trends_worker.contracts import Query, Requested
from trends_worker.processing import collect, lifecycle


@pytest.fixture
def job_request() -> Requested:
    return Requested(
        schema_version=1,
        event_id=UUID("00000000-0000-4000-8000-000000000001"),
        job_id=UUID("00000000-0000-4000-8000-000000000002"),
        correlation_id=UUID("00000000-0000-4000-8000-000000000003"),
        generation=1,
        attempt=1,
        requested_at=datetime(2026, 10, 8, tzinfo=UTC),
        deadline=datetime(2026, 10, 8, 0, 5, tzinfo=UTC),
        completed_week=date(2026, 9, 28),
        query=Query(keyword="coffee", geo="", timeframe="today 5-y", gprop=""),
    )


def test_completed_series_when_fixture_is_requested(job_request: Requested) -> None:
    result = collect(job_request, job_request.requested_at)
    assert result.kind == "SUCCEEDED"
    assert result.provider == "fixture-v1"
    assert len(result.points) == 65
    assert result.points[-1].date == job_request.completed_week
    assert result.points[-1].value == 84
    assert all(point.date.weekday() == 0 for point in result.points)


def test_deadline_failure_when_request_has_expired(job_request: Requested) -> None:
    result = collect(job_request, job_request.deadline)
    assert result.kind == "FAILED"
    assert result.error_code == "DEADLINE_EXCEEDED"
    assert result.points == ()


@pytest.mark.parametrize(
    ("keyword", "code"),
    [("fixture:no-data", "NO_DATA"), ("fixture:failure", "PROVIDER_FAILED")],
)
def test_failure_when_provider_fixture_has_no_result(
    job_request: Requested,
    keyword: str,
    code: str,
) -> None:
    query = job_request.query.model_copy(update={"keyword": keyword})
    command = job_request.model_copy(update={"query": query})
    result = collect(command, job_request.requested_at)
    assert result.kind == "FAILED"
    assert result.error_code == code
    assert result.points == ()


def test_stable_event_id_when_request_is_redelivered(job_request: Requested) -> None:
    first = collect(job_request, job_request.requested_at)
    duplicate = collect(job_request, job_request.requested_at + timedelta(seconds=1))
    assert duplicate.event_id == first.event_id
    assert duplicate.points == first.points


def test_new_event_id_when_generation_is_refreshed(job_request: Requested) -> None:
    old = lifecycle(job_request, "SUCCEEDED")
    refreshed = job_request.model_copy(update={"generation": 2})
    new = lifecycle(refreshed, "SUCCEEDED")
    assert new.event_id != old.event_id


def test_invalid_message_when_schema_is_unsupported(job_request: Requested) -> None:
    payload = job_request.model_dump_json(by_alias=True).replace(
        '"schemaVersion":1', '"schemaVersion":99'
    )
    with pytest.raises(ValidationError):
        _ = Requested.model_validate_json(payload)
