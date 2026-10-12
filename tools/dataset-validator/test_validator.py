import json
from pathlib import Path
import pytest
from validator import validate

DEMO = Path(__file__).resolve().parents[2] / "datasets" / "demo" / "v0.1.jsonl"


def test_demo_release():
    records, errors = validate(DEMO, True)
    assert not errors
    assert len(records) == 4
    assert all(record.demonstration for record in records)


@pytest.mark.parametrize("change", [
    {"translation": ""}, {"source": " "}, {"license": "unknown"},
    {"status": "invalid"}, {"version": "1"}, {"id": "no-uuid"},
    {"reviewer": ""}, {"created_at": "2026-10-12"},
])
def test_invalid_records(tmp_path, change):
    record = json.loads(DEMO.read_text().splitlines()[0])
    path = tmp_path / "invalid.jsonl"
    path.write_text(json.dumps({**record, **change}), encoding="utf-8")
    assert validate(path)[1]


def test_duplicate_and_parse_errors(tmp_path):
    line = DEMO.read_text().splitlines()[0]
    path = tmp_path / "duplicate.jsonl"
    path.write_text(line + "\n" + line + "\n{invalid}\n", encoding="utf-8")
    assert len(validate(path)[1]) == 2


def test_invalid_utf8(tmp_path):
    path = tmp_path / "bad.jsonl"
    path.write_bytes(b"\xff")
    assert validate(path)[1]


@pytest.mark.parametrize("change", [{"status": "approved"}, {"license": "Permission pending"}, {"reviewer": None}])
def test_export_gate(tmp_path, change):
    record = json.loads(DEMO.read_text().splitlines()[0])
    path = tmp_path / "private.jsonl"
    path.write_text(json.dumps({**record, **change}), encoding="utf-8")
    assert validate(path, True)[1]
