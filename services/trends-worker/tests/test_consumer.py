from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import ClassVar

import pika
import pytest
from pika.spec import Basic

from trends_worker.__main__ import UnsupportedProviderError, consume, main
from trends_worker.contracts import Contract, Result


class ConfirmFailureError(RuntimeError):
    message: ClassVar[str] = "Publisher confirmation failed"


class PublicationMetadata(Contract):
    delivery_mode: int
    content_type: str


@dataclass(slots=True)
class RecordingChannel:
    """Mutable fake records ACK ordering; it is not a real broker test."""

    payload: bytes
    fail_on_publish: int = 0
    calls: list[str] = field(default_factory=list)
    publish_count: int = 0

    def consume(
        self, queue: str, *, auto_ack: bool = False
    ) -> Iterator[
        tuple[Basic.Deliver | None, pika.BasicProperties | None, bytes | None]
    ]:
        assert queue == "trends.requests.v1"
        assert not auto_ack
        yield Basic.Deliver(delivery_tag=1), pika.BasicProperties(), self.payload

    def basic_publish(
        self,
        exchange: str,
        routing_key: str,
        body: str | bytes,
        *,
        properties: pika.BasicProperties | None = None,
        mandatory: bool = False,
    ) -> None:
        assert exchange == ""
        assert routing_key == "trends.results.v1"
        assert mandatory
        assert properties is not None
        metadata = PublicationMetadata.model_validate(properties, from_attributes=True)
        assert metadata.delivery_mode == 2
        assert metadata.content_type == "application/json"
        self.publish_count += 1
        if self.publish_count == self.fail_on_publish:
            raise ConfirmFailureError(ConfirmFailureError.message)
        self.calls.append(Result.model_validate_json(body).kind)

    def basic_ack(self, delivery_tag: int = 0, *, multiple: bool = False) -> None:
        assert delivery_tag == 1
        assert not multiple
        self.calls.append("ACK")

    def basic_reject(self, delivery_tag: int = 0, *, requeue: bool = True) -> None:
        assert delivery_tag == 1
        self.calls.append("REQUEUE" if requeue else "REJECT")


@pytest.fixture
def request_payload() -> bytes:
    return (
        Path(__file__).parents[2] / "contracts" / "trends-requested-v1.json"
    ).read_bytes()


def test_ack_after_results_when_publication_is_confirmed(
    request_payload: bytes,
) -> None:
    channel = RecordingChannel(request_payload)
    consume(channel)
    assert channel.calls[0] == "STARTED"
    assert channel.calls[-1] == "ACK"
    assert channel.calls[1] in {"SUCCEEDED", "FAILED"}


@pytest.mark.parametrize("failed_publish", [1, 2])
def test_no_ack_when_result_confirmation_fails(
    request_payload: bytes, failed_publish: int
) -> None:
    channel = RecordingChannel(request_payload, fail_on_publish=failed_publish)
    with pytest.raises(ConfirmFailureError):
        consume(channel)
    assert "ACK" not in channel.calls


def test_reject_without_requeue_when_message_is_malformed() -> None:
    channel = RecordingChannel(b'{"schemaVersion":99}')
    consume(channel)
    assert channel.calls == ["REJECT"]


def test_no_connection_when_fixture_provider_is_not_explicit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TRENDS_PROVIDER", "google")
    monkeypatch.delenv("RABBITMQ_URL", raising=False)
    with pytest.raises(UnsupportedProviderError):
        main()
