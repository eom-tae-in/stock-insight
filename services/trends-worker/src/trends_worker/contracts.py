"""Language-independent job message boundaries."""

from datetime import date
from typing import Annotated, ClassVar, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Contract(BaseModel):
    """Immutable, strict message boundary with no unknown fields."""

    model_config: ClassVar[ConfigDict] = ConfigDict(
        frozen=True,
        extra="forbid",
        strict=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )


class Query(Contract):
    """The first version supports completed weekly five-year requests."""

    keyword: Annotated[str, Field(min_length=1, max_length=100)]
    geo: Annotated[str, Field(pattern=r"^(?:[A-Z]{2})?$")]
    timeframe: Literal["today 5-y"]
    gprop: Literal["", "youtube", "images", "news", "froogle"]


class Point(Contract):
    """A completed Monday week and its source interest index."""

    date: date
    value: Annotated[int, Field(ge=0, le=100)]


class Requested(Contract):
    """Request event carries no token, credential or owner identifier."""

    schema_version: Literal[1]
    event_id: UUID
    job_id: UUID
    correlation_id: UUID
    generation: Annotated[int, Field(ge=1)]
    attempt: Annotated[int, Field(ge=1, le=2)]
    requested_at: AwareDatetime
    deadline: AwareDatetime
    completed_week: date
    query: Query


class Result(Contract):
    """Worker lifecycle event consumed transactionally by analysis-service."""

    schema_version: Literal[1] = 1
    event_id: UUID
    job_id: UUID
    correlation_id: UUID
    generation: Annotated[int, Field(ge=1)]
    attempt: Annotated[int, Field(ge=1, le=2)]
    kind: Literal["STARTED", "SUCCEEDED", "FAILED"]
    provider: Literal["fixture-v1"] = "fixture-v1"
    points: Annotated[tuple[Point, ...], Field(max_length=300)] = ()
    error_code: Literal["", "NO_DATA", "DEADLINE_EXCEEDED", "PROVIDER_FAILED"] = ""
