from pathlib import Path

from trends_worker.contracts import Requested, Result


def test_request_when_java_wire_contract_is_received() -> None:
    payload = (
        Path(__file__).parents[2] / "contracts" / "trends-requested-v1.json"
    ).read_bytes()
    request = Requested.model_validate_json(payload)
    restored = Requested.model_validate_json(request.model_dump_json(by_alias=True))
    assert restored == request
    assert request.deadline > request.requested_at


def test_result_when_python_wire_contract_is_serialized() -> None:
    payload = (
        Path(__file__).parents[2] / "contracts" / "trends-result-v1.json"
    ).read_bytes()
    result = Result.model_validate_json(payload)
    restored = Result.model_validate_json(result.model_dump_json(by_alias=True))
    assert restored == result
    assert result.points[0].value == 84
