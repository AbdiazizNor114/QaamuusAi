"""Validate UTF-8 JSONL language datasets without dropping invalid records."""
import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator


class Entry(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    id: str
    category: Literal["vocabulary", "translation", "grammar"]
    term: str
    translation: str
    notes: str = ""
    source: str
    license: Literal["CC0-1.0", "CC-BY-4.0", "Permission pending"]
    dialect: str
    contributor: str
    reviewer: str | None
    status: Literal["draft", "submitted", "under_review", "changes_requested", "approved", "published", "rejected", "disputed", "superseded"]
    version: int = Field(gt=0)
    demonstration: bool
    created_at: str
    updated_at: str

    @field_validator("id")
    @classmethod
    def valid_uuid(cls, value: str) -> str:
        UUID(value)
        return value

    @field_validator("term", "translation", "source", "dialect", "contributor", "license")
    @classmethod
    def nonempty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be empty")
        return value

    @field_validator("reviewer")
    @classmethod
    def nonempty_reviewer(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("reviewer must not be empty")
        return value

    @field_validator("created_at", "updated_at")
    @classmethod
    def timestamp(cls, value: str) -> str:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            raise ValueError("timezone required")
        return value


def validate(path: Path, published_only: bool = False) -> tuple[list[Entry], list[str]]:
    records: list[Entry] = []
    errors: list[str] = []
    seen: set[str] = set()
    try:
        content = path.read_text(encoding="utf-8", errors="strict")
    except (OSError, UnicodeError) as error:
        return [], [str(error)]
    for number, line in enumerate(content.splitlines(), 1):
        if not line.strip():
            errors.append(f"line {number}: empty JSONL record")
            continue
        try:
            record = Entry.model_validate(json.loads(line))
            canonical_id = str(UUID(record.id))
            if canonical_id in seen:
                raise ValueError("duplicate ID")
            seen.add(canonical_id)
            if published_only and (record.status != "published" or record.reviewer is None or record.license == "Permission pending"):
                raise ValueError("public release requires publication, reviewer and redistribution permission")
            records.append(record)
        except (ValueError, ValidationError) as error:
            errors.append(f"line {number}: {error}")
    if not content:
        errors.append("dataset is empty")
    return records, errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    parser.add_argument("--published-only", action="store_true")
    args = parser.parse_args()
    records, errors = validate(args.path, args.published_only)
    for error in errors:
        print(error)
    print(f"{len(records)} valid records; {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
