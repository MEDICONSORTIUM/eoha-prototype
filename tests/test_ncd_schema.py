"""Run with: python3 -m unittest discover -s tests -p 'test_ncd_schema.py'.
Requires jsonschema >= 4 with Draft 2020-12 support.
"""
import copy
from datetime import datetime
import re
import json
from pathlib import Path
import unittest

from jsonschema import Draft202012Validator, FormatChecker

# jsonschema's RFC3339 dependency is optional; keep these checks offline.
FORMATS = FormatChecker()

@FORMATS.checks('date-time', raises=ValueError)
def is_datetime(value):
    if not isinstance(value, str):
        return True
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})', value):
        return False
    datetime.fromisoformat(value.upper().replace('Z', '+00:00'))
    return True

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / 'schemas/ncd-risk-record.schema.json').read_text())
EXAMPLE = json.loads((ROOT / 'schemas/ncd-risk-record.example.json').read_text())


class NcdSchemaTests(unittest.TestCase):
    def setUp(self):
        self.validator = Draft202012Validator(SCHEMA, format_checker=FORMATS)
        self.record = copy.deepcopy(EXAMPLE)
        self.observation = self.record['components']['pollution']['observations'][0]

    def reject(self):
        self.assertTrue(list(self.validator.iter_errors(self.record)))

    def test_schema_and_example(self):
        Draft202012Validator.check_schema(SCHEMA)
        self.validator.validate(self.record)

    def test_disabled_scoring(self):
        for path, value in [('scoring_enabled', True), ('combined_ncd_score', 50)]:
            with self.subTest(path=path):
                record = copy.deepcopy(EXAMPLE)
                record[path] = value
                self.assertFalse(self.validator.is_valid(record))
        self.record['components']['pollution']['score'] = 82
        self.reject()

    def test_measurement_and_coverage_bounds(self):
        for key, value in [('value', -1), ('spatial_coverage', 1.01), ('temporal_coverage', -0.01)]:
            with self.subTest(key=key):
                self.observation[key] = value
                self.reject()
                self.observation[key] = EXAMPLE['components']['pollution']['observations'][0][key]
        self.observation.update(variable='relative_humidity_pct', value=101)
        self.reject()

    def test_eligible_requires_complete_unflagged_input(self):
        self.observation['eligible_for_reference'] = True
        self.reject()
        self.observation.update(spatial_coverage=1, temporal_coverage=1, quality_flags=[])
        self.validator.validate(self.record)
        self.observation['value'] = None
        self.reject()

    def test_forecast_requires_issue_time_and_lead(self):
        self.observation['source']['kind'] = 'forecast'
        self.reject()
        self.observation['source'].update(issue_time='2025-12-31T12:00:00Z', lead_hours=12)
        self.validator.validate(self.record)

    def test_population_provenance(self):
        self.observation['aggregation'] = 'population_weighted'
        self.reject()
        self.observation['population_reference'] = 'synthetic-population-v1'
        self.validator.validate(self.record)

    def test_date_format_and_unknown_fields(self):
        self.record['generated_at'] = 'yesterday'
        self.reject()
        self.record['generated_at'] = EXAMPLE['generated_at']
        self.record['disease_probability'] = 0.82
        self.reject()


if __name__ == '__main__':
    unittest.main()

