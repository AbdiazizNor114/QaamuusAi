import json
from pathlib import Path
import pytest
from validator import validate

@pytest.fixture
def release_file(tmp_path):
    record = {
        "id": "00000000-0000-4000-8000-000000000001",
        "category": "vocabulary", "term": "Synthetic term", "translation": "Synthetic meaning",
        "notes": "Automated test fixture only", "source": "Authored test fixture",
        "license": "CC0-1.0", "dialect": "Unspecified", "contributor": "Synthetic author",
        "reviewer": "Independent synthetic reviewer", "status": "published", "version": 1,
        "demonstration": False, "created_at": "2026-10-12T09:00:00Z", "updated_at": "2026-10-12T09:00:00Z",
    }
    path = tmp_path / "fixture.jsonl"
    path.write_text(json.dumps(record) + "\n", encoding="utf-8")
    return path


def test_valid_release(release_file):
    records, errors = validate(release_file, True)
    assert not errors
    assert len(records) == 1


@pytest.mark.parametrize("change", [
    {"translation": ""}, {"source": " "}, {"license": "unknown"},
    {"status": "invalid"}, {"version": "1"}, {"id": "no-uuid"},
    {"reviewer": ""}, {"created_at": "2026-10-12"},
])
def test_invalid_records(tmp_path, change, release_file):
    record = json.loads(release_file.read_text().splitlines()[0])
    path = tmp_path / "invalid.jsonl"
    path.write_text(json.dumps({**record, **change}), encoding="utf-8")
    assert validate(path)[1]


def test_duplicate_and_parse_errors(tmp_path, release_file):
    line = release_file.read_text().splitlines()[0]
    path = tmp_path / "duplicate.jsonl"
    path.write_text(line + "\n" + line + "\n{invalid}\n", encoding="utf-8")
    assert len(validate(path)[1]) == 2


def test_invalid_utf8(tmp_path):
    path = tmp_path / "bad.jsonl"
    path.write_bytes(b"\xff")
    assert validate(path)[1]


@pytest.mark.parametrize("change", [{"status": "approved"}, {"license": "Permission pending"}, {"reviewer": None}])
def test_export_gate(tmp_path, change, release_file):
    record = json.loads(release_file.read_text().splitlines()[0])
    path = tmp_path / "private.jsonl"
    path.write_text(json.dumps({**record, **change}), encoding="utf-8")
    assert validate(path, True)[1]
