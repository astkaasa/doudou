#!/usr/bin/env python3
"""Refresh the committed city population snapshot from official source files.

The parser uses only Python's standard library. It reads the GHS-WUP XLSX as an
Open Packaging Convention ZIP, so contributors do not need pandas or openpyxl.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree as ET


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE_FILE = PROJECT_ROOT / "data-sources" / "city-population-wup-2025.json"
TARGET_YEARS = {1960, 1975, 1980, 1995, 2000, 2020}
MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CELL_REF_RE = re.compile(r"([A-Z]+)")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Local official .zip or .xlsx file")
    parser.add_argument("--offline", action="store_true", help="Do not call the World Bank API")
    parser.add_argument("--write", action="store_true", help="Write the refreshed source snapshot")
    return parser.parse_args()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url: str, output: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "doudou-city-data-sync/1"})
    with urllib.request.urlopen(request, timeout=120) as response, output.open("wb") as target:
        shutil.copyfileobj(response, target)


def resolve_workbook(source_path: Path, temp_dir: Path) -> Path:
    if source_path.suffix.lower() == ".xlsx":
        return source_path
    if source_path.suffix.lower() != ".zip":
        raise ValueError(f"Expected .zip or .xlsx input, got {source_path}")
    with zipfile.ZipFile(source_path) as archive:
        candidates = [name for name in archive.namelist() if name.lower().endswith(".xlsx")]
        if len(candidates) != 1:
            raise ValueError(f"Expected one XLSX in source ZIP, found {len(candidates)}")
        output = temp_dir / Path(candidates[0]).name
        with archive.open(candidates[0]) as source, output.open("wb") as target:
            shutil.copyfileobj(source, target)
        return output


def shared_strings(workbook: zipfile.ZipFile) -> list[str]:
    try:
        stream = workbook.open("xl/sharedStrings.xml")
    except KeyError:
        return []
    values: list[str] = []
    with stream:
        for event, element in ET.iterparse(stream, events=("end",)):
            if element.tag == f"{{{MAIN_NS}}}si":
                values.append("".join(node.text or "" for node in element.iter(f"{{{MAIN_NS}}}t")))
                element.clear()
    return values


def worksheet_path(workbook: zipfile.ZipFile, sheet_name: str) -> str:
    root = ET.fromstring(workbook.read("xl/workbook.xml"))
    relationship_id = None
    for sheet in root.iter(f"{{{MAIN_NS}}}sheet"):
        if sheet.attrib.get("name") == sheet_name:
            relationship_id = sheet.attrib.get(f"{{{REL_NS}}}id")
            break
    if not relationship_id:
        raise ValueError(f"Worksheet {sheet_name!r} was not found")
    rels = ET.fromstring(workbook.read("xl/_rels/workbook.xml.rels"))
    target = None
    for relationship in rels.iter(f"{{{PACKAGE_REL_NS}}}Relationship"):
        if relationship.attrib.get("Id") == relationship_id:
            target = relationship.attrib.get("Target")
            break
    if not target:
        raise ValueError(f"Relationship target for {sheet_name!r} was not found")
    if target.startswith("/"):
        return target.lstrip("/")
    return str(PurePosixPath("xl") / target)


def column_name(reference: str) -> str:
    match = CELL_REF_RE.match(reference or "")
    return match.group(1) if match else ""


def cell_value(cell: ET.Element, strings: list[str]):
    cell_type = cell.attrib.get("t")
    value_node = cell.find(f"{{{MAIN_NS}}}v")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t"))
    if value_node is None or value_node.text is None:
        return None
    raw = value_node.text
    if cell_type == "s":
        return strings[int(raw)]
    if cell_type in {"str", "b"}:
        return raw
    try:
        value = float(raw)
        return int(value) if value.is_integer() else value
    except ValueError:
        return raw


def iter_worksheet_rows(workbook: zipfile.ZipFile, path: str, strings: list[str]):
    with workbook.open(path) as stream:
        for _, row in ET.iterparse(stream, events=("end",)):
            if row.tag != f"{{{MAIN_NS}}}row":
                continue
            values = {
                column_name(cell.attrib.get("r", "")): cell_value(cell, strings)
                for cell in row.findall(f"{{{MAIN_NS}}}c")
            }
            row.clear()
            yield values


def normalize_source_id(value) -> str:
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return str(value)


def sync_wup(snapshot: dict, workbook_path: Path) -> tuple[int, set[str]]:
    records = snapshot["records"]
    wanted = {
        normalize_source_id(record["sourceId"]): city_id
        for city_id, record in records.items()
        if record.get("sourceKey", snapshot["defaultSourceKey"]) == "un-wup-2025"
    }
    observations: dict[str, dict[str, float]] = {city_id: {} for city_id in wanted.values()}
    found: set[str] = set()
    with zipfile.ZipFile(workbook_path) as workbook:
        strings = shared_strings(workbook)
        path = worksheet_path(workbook, "UC_STATS")
        rows = iter_worksheet_rows(workbook, path, strings)
        header = next(rows)
        columns = {str(value): column for column, value in header.items()}
        required = {"ID_UC_G0", "UCname", "UNLocName", "Year", "POP", "Lat", "Lon"}
        missing = required - columns.keys()
        if missing:
            raise ValueError(f"WUP worksheet is missing columns: {', '.join(sorted(missing))}")
        for row in rows:
            source_id = normalize_source_id(row.get(columns["ID_UC_G0"]))
            city_id = wanted.get(source_id)
            if not city_id:
                continue
            year = row.get(columns["Year"])
            if year not in TARGET_YEARS:
                continue
            population = row.get(columns["POP"])
            if not isinstance(population, (int, float)) or population <= 0:
                continue
            observations[city_id][str(year)] = round(population / 1_000_000, 6)
            found.add(city_id)
            if year == 2020:
                record = records[city_id]
                record["sourceName"] = row.get(columns["UCname"])
                record["country"] = row.get(columns["UNLocName"])
                record["sourceLat"] = row.get(columns["Lat"])
                record["sourceLon"] = row.get(columns["Lon"])
    missing_cities = set(wanted.values()) - found
    if missing_cities:
        raise ValueError(f"No WUP observations found for: {', '.join(sorted(missing_cities))}")
    for city_id, population in observations.items():
        records[city_id]["population"] = population
    return sum(len(values) for values in observations.values()), found


def sync_world_bank(snapshot: dict) -> int:
    url = snapshot["sources"]["world-bank-population-total"]["apiUrl"]
    query = f"{url}?date=1960:2020&format=json&per_page=200"
    request = urllib.request.Request(query, headers={"User-Agent": "doudou-city-data-sync/1"})
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.load(response)
    observations = {"GUM": {}, "MNP": {}}
    for row in payload[1]:
        year = int(row["date"])
        if year in TARGET_YEARS and row["value"] is not None:
            observations[row["countryiso3code"]][str(year)] = round(row["value"] / 1_000_000, 6)
    snapshot["records"]["guam"]["population"] = observations["GUM"]
    snapshot["records"]["saipan"]["population"] = observations["MNP"]
    snapshot["sources"]["world-bank-population-total"]["version"] = f"last updated {payload[0]['lastupdated']}"
    return sum(len(values) for values in observations.values())


def main() -> None:
    args = parse_args()
    snapshot = json.loads(SOURCE_FILE.read_text(encoding="utf-8"))
    with tempfile.TemporaryDirectory(prefix="doudou-city-data-") as temp_name:
        temp_dir = Path(temp_name)
        source_path = args.input
        downloaded = False
        if source_path is None:
            source_path = temp_dir / "wup-city-data.zip"
            download(snapshot["sources"]["un-wup-2025"]["dataUrl"], source_path)
            downloaded = True
        source_path = source_path.expanduser().resolve()
        workbook_path = resolve_workbook(source_path, temp_dir)
        wup_count, city_ids = sync_wup(snapshot, workbook_path)
        if source_path.suffix.lower() == ".zip":
            snapshot["sources"]["un-wup-2025"]["downloadSha256"] = sha256_file(source_path)
        world_bank_count = 0 if args.offline else sync_world_bank(snapshot)
        snapshot["generatedAt"] = dt.date.today().isoformat()

        print(f"WUP observations: {wup_count} across {len(city_ids)} cities")
        print(f"World Bank observations: {world_bank_count}{' (offline)' if args.offline else ''}")
        if downloaded:
            print(f"Downloaded SHA-256: {snapshot['sources']['un-wup-2025']['downloadSha256']}")
        if args.write:
            SOURCE_FILE.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"Wrote {SOURCE_FILE}")
        else:
            print("Dry run only; pass --write to update the snapshot")


if __name__ == "__main__":
    main()
