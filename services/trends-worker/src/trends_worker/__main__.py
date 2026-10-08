"""Run with `PYTHONPATH=src uv run python -m trends_worker` in the worker directory."""

import os
from collections.abc import Iterator
from datetime import UTC, datetime
from typing import ClassVar, Protocol

import pika
from pika.spec import Basic
from pydantic import ValidationError

from trends_worker.contracts import Contract, Requested, Result
from trends_worker.processing import collect, lifecycle


class DeliveryReceipt(Contract):
    """Parse the delivery tag omitted by third-party AMQP type stubs."""

    delivery_tag: int


class UnsupportedProviderError(RuntimeError):
    """Prevent fixture data from being mistaken for a live provider."""

    message: ClassVar[str] = "Only the explicit fixture provider is implemented"


class ConsumerChannel(Protocol):
    """AMQP operations required by request processing and acknowledgement."""

    def consume(
        self, queue: str, *, auto_ack: bool = False
    ) -> Iterator[
        tuple[Basic.Deliver | None, pika.BasicProperties | None, bytes | None]
    ]:
        """Yield requests with their broker delivery receipt."""
        ...

    def basic_publish(
        self,
        exchange: str,
        routing_key: str,
        body: str | bytes,
        *,
        properties: pika.BasicProperties | None = None,
        mandatory: bool = False,
    ) -> None:
        """Publish using the connection's enabled publisher confirms."""
        ...

    def basic_ack(self, delivery_tag: int = 0, *, multiple: bool = False) -> None:
        """Acknowledge successfully handled requests."""
        ...

    def basic_reject(self, delivery_tag: int = 0, *, requeue: bool = True) -> None:
        """Reject malformed requests into the configured DLQ."""
        ...


def publish(channel: ConsumerChannel, event: Result) -> None:
    """Return only after broker confirmation, or let process failure requeue input."""
    channel.basic_publish(
        exchange="",
        routing_key="trends.results.v1",
        body=event.model_dump_json(by_alias=True).encode(),
        mandatory=True,
        properties=pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,
            message_id=str(event.event_id),
            correlation_id=str(event.correlation_id),
        ),
    )


def consume(channel: ConsumerChannel) -> None:
    """Reject malformed messages; acknowledge requests only after result confirms."""
    for method, _properties, body in channel.consume(
        "trends.requests.v1",
        auto_ack=False,
    ):
        if method is None or body is None:
            continue
        receipt = DeliveryReceipt.model_validate(method, from_attributes=True)
        try:
            request = Requested.model_validate_json(body)
        except ValidationError:
            channel.basic_reject(receipt.delivery_tag, requeue=False)
            continue
        publish(channel, lifecycle(request, "STARTED"))
        publish(channel, collect(request, datetime.now(UTC)))
        channel.basic_ack(receipt.delivery_tag)


def main() -> None:
    """Fail closed unless fixture mode is explicitly configured."""
    if os.environ.get("TRENDS_PROVIDER") != "fixture":
        raise UnsupportedProviderError(UnsupportedProviderError.message)
    parameters = pika.URLParameters(os.environ["RABBITMQ_URL"])
    parameters.heartbeat = 60
    parameters.blocked_connection_timeout = 30
    parameters.connection_attempts = 3
    parameters.retry_delay = 2
    with pika.BlockingConnection(parameters) as connection:
        channel = connection.channel()
        with channel:
            for queue in ("trends.requests.dlq", "trends.results.dlq"):
                _ = channel.queue_declare(queue, durable=True)
            for queue, dead_letter in (
                ("trends.requests.v1", "trends.requests.dlq"),
                ("trends.results.v1", "trends.results.dlq"),
            ):
                _ = channel.queue_declare(
                    queue,
                    durable=True,
                    arguments={
                        "x-dead-letter-exchange": "",
                        "x-dead-letter-routing-key": dead_letter,
                    },
                )
            channel.confirm_delivery()
            channel.basic_qos(prefetch_count=1)
            consume(channel)


if __name__ == "__main__":
    main()
